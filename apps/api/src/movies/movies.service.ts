/**
 * ===== MOVIES SERVICE - LOGIC NGHIá»†P Vá»¤ QUáº¢N LĂ PHIM =====
 *
 * MoviesService chá»©a toĂ n bá»™ logic CRUD vĂ  streaming cho phim:
 *
 * Chá»©c nÄƒng chĂ­nh:
 * - create()       â†’ Táº¡o phim má»›i (admin)
 * - findAll()      â†’ Danh sĂ¡ch phim cĂ³ phĂ¢n trang + tĂ¬m kiáº¿m
 * - findById()     â†’ Chi tiáº¿t má»™t phim
 * - update()       â†’ Cáº­p nháº­t thĂ´ng tin phim (admin)
 * - delete()       â†’ XĂ³a phim + dá»n dáº¹p file trĂªn S3 (admin)
 * - publish()      â†’ Xuáº¥t báº£n/bá» xuáº¥t báº£n phim (admin)
 * - getStreamUrl() â†’ Láº¥y URL streaming HLS (user Ä‘Ă£ Ä‘Äƒng nháº­p)
 * - getProgress()  â†’ Láº¥y tiáº¿n trĂ¬nh xem (placeholder)
 *
 * TĂ­ch há»£p:
 * - S3/MinIO: Quáº£n lĂ½ file video gá»‘c, HLS segments, poster
 * - Prisma: CRUD database
 * - Genres: Quan há»‡ many-to-many qua báº£ng trung gian MovieGenre
 */

