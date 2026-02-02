
import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AiService } from '../ai/ai.service';
import { PrismaService } from '../prisma/prisma.service'; // Kept as it's used
import { MovieStatus, EncodeStatus, User, Prisma } from '@prisma/client';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
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
        private aiService: AiService,
    ) {
        this.bucket = this.configService.get<string>('S3_BUCKET') || 'netflop-media';
        this.s3Client = new S3Client({
            endpoint: this.configService.get<string>('S3_ENDPOINT') || 'http://localhost:9000',
            region: this.configService.get<string>('S3_REGION') || 'us-east-1',
            credentials: {
                accessKeyId: this.configService.get<string>('S3_ACCESS_KEY') || 'minioadmin',
                secretAccessKey: this.configService.get<string>('S3_SECRET_KEY') || 'minioadmin',
            },
            forcePathStyle: true,
        });
    }

    async create(dto: CreateMovieDto) {
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
                subtitleUrl: dto.subtitleUrl,
                movieStatus: 'draft',
                encodeStatus: 'pending',
                // cast and genres logic omitted for brevity but required if validation is strict
            }
        });
    }

    async findAll(query: ListMoviesDto, user?: any) {
        const { page = 1, limit = 20, q: search } = query;
        const skip = (page - 1) * limit;
        const where: any = {};
        if (search) where.title = { contains: search, mode: 'insensitive' };

        const [movies, total] = await Promise.all([
            this.prisma.movie.findMany({ where, take: limit, skip, orderBy: { createdAt: 'desc' }, include: { genres: { include: { genre: true } } } }),
            this.prisma.movie.count({ where })
        ]);

        return { data: movies.map((m: typeof movies[number]) => this.formatMovie(m)), total };
    }

    async findById(id: string, user?: any) {
        const movie = await this.prisma.movie.findUnique({ where: { id }, include: { genres: { include: { genre: true } } } });
        if (!movie) throw new NotFoundException('Movie not found');
        return this.formatMovie(movie);
    }

    async delete(id: string) {
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

        const movie = await this.prisma.movie.update({
            where: { id },
            data: {
                title: dto.title,
                description: dto.description,
                releaseYear: dto.releaseYear,
                durationSeconds: dto.durationSeconds,
            },
            include: {
                genres: { include: { genre: true } },
            },
        });

        // Trigger AI retrain for metadata update
        this.aiService.triggerRetrain().catch(err => console.warn('AI Retrain failed', err));

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

        // Trigger AI retrain on publish status change
        this.aiService.triggerRetrain().catch(err => console.warn('AI Retrain failed', err));

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

        // Check Premium Access
        // @ts-ignore - isPremium might not yet be in generated client if migration failed
        if (movie.isPremium) {
            const subscription = await this.prisma.subscription.findUnique({
                where: { userId: user.id },
            });

            // Check if active (BASIC or PREMIUM)
            // @ts-ignore - PaymentStatus/SubscriptionStatus might be missing in client types
            if (!subscription || (subscription.status !== 'ACTIVE' && subscription.status !== 'PAST_DUE')) {
                throw new ForbiddenException({
                    code: 'PREMIUM_REQUIRED',
                    message: 'Premium subscription required',
                });
            }
        }

        const ttl = parseInt(this.configService.get<string>('STREAM_URL_TTL_SECONDS') || '3600', 10);
        // Requirement 2: Normalize prefix
        const rawPrefix = this.configService.get<string>('HLS_PREFIX') || 'hls';
        const prefix = rawPrefix.trim();

        // Requirement 3: Guard against whitespace
        const buildKey = (p: string, mId: string, suffix: string) => {
            const key = `${p}/${mId}/${suffix}`;
            if (key.match(/\s/) || key.includes('%20')) {
                console.warn(`[stream] Key malformed (contains whitespace): "${key}"`);
            }
            return key;
        };

        const masterKey = buildKey(prefix, id, 'master.m3u8');

        let playbackUrl: string;
        let qualityOptions: { name: string; url: string }[];
        let expiresAt: string | null = null;

        // Use S3_PUBLIC_BASE_URL for mobile compatibility (derived from DEV_PUBLIC_HOST)
        const s3PublicBaseUrl = this.configService.get<string>('S3_PUBLIC_BASE_URL');

        if (s3PublicBaseUrl) {
            // Public URL mode - mobile-friendly (no signature, uses DEV_PUBLIC_HOST)
            playbackUrl = `${s3PublicBaseUrl}/${masterKey}`;
            console.log(`[stream] Generated public playbackUrl: ${playbackUrl}`);

            const variants = [
                { name: '360p', suffix: 'v0/prog_index.m3u8' },
                { name: '480p', suffix: 'v1/prog_index.m3u8' },
                { name: '720p', suffix: 'v2/prog_index.m3u8' },
            ];

            qualityOptions = variants.map((v) => {
                const key = buildKey(prefix, id, v.suffix);
                return { name: v.name, url: `${s3PublicBaseUrl}/${key}` };
            });
        } else {
            // Fallback: Presigned URL mode
            const masterCommand = new GetObjectCommand({
                Bucket: this.bucket,
                Key: masterKey,
            });
            playbackUrl = await getSignedUrl(this.s3Client, masterCommand, { expiresIn: ttl });

            const variants = [
                { name: '360p', suffix: 'v0/prog_index.m3u8' },
                { name: '480p', suffix: 'v1/prog_index.m3u8' },
                { name: '720p', suffix: 'v2/prog_index.m3u8' },
            ];

            qualityOptions = await Promise.all(
                variants.map(async (v) => {
                    const key = buildKey(prefix, id, v.suffix);
                    const command = new GetObjectCommand({
                        Bucket: this.bucket,
                        Key: key,
                    });
                    const url = await getSignedUrl(this.s3Client, command, { expiresIn: ttl });
                    return { name: v.name, url };
                })
            );

            expiresAt = new Date(Date.now() + ttl * 1000).toISOString();
        }

        return {
            playbackUrl,
            qualityOptions,
            expiresAt,
        };
    }

    async getProgress(movieId: string, userId: string) {
        const history = await this.prisma.watchHistory.findFirst({
            where: { userId, movieId },
        });

        if (!history) {
            return {
                progressSeconds: 0,
                durationSeconds: 0,
                completed: false,
                updatedAt: null,
            };
        }

        return {
            progressSeconds: history.progressSeconds,
            durationSeconds: history.durationSeconds,
            completed: history.completed,
            updatedAt: history.updatedAt.toISOString(),
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
        createdAt: Date;
        updatedAt: Date;
        // TMDb fields
        tmdbId?: number | null;
        voteAverage?: number | null;
        voteCount?: number | null;
        popularity?: number | null;
        originalLanguage?: string | null;
        trailerUrl?: string | null;
        subtitleUrl?: string | null;
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
            // TMDb fields
            tmdbId: movie.tmdbId || null,
            voteAverage: movie.voteAverage || null,
            voteCount: movie.voteCount || null,
            popularity: movie.popularity || null,
            originalLanguage: movie.originalLanguage || null,
            trailerUrl: movie.trailerUrl || null,
            subtitleUrl: movie.subtitleUrl || null,
            createdAt: movie.createdAt.toISOString(),
            updatedAt: movie.updatedAt.toISOString(),
        };
    }
}
