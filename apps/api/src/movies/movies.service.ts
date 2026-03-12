
import { Injectable, NotFoundException, ForbiddenException, ConflictException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { ActorsService } from '../actors/actors.service';
import { MovieStatus, EncodeStatus, User, Prisma } from '@prisma/client';
import { S3Client, ListObjectsV2Command, DeleteObjectsCommand } from '@aws-sdk/client-s3';
import { CreateMovieDto } from './dto/create-movie.dto';
import { UpdateMovieDto } from './dto/update-movie.dto';
import { ListMoviesDto } from './dto/list-movies.dto';

interface PaginatedResult<T> {
    data: T[];
    total: number;
}



@Injectable()
export class MoviesService {
    private s3Client: S3Client;
    private bucket: string;

    constructor(
        private prisma: PrismaService,
        private configService: ConfigService,
        private actorsService: ActorsService,
    ) {
        this.bucket = this.configService.get<string>('S3_BUCKET') || 'netflat-media';
        this.s3Client = new S3Client({
            endpoint: this.configService.get<string>('S3_ENDPOINT') || 'http://localhost:9002',
            region: this.configService.get<string>('S3_REGION') || 'us-east-1',
            credentials: {
                accessKeyId: this.configService.get<string>('S3_ACCESS_KEY') || 'minioadmin',
                secretAccessKey: this.configService.get<string>('S3_SECRET_KEY') || 'minioadmin',
            },
            forcePathStyle: true,
        });
    }

    async create(dto: CreateMovieDto) {
        // 1. Check for duplicate title (case-insensitive)
        const existingToken = await this.prisma.movie.findFirst({
            where: {
                title: {
                    equals: dto.title,
                    mode: 'insensitive',
                },
            },
        });

        if (existingToken) {
            throw new ConflictException({
                code: 'MOVIE_TITLE_EXISTS',
                message: `Movie with title "${dto.title}" already exists`,
            });
        }

        // 2. Normalize actor names and sync to dictionary
        let actorNames: string[] = [];
        if (dto.actors && dto.actors.length > 0) {
            actorNames = await this.actorsService.syncNames(dto.actors);
        }

        // 3. Handle Genres
        let genreOperations: Prisma.MovieGenreCreateNestedManyWithoutMovieInput | undefined;
        if (dto.genreIds && dto.genreIds.length > 0) {
            genreOperations = {
                create: dto.genreIds.map((genreId) => ({
                    genre: { connect: { id: genreId } },
                })),
            };
        }

        return this.prisma.movie.create({
            data: {
                title: dto.title,
                description: dto.description,
                releaseYear: dto.releaseYear,
                durationSeconds: dto.durationSeconds,
                posterUrl: dto.posterUrl,
                backdropUrl: dto.backdropUrl,
                originalLanguage: dto.originalLanguage,
                trailerUrl: dto.trailerUrl,
                movieStatus: MovieStatus.draft,
                encodeStatus: EncodeStatus.pending,
                actors: actorNames,
                genres: genreOperations,
            },
            include: {
                genres: { include: { genre: true } },
            },
        });
    }

    async findAll(query: ListMoviesDto, user?: any) {
        const { page = 1, limit = 20, q: search } = query;
        const skip = (page - 1) * limit;
        const where: any = {};

        if (search) {
            // Search by title OR actor name
            where.OR = [
                { title: { contains: search, mode: 'insensitive' } },
                { actors: { has: search } },
                { actors: { hasSome: [search] } },
            ];
        }

        const [movies, total] = await Promise.all([
            this.prisma.movie.findMany({
                where,
                take: limit,
                skip,
                orderBy: { createdAt: 'desc' },
                include: {
                    genres: { include: { genre: true } },
                },
            }),
            this.prisma.movie.count({ where })
        ]);

        return { data: movies.map((m) => this.formatMovie(m)), total };
    }

    async findById(id: string, user?: any) {
        const movie = await this.prisma.movie.findUnique({
            where: { id },
            include: {
                genres: { include: { genre: true } },
            },
        });
        if (!movie) throw new NotFoundException('Movie not found');
        return this.formatMovie(movie);
    }

    async delete(id: string) {
        const movie = await this.prisma.movie.findUnique({ where: { id } });
        if (!movie) throw new NotFoundException('Movie not found');

        // Cleanup S3 files
        await this.cleanupMovieFiles(id);

        await this.prisma.movie.delete({ where: { id } });
        return { success: true };
    }

    // ... (existing findAll, findById, create)

    async update(id: string, dto: UpdateMovieDto) {
        const existing = await this.prisma.movie.findUnique({ where: { id } });
        if (!existing) {
            throw new NotFoundException({
                code: 'MOVIE_NOT_FOUND',
                message: 'Movie not found',
            });
        }

        // Handle genre updates
        if (dto.genreIds !== undefined) {
            await this.prisma.movieGenre.deleteMany({ where: { movieId: id } });
            if (dto.genreIds.length > 0) {
                await this.prisma.movieGenre.createMany({
                    data: dto.genreIds.map((genreId) => ({ movieId: id, genreId })),
                });
            }
        }

        // Normalize actor names
        let actorNames: string[] | undefined;
        if (dto.actors !== undefined) {
            actorNames = dto.actors.length > 0
                ? await this.actorsService.syncNames(dto.actors)
                : [];
        }

        const movie = await this.prisma.movie.update({
            where: { id },
            data: {
                title: dto.title,
                description: dto.description,
                releaseYear: dto.releaseYear,
                durationSeconds: dto.durationSeconds,
                ...(actorNames !== undefined && { actors: actorNames }),
            },
            include: {
                genres: { include: { genre: true } },
            },
        });

        return this.formatMovie(movie);
    }

    async publish(id: string, published: boolean) {
        const existing = await this.prisma.movie.findUnique({ where: { id } });
        if (!existing) {
            throw new NotFoundException({
                code: 'MOVIE_NOT_FOUND',
                message: 'Movie not found',
            });
        }

        const movie = await this.prisma.movie.update({
            where: { id },
            data: {
                movieStatus: published ? MovieStatus.published : MovieStatus.draft,
            },
            include: {
                genres: { include: { genre: true } },
            },
        });

        return this.formatMovie(movie);
    }

    async getStreamUrl(id: string, user: User) {
        const movie = await this.prisma.movie.findUnique({ where: { id } });
        if (!movie) {
            throw new NotFoundException({
                code: 'MOVIE_NOT_FOUND',
                message: 'Movie not found',
            });
        }

        // Only published + ready movies can be streamed
        if (movie.movieStatus !== MovieStatus.published || movie.encodeStatus !== EncodeStatus.ready) {
            throw new ForbiddenException({
                code: 'MOVIE_NOT_READY',
                message: 'Movie is not available for streaming',
            });
        }

        const s3PublicBaseUrl = this.configService.get<string>('S3_PUBLIC_BASE_URL')
            || 'http://localhost:9002/netflat-media';

        const playbackUrl = `${s3PublicBaseUrl}/hls/${id}/master.m3u8`;

        const qualityOptions = [
            { name: '480p', url: `${s3PublicBaseUrl}/hls/${id}/v0/prog_index.m3u8` },
            { name: '720p', url: `${s3PublicBaseUrl}/hls/${id}/v1/prog_index.m3u8` },
        ];

        return { playbackUrl, qualityOptions };
    }

    async getProgress(movieId: string, userId: string) {
        return {
            progressSeconds: 0,
            durationSeconds: 0,
            completed: false,
            updatedAt: null,
        };
    }

    private formatMovie(movie: {
        id: string;
        title: string;
        description: string | null;
        posterUrl: string | null;
        backdropUrl: string | null;
        durationSeconds: number | null;
        releaseYear: number | null;
        movieStatus: MovieStatus;
        encodeStatus: EncodeStatus;
        actors: string[];
        createdAt: Date;
        updatedAt: Date;
        // TMDb fields
        tmdbId?: number | null;
        voteAverage?: number | null;
        voteCount?: number | null;
        popularity?: number | null;
        originalLanguage?: string | null;
        trailerUrl?: string | null;
        playbackUrl?: string | null;
        genres?: { genre: { id: string; name: string; slug: string } }[];
    }) {
        return {
            id: movie.id,
            title: movie.title,
            description: movie.description,
            posterUrl: movie.posterUrl,
            backdropUrl: movie.backdropUrl,
            durationSeconds: movie.durationSeconds,
            releaseYear: movie.releaseYear,
            movieStatus: movie.movieStatus,
            encodeStatus: movie.encodeStatus,
            genres: movie.genres?.map((mg) => ({
                id: mg.genre.id,
                name: mg.genre.name,
                slug: mg.genre.slug,
            })) || [],
            actors: movie.actors || [],
            // TMDb fields
            tmdbId: movie.tmdbId || null,
            voteAverage: movie.voteAverage || null,
            voteCount: movie.voteCount || null,
            popularity: movie.popularity || null,
            originalLanguage: movie.originalLanguage || null,
            trailerUrl: movie.trailerUrl || null,
            playbackUrl: movie.playbackUrl || null,
            createdAt: movie.createdAt.toISOString(),
            updatedAt: movie.updatedAt.toISOString(),
        };
    }

    private async cleanupMovieFiles(movieId: string) {
        const prefixes = [
            `originals/${movieId}/`,
            `hls/${movieId}/`,
            `posters/${movieId}/`,
        ];

        for (const prefix of prefixes) {
            await this.deleteFolder(prefix);
        }
    }

    private async deleteFolder(prefix: string) {
        let continuationToken: string | undefined;
        do {
            const listCommand = new ListObjectsV2Command({
                Bucket: this.bucket,
                Prefix: prefix,
                ContinuationToken: continuationToken,
            });
            const listResult = await this.s3Client.send(listCommand);

            if (listResult.Contents && listResult.Contents.length > 0) {
                const deleteCommand = new DeleteObjectsCommand({
                    Bucket: this.bucket,
                    Delete: {
                        Objects: listResult.Contents.map((obj) => ({ Key: obj.Key })),
                        Quiet: true,
                    },
                });
                await this.s3Client.send(deleteCommand);
            }

            continuationToken = listResult.NextContinuationToken;
        } while (continuationToken);
    }
}