import { Injectable, NotFoundException, ForbiddenException, ConflictException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';

import { MovieStatus, EncodeStatus, User, Prisma } from '@prisma/client';
import { S3Client, ListObjectsV2Command, DeleteObjectsCommand } from '@aws-sdk/client-s3';
import { CreateMovieDto } from './dto/create-movie.dto';
import { UpdateMovieDto } from './dto/update-movie.dto';
import { ListMoviesDto } from './dto/list-movies.dto';
import { normalizeS3AssetUrl } from '../common/utils/storage-url';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';
import { UsageService } from '../usage/usage.service';

/**
 * Interface káº¿t quáº£ phĂ¢n trang.
 * - data: Máº£ng dá»¯ liá»‡u trang hiá»‡n táº¡i
 * - total: Tá»•ng sá»‘ báº£n ghi (Ä‘á»ƒ tĂ­nh tá»•ng sá»‘ trang)
 */
interface PaginatedResult<T> {
    data: T[];
    total: number;
}



@Injectable()
export class MoviesService {
    private readonly logger = new Logger(MoviesService.name);

    // S3 client Ä‘á»ƒ thao tĂ¡c file trĂªn MinIO/S3
    private s3Client: S3Client;
    // TĂªn bucket lÆ°u trá»¯ media (VD: "netflat-media")
    private bucket: string;
    // Base URL cĂ´ng khai Ä‘á»ƒ truy cáº­p file tá»« browser (VD: "http://localhost:9002/netflat-media")
    private s3PublicBaseUrl: string;

    constructor(
        private prisma: PrismaService,
        private configService: ConfigService,
        private subscriptionsService: SubscriptionsService,
        private usageService: UsageService,

    ) {
        // Äá»c cáº¥u hĂ¬nh S3/MinIO tá»« biáº¿n mĂ´i trÆ°á»ng
        this.bucket = this.configService.get<string>('S3_BUCKET') || 'netflat-media';
        this.s3PublicBaseUrl = this.configService.get<string>('S3_PUBLIC_BASE_URL') || 'http://localhost:9002/netflat-media';

        // Khá»Ÿi táº¡o S3 client Ä‘á»ƒ thao tĂ¡c file (xĂ³a file khi xĂ³a phim)
        this.s3Client = new S3Client({
            endpoint: this.configService.get<string>('S3_ENDPOINT') || 'http://localhost:9002',
            region: this.configService.get<string>('S3_REGION') || 'us-east-1',
            credentials: {
                accessKeyId: this.configService.get<string>('S3_ACCESS_KEY') || 'minioadmin',
                secretAccessKey: this.configService.get<string>('S3_SECRET_KEY') || 'minioadmin',
            },
            forcePathStyle: true, // Báº¯t buá»™c cho MinIO (path-style: http://host/bucket/key)
        });
    }

    /**
     * Táº O PHIM Má»I (Admin only)
     *
     * Luá»“ng xá»­ lĂ½:
     * 1. Chuáº©n hĂ³a tiĂªu Ä‘á» (trim + collapse whitespace)
     * 2. Kiá»ƒm tra trĂ¹ng tiĂªu Ä‘á» (case-insensitive) â†’ 409 Conflict
     * 3. Chuáº©n hĂ³a danh sĂ¡ch diá»…n viĂªn (trim, lá»c rá»—ng)
     * 4. Táº¡o liĂªn káº¿t many-to-many vá»›i thá»ƒ loáº¡i (MovieGenre)
     * 5. Táº¡o record phim trong DB vá»›i tráº¡ng thĂ¡i ban Ä‘áº§u:
     *    - movieStatus: "draft" (báº£n nhĂ¡p, chÆ°a xuáº¥t báº£n)
     *    - encodeStatus: "pending" (chÆ°a encode video)
     */
    async create(dto: CreateMovieDto) {
        // BÆ°á»›c 1: Chuáº©n hĂ³a tiĂªu Ä‘á»
        const normalizedTitle = this.normalizeTitle(dto.title);

        // BÆ°á»›c 2: Kiá»ƒm tra trĂ¹ng tiĂªu Ä‘á» (khĂ´ng phĂ¢n biá»‡t hoa/thÆ°á»ng)
        const existingToken = await this.prisma.movie.findFirst({
            where: {
                title: {
                    equals: normalizedTitle,
                    mode: 'insensitive', // KhĂ´ng phĂ¢n biá»‡t hoa/thÆ°á»ng
                },
            },
        });

        if (existingToken) {
            throw new ConflictException({
                code: 'MOVIE_TITLE_EXISTS',
                message: `Movie with title "${normalizedTitle}" already exists`,
            });
        }

        // BÆ°á»›c 3: Chuáº©n hĂ³a tĂªn diá»…n viĂªn (trim + lá»c chuá»—i rá»—ng)
        const actorNames = this.normalizeActors(dto.actors);

        // BÆ°á»›c 4: Xá»­ lĂ½ thá»ƒ loáº¡i - táº¡o liĂªn káº¿t many-to-many
        // Sá»­ dá»¥ng nested create qua báº£ng trung gian MovieGenre
        let genreOperations: Prisma.MovieGenreCreateNestedManyWithoutMovieInput | undefined;
        if (dto.genreIds && dto.genreIds.length > 0) {
            genreOperations = {
                create: dto.genreIds.map((genreId) => ({
                    genre: { connect: { id: genreId } }, // Káº¿t ná»‘i vá»›i genre Ä‘Ă£ tá»“n táº¡i
                })),
            };
        }

        // BÆ°á»›c 5: Táº¡o record phim trong database
        return this.prisma.movie.create({
            data: {
                title: normalizedTitle,
                description: dto.description,
                releaseYear: dto.releaseYear,
                durationSeconds: dto.durationSeconds,
                // Chuáº©n hĂ³a poster URL thĂ nh Ä‘Æ°á»ng dáº«n cĂ´ng khai S3
                posterUrl: normalizeS3AssetUrl(dto.posterUrl, this.s3PublicBaseUrl, this.bucket),
                backdropUrl: dto.backdropUrl,
                originalLanguage: dto.originalLanguage,
                trailerUrl: dto.trailerUrl,
                movieStatus: MovieStatus.draft,        // Ban Ä‘áº§u lĂ  báº£n nhĂ¡p
                encodeStatus: EncodeStatus.pending,    // ChÆ°a encode
                actors: actorNames,                    // Máº£ng tĂªn diá»…n viĂªn (PostgreSQL array)
                genres: genreOperations,               // LiĂªn káº¿t thá»ƒ loáº¡i
            },
            include: {
                genres: { include: { genre: true } },  // KĂ¨m thĂ´ng tin thá»ƒ loáº¡i
            },
        }).then((movie) => this.formatMovie(movie));
    }

    /**
     * DANH SĂCH PHIM (cĂ³ phĂ¢n trang + tĂ¬m kiáº¿m)
     *
     * Query params:
     * - page: Trang hiá»‡n táº¡i (máº·c Ä‘á»‹nh 1)
     * - limit: Sá»‘ phim / trang (máº·c Ä‘á»‹nh 20)
     * - q: Tá»« khĂ³a tĂ¬m kiáº¿m (tĂ¬m theo tiĂªu Ä‘á» HOáº¶C tĂªn diá»…n viĂªn)
     *
     * Sá»­ dá»¥ng Promise.all Ä‘á»ƒ cháº¡y song song 2 query:
     * 1. findMany: Láº¥y danh sĂ¡ch phim (cĂ³ skip/take cho phĂ¢n trang)
     * 2. count: Äáº¿m tá»•ng sá»‘ phim khá»›p Ä‘iá»u kiá»‡n
     */
    async findAll(query: ListMoviesDto, user?: any) {
        const { page = 1, limit = 20, q: search } = query;
        const skip = (page - 1) * limit; // TĂ­nh offset: (trang - 1) * sá»‘ item/trang
        const where: any = {};

        // Náº¿u cĂ³ tá»« khĂ³a tĂ¬m kiáº¿m â†’ tĂ¬m theo tiĂªu Ä‘á» HOáº¶C tĂªn diá»…n viĂªn
        if (search) {
            where.OR = [
                { title: { contains: search, mode: 'insensitive' } },    // TĂ¬m trong tiĂªu Ä‘á»
                { actors: { has: search } },                              // ChĂ­nh xĂ¡c tĂªn diá»…n viĂªn
                { actors: { hasSome: [search] } },                        // CĂ³ Ă­t nháº¥t 1 diá»…n viĂªn khá»›p
            ];
        }

        // Cháº¡y song song: láº¥y data + Ä‘áº¿m tá»•ng
        const [movies, total] = await Promise.all([
            this.prisma.movie.findMany({
                where,
                take: limit,                               // Sá»‘ báº£n ghi láº¥y
                skip,                                       // Bá» qua bao nhiĂªu báº£n ghi
                orderBy: { createdAt: 'desc' },            // Má»›i nháº¥t lĂªn trÆ°á»›c
                include: {
                    genres: { include: { genre: true } },  // KĂ¨m thá»ƒ loáº¡i
                },
            }),
            this.prisma.movie.count({ where })             // Äáº¿m tá»•ng
        ]);

        return { data: movies.map((m) => this.formatMovie(m)), total };
    }

    /**
     * CHI TIáº¾T Má»˜T PHIM
     *
     * TĂ¬m phim theo ID (UUID), kĂ¨m thĂ´ng tin thá»ƒ loáº¡i.
     * Náº¿u khĂ´ng tĂ¬m tháº¥y â†’ tráº£ lá»—i 404 Not Found.
     */
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

    /**
     * XĂ“A PHIM (Admin only)
     *
     * Luá»“ng xá»­ lĂ½:
     * 1. Kiá»ƒm tra phim tá»“n táº¡i â†’ 404 náº¿u khĂ´ng
     * 2. Dá»n dáº¹p file trĂªn S3 (video gá»‘c, HLS segments, poster)
     *    â†’ Náº¿u lá»—i S3, váº«n tiáº¿p tá»¥c xĂ³a DB (log warning)
     * 3. XĂ³a record phim trong database (cascade xĂ³a liĂªn káº¿t)
     */
    async delete(id: string) {
        const movie = await this.prisma.movie.findUnique({ where: { id } });
        if (!movie) throw new NotFoundException('Movie not found');

        // Dá»n dáº¹p file trĂªn S3/MinIO (originals/, hls/, posters/)
        try {
            await this.cleanupMovieFiles(id);
        } catch (error: unknown) {
            // Náº¿u lá»—i S3, chá»‰ log warning vĂ  tiáº¿p tá»¥c xĂ³a DB
            const message = error instanceof Error ? error.message : String(error);
            this.logger.warn(`Storage cleanup skipped for movie ${id}: ${message}`);
        }

        // XĂ³a phim trong database (Prisma sáº½ cascade xĂ³a cĂ¡c liĂªn káº¿t)
        await this.prisma.movie.delete({ where: { id } });
        return { success: true };
    }

    // ... (existing findAll, findById, create)

    /**
     * Cáº¬P NHáº¬T THĂ”NG TIN PHIM (Admin only)
     *
     * Luá»“ng xá»­ lĂ½:
     * 1. Kiá»ƒm tra phim tá»“n táº¡i â†’ 404
     * 2. Náº¿u Ä‘á»•i tiĂªu Ä‘á» â†’ kiá»ƒm tra trĂ¹ng (loáº¡i trá»« chĂ­nh nĂ³) â†’ 409
     * 3. Náº¿u Ä‘á»•i thá»ƒ loáº¡i â†’ xĂ³a háº¿t liĂªn káº¿t cÅ©, táº¡o liĂªn káº¿t má»›i
     * 4. Náº¿u Ä‘á»•i diá»…n viĂªn â†’ chuáº©n hĂ³a danh sĂ¡ch
     * 5. Cáº­p nháº­t record trong database
     */
    async update(id: string, dto: UpdateMovieDto) {
        // Kiá»ƒm tra phim tá»“n táº¡i
        const existing = await this.prisma.movie.findUnique({ where: { id } });
        if (!existing) {
            throw new NotFoundException({
                code: 'MOVIE_NOT_FOUND',
                message: 'Movie not found',
            });
        }

        // Náº¿u cĂ³ Ä‘á»•i tiĂªu Ä‘á» â†’ kiá»ƒm tra trĂ¹ng (loáº¡i trá»« phim hiá»‡n táº¡i)
        const normalizedTitle = dto.title !== undefined ? this.normalizeTitle(dto.title) : undefined;
        if (normalizedTitle !== undefined) {
            const duplicate = await this.prisma.movie.findFirst({
                where: {
                    id: { not: id },                     // Loáº¡i trá»« chĂ­nh nĂ³
                    title: {
                        equals: normalizedTitle,
                        mode: 'insensitive',
                    },
                },
            });

            if (duplicate) {
                throw new ConflictException({
                    code: 'MOVIE_TITLE_EXISTS',
                    message: `Movie with title "${normalizedTitle}" already exists`,
                });
            }
        }

        // Xá»­ lĂ½ cáº­p nháº­t thá»ƒ loáº¡i: XĂ“A háº¿t liĂªn káº¿t cÅ© â†’ táº¡o má»›i
        // (Chiáº¿n lÆ°á»£c "replace all" vĂ¬ Prisma chÆ°a há»— trá»£ diff update many-to-many tá»‘t)
        if (dto.genreIds !== undefined) {
            await this.prisma.movieGenre.deleteMany({ where: { movieId: id } });
            if (dto.genreIds.length > 0) {
                await this.prisma.movieGenre.createMany({
                    data: dto.genreIds.map((genreId) => ({ movieId: id, genreId })),
                });
            }
        }

        // Chuáº©n hĂ³a danh sĂ¡ch diá»…n viĂªn
        const actorNames = dto.actors !== undefined
            ? this.normalizeActors(dto.actors)
            : undefined;

        // Cáº­p nháº­t database
        const movie = await this.prisma.movie.update({
            where: { id },
            data: {
                title: normalizedTitle,
                description: dto.description,
                releaseYear: dto.releaseYear,
                durationSeconds: dto.durationSeconds,
                ...(actorNames !== undefined && { actors: actorNames }), // Chá»‰ cáº­p nháº­t náº¿u cĂ³ thay Ä‘á»•i
            },
            include: {
                genres: { include: { genre: true } },
            },
        });

        return this.formatMovie(movie);
    }

    /**
     * XUáº¤T Báº¢N / Bá» XUáº¤T Báº¢N PHIM (Admin only)
     *
     * Chuyá»ƒn tráº¡ng thĂ¡i phim:
     * - published = true  â†’ movieStatus = "published" (hiá»ƒn thá»‹ cho user)
     * - published = false â†’ movieStatus = "draft" (áº©n khá»i user)
     *
     * LÆ°u Ă½: Phim chá»‰ cĂ³ thá»ƒ xem/stream khi Äá»’NG THá»œI:
     * - movieStatus = "published" (Ä‘Ă£ xuáº¥t báº£n)
     * - encodeStatus = "ready" (Ä‘Ă£ encode xong video HLS)
     */
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

    /**
     * Láº¤Y URL STREAMING HLS (User Ä‘Ă£ Ä‘Äƒng nháº­p)
     *
     * Luá»“ng xá»­ lĂ½:
     * 1. Kiá»ƒm tra phim tá»“n táº¡i â†’ 404
     * 2. Kiá»ƒm tra phim Ä‘Ă£ published + encode ready â†’ 403 náº¿u chÆ°a
     * 3. Náº¿u phim Ä‘Ă£ cĂ³ playbackUrl (lÆ°u trong DB) â†’ tráº£ luĂ´n
     * 4. Náº¿u chÆ°a â†’ táº¡o URL dá»±a trĂªn convention:
     *    - Master playlist: {S3_PUBLIC_BASE_URL}/hls/{movieId}/master.m3u8
     *    - 480p: .../hls/{movieId}/v0/prog_index.m3u8
     *    - 720p: .../hls/{movieId}/v1/prog_index.m3u8
     *
     * Tráº£ vá»:
     * - playbackUrl: URL master playlist HLS (cho video player)
     * - qualityOptions: Danh sĂ¡ch cĂ¡c phiĂªn báº£n cháº¥t lÆ°á»£ng
     */
    async getStreamUrl(id: string, user: User) {
        const movie = await this.prisma.movie.findUnique({ where: { id } });
        if (!movie) {
            throw new NotFoundException({
                code: 'MOVIE_NOT_FOUND',
                message: 'Movie not found',
            });
        }

        // Chá»‰ phim "published" + "ready" má»›i cho phĂ©p streaming
        if (movie.movieStatus !== MovieStatus.published || movie.encodeStatus !== EncodeStatus.ready) {
            throw new ForbiddenException({
                code: 'MOVIE_NOT_READY',
                message: 'Movie is not available for streaming',
            });
        }

        const subscription = await this.subscriptionsService.getActiveSubscription(user.id);
        const allowed = await this.usageService.canWatchMovie(
            user.id,
            subscription.plan.maxMoviesPerMonth,
        );

        if (!allowed) {
            throw new ForbiddenException({
                code: 'MONTHLY_LIMIT_EXCEEDED',
                message: 'Monthly watch limit exceeded for your current plan',
            });
        }

        // Náº¿u Ä‘Ă£ cĂ³ playbackUrl trong DB â†’ tráº£ luĂ´n
        if (movie.playbackUrl) {
            await this.usageService.incrementMoviesWatched(user.id);
            return {
                playbackUrl: movie.playbackUrl,
                qualityOptions: [],
                plan: subscription.plan.name,
            };
        }

        // Táº¡o URL streaming dá»±a trĂªn quy Æ°á»›c lÆ°u trá»¯ HLS trĂªn S3
        const s3PublicBaseUrl = this.configService.get<string>('S3_PUBLIC_BASE_URL')
            || 'http://localhost:9002/netflat-media';

        // Master playlist â†’ chá»©a danh sĂ¡ch cĂ¡c variant (480p, 720p)
        const playbackUrl = `${s3PublicBaseUrl}/hls/${id}/master.m3u8`;

        // Danh sĂ¡ch cĂ¡c phiĂªn báº£n cháº¥t lÆ°á»£ng
        const qualityOptions = [
            { name: '480p', url: `${s3PublicBaseUrl}/hls/${id}/v0/prog_index.m3u8` },
            { name: '720p', url: `${s3PublicBaseUrl}/hls/${id}/v1/prog_index.m3u8` },
        ];

        const maxQuality = subscription.plan.maxQualityResolution.toLowerCase();
        const restrictedQualityOptions = qualityOptions.filter((q) => {
            if (maxQuality === '480p') {
                return q.name === '480p';
            }

            if (maxQuality === '720p') {
                return q.name === '480p' || q.name === '720p';
            }

            return true;
        });

        await this.usageService.incrementMoviesWatched(user.id);

        return {
            playbackUrl,
            qualityOptions: restrictedQualityOptions,
            plan: subscription.plan.name,
            maxQualityResolution: subscription.plan.maxQualityResolution,
        };
    }

    /**
     * Láº¤Y TIáº¾N TRĂŒNH XEM (Placeholder)
     *
     * Hiá»‡n táº¡i tráº£ vá» giĂ¡ trá»‹ máº·c Ä‘á»‹nh (0 giĂ¢y, chÆ°a hoĂ n thĂ nh).
     * Logic thá»±c táº¿ Ä‘Æ°á»£c xá»­ lĂ½ bá»Ÿi HistoryService.
     */
    async getProgress(movieId: string, userId: string) {
        return {
            progressSeconds: 0,
            durationSeconds: 0,
            completed: false,
            updatedAt: null,
        };
    }

    // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
    // CĂC HĂ€M Ná»˜I Bá»˜ (Private Methods)
    // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

    /**
     * Äá»NH Dáº NG Dá»® LIá»†U PHIM TRÆ¯á»C KHI TRáº¢ Vá»€ CLIENT
     *
     * Chuáº©n hĂ³a vĂ  chá»n lá»c cĂ¡c trÆ°á»ng cáº§n thiáº¿t:
     * - Chuáº©n hĂ³a posterUrl thĂ nh Ä‘Æ°á»ng dáº«n cĂ´ng khai S3
     * - Map genres tá»« báº£ng trung gian â†’ máº£ng pháº³ng
     * - Chuyá»ƒn Date â†’ ISO string cho JSON response
     * - Bao gá»“m cáº£ metadata TMDb (náº¿u cĂ³)
     */
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
        // CĂ¡c trÆ°á»ng tá»« TMDb (The Movie Database)
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
            // Chuáº©n hĂ³a poster URL â†’ URL cĂ´ng khai S3
            posterUrl: normalizeS3AssetUrl(movie.posterUrl, this.s3PublicBaseUrl, this.bucket),
            backdropUrl: movie.backdropUrl,
            durationSeconds: movie.durationSeconds,
            releaseYear: movie.releaseYear,
            movieStatus: movie.movieStatus,
            encodeStatus: movie.encodeStatus,
            // Chuyá»ƒn tá»« { genre: { id, name, slug } }[] â†’ { id, name, slug }[]
            genres: movie.genres?.map((mg) => ({
                id: mg.genre.id,
                name: mg.genre.name,
                slug: mg.genre.slug,
            })) || [],
            actors: movie.actors || [],
            // Metadata tá»« TMDb (nullable)
            tmdbId: movie.tmdbId || null,
            voteAverage: movie.voteAverage || null,
            voteCount: movie.voteCount || null,
            popularity: movie.popularity || null,
            originalLanguage: movie.originalLanguage || null,
            trailerUrl: movie.trailerUrl || null,
            playbackUrl: movie.playbackUrl || null,
            // Chuyá»ƒn Date â†’ ISO 8601 string
            createdAt: movie.createdAt.toISOString(),
            updatedAt: movie.updatedAt.toISOString(),
        };
    }

    /**
     * Dá»ŒN Dáº¸P FILE Cá»¦A PHIM TRĂN S3
     *
     * Khi xĂ³a phim, cáº§n xĂ³a táº¥t cáº£ file liĂªn quan trĂªn S3:
     * - originals/{movieId}/ â†’ Video gá»‘c Ä‘Ă£ upload
     * - hls/{movieId}/       â†’ CĂ¡c file HLS Ä‘Ă£ encode (master.m3u8, segments)
     * - posters/{movieId}/   â†’ áº¢nh poster
     */
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

    /**
     * XĂ“A Táº¤T Cáº¢ FILE TRONG Má»˜T "THÆ¯ Má»¤C" TRĂN S3
     *
     * S3 khĂ´ng cĂ³ khĂ¡i niá»‡m thÆ° má»¥c thá»±c sá»±, nĂªn pháº£i:
     * 1. List táº¥t cáº£ objects cĂ³ prefix khá»›p
     * 2. XĂ³a tá»«ng batch objects tĂ¬m Ä‘Æ°á»£c
     * 3. Xá»­ lĂ½ pagination (ContinuationToken) náº¿u nhiá»u file
     *
     * Náº¿u bucket khĂ´ng tá»“n táº¡i â†’ bá» qua (log warning)
     */
    private async deleteFolder(prefix: string) {
        let continuationToken: string | undefined;
        do {
            let listResult;
            try {
                // Liá»‡t kĂª táº¥t cáº£ objects cĂ³ prefix khá»›p
                const listCommand = new ListObjectsV2Command({
                    Bucket: this.bucket,
                    Prefix: prefix,
                    ContinuationToken: continuationToken,
                });
                listResult = await this.s3Client.send(listCommand);
            } catch (error: unknown) {
                // Náº¿u bucket khĂ´ng tá»“n táº¡i â†’ bá» qua
                if (this.isNoSuchBucketError(error)) {
                    this.logger.warn(`Bucket ${this.bucket} does not exist, skipping cleanup for prefix ${prefix}`);
                    return;
                }
                throw error;
            }

            // XĂ³a batch objects tĂ¬m Ä‘Æ°á»£c
            if (listResult.Contents && listResult.Contents.length > 0) {
                const deleteCommand = new DeleteObjectsCommand({
                    Bucket: this.bucket,
                    Delete: {
                        Objects: listResult.Contents.map((obj) => ({ Key: obj.Key })),
                        Quiet: true, // KhĂ´ng tráº£ vá» chi tiáº¿t tá»«ng file Ä‘Ă£ xĂ³a
                    },
                });
                await this.s3Client.send(deleteCommand);
            }

            // Tiáº¿p tá»¥c náº¿u cĂ²n nhiá»u file (S3 giá»›i háº¡n 1000 objects/láº§n list)
            continuationToken = listResult.NextContinuationToken;
        } while (continuationToken);
    }

    /**
     * CHUáº¨N HĂ“A TIĂU Äá»€ PHIM
     * - Trim khoáº£ng tráº¯ng Ä‘áº§u/cuá»‘i
     * - Gá»™p nhiá»u khoáº£ng tráº¯ng liĂªn tiáº¿p thĂ nh 1
     */
    private normalizeTitle(title: string): string {
        return title.trim().replace(/\s+/g, ' ');
    }

    /**
     * CHUẨN HÓA DANH SÁCH DIỄN VIÊN
     * - Trim khoảng trắng
     * - Loại bỏ giá trị rỗng
     * - Gộp trùng không phân biệt hoa thường
     */
    private normalizeActors(actors?: string[]): string[] {
        if (!actors || actors.length === 0) {
            return [];
        }

        const seen = new Set<string>();
        const normalizedActors: string[] = [];

        for (const actor of actors) {
            const value = actor.trim();
            if (!value) {
                continue;
            }

            const key = value.toLocaleLowerCase('en-US');
            if (seen.has(key)) {
                continue;
            }

            seen.add(key);
            normalizedActors.push(value);
        }

        return normalizedActors;
    }

    /**
     * KIá»‚M TRA Lá»–I "BUCKET KHĂ”NG Tá»’N Táº I" Tá»ª S3
     * S3 SDK cĂ³ thá»ƒ tráº£ lá»—i vá»›i tĂªn khĂ¡c nhau tĂ¹y provider
     */
    private isNoSuchBucketError(error: unknown): boolean {
        if (!error || typeof error !== 'object') {
            return false;
        }

        const maybeError = error as { name?: string; Code?: string; code?: string };
        return maybeError.name === 'NoSuchBucket' || maybeError.Code === 'NoSuchBucket' || maybeError.code === 'NoSuchBucket';
    }
}

