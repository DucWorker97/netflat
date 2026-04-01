/**
 * ===== FAVORITES SERVICE - LOGIC DANH SÁCH PHIM YÊU THÍCH =====
 *
 * FavoritesService quản lý danh sách phim yêu thích của người dùng:
 *
 * - addFavorite()     → Thêm phim vào danh sách yêu thích
 * - removeFavorite()  → Xóa phim khỏi danh sách yêu thích
 * - getFavorites()    → Lấy danh sách phim yêu thích (phân trang)
 * - isFavorite()      → Kiểm tra phim có trong danh sách yêu thích không
 *
 * Ràng buộc nghiệp vụ:
 * - Chỉ được thêm phim đã "published" + "ready" vào favorites
 *   (không thể yêu thích phim draft hoặc đang encode)
 * - Mỗi cặp (userId, movieId) chỉ tồn tại 1 lần (unique constraint)
 */

import {
    Injectable,
    NotFoundException,
    BadRequestException,
    ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MovieStatus, EncodeStatus } from '@prisma/client';
import { normalizeS3AssetUrl } from '../common/utils/storage-url';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class FavoritesService {
    private s3PublicBaseUrl: string;
    private bucket: string;

    constructor(
        private prisma: PrismaService,
        private config: ConfigService,
    ) {
        this.s3PublicBaseUrl = this.config.get<string>('S3_PUBLIC_BASE_URL') || 'http://localhost:9002/netflat-media';
        this.bucket = this.config.get<string>('S3_BUCKET') || 'netflat-media';
    }

    /**
     * THÊM PHIM VÀO YÊU THÍCH
     *
     * Luồng xử lý:
     * 1. Kiểm tra phim tồn tại → 404
     * 2. Kiểm tra phim đã published + ready → 400 nếu chưa
     *    (không cho phép thêm phim draft/đang encode vào favorites)
     * 3. Kiểm tra đã tồn tại trong favorites chưa → 409 Conflict
     * 4. Tạo record Favorite mới
     */
    async addFavorite(userId: string, movieId: string) {
        // Kiểm tra phim tồn tại
        const movie = await this.prisma.movie.findUnique({ where: { id: movieId } });
        if (!movie) {
            throw new NotFoundException({
                code: 'MOVIE_NOT_FOUND',
                message: 'Movie not found',
            });
        }

        // Kiểm tra phim đã sẵn sàng (published + ready)
        if (movie.movieStatus !== MovieStatus.published || movie.encodeStatus !== EncodeStatus.ready) {
            throw new BadRequestException({
                code: 'MOVIE_NOT_AVAILABLE',
                message: 'Movie is not available for this action',
            });
        }

        // Kiểm tra đã tồn tại (unique constraint: userId + movieId)
        const existing = await this.prisma.favorite.findUnique({
            where: { userId_movieId: { userId, movieId } }, // Composite unique key
        });

        if (existing) {
            throw new ConflictException({
                code: 'ALREADY_FAVORITED',
                message: 'Movie is already in favorites',
            });
        }

        // Tạo record favorite
        const favorite = await this.prisma.favorite.create({
            data: { userId, movieId },
            include: { movie: true },
        });

        return this.formatFavorite(favorite);
    }

    /**
     * XÓA PHIM KHỎI YÊU THÍCH
     * Kiểm tra record tồn tại → 404
     * Xóa record theo composite key (userId + movieId)
     */
    async removeFavorite(userId: string, movieId: string) {
        const existing = await this.prisma.favorite.findUnique({
            where: { userId_movieId: { userId, movieId } },
        });

        if (!existing) {
            throw new NotFoundException({
                code: 'FAVORITE_NOT_FOUND',
                message: 'Movie is not in favorites',
            });
        }

        await this.prisma.favorite.delete({
            where: { userId_movieId: { userId, movieId } },
        });

        return { success: true };
    }

    /**
     * DANH SÁCH PHIM YÊU THÍCH (có phân trang)
     *
     * Trả về danh sách phim mà user đã thêm vào favorites.
     * Sắp xếp theo thời gian thêm giảm dần (mới nhất trước).
     * Include thông tin phim kèm theo (join với bảng Movie).
     */
    async getFavorites(userId: string, page = 1, limit = 20) {
        const skip = (page - 1) * limit;

        const [favorites, total] = await Promise.all([
            this.prisma.favorite.findMany({
                where: { userId },
                include: {
                    movie: {
                        include: {
                            genres: { include: { genre: true } },
                        },
                    },
                },
                take: limit,
                skip,
                orderBy: { createdAt: 'desc' },
            }),
            this.prisma.favorite.count({ where: { userId } }),
        ]);

        return {
            data: favorites.map((f) => this.formatFavorite(f)),
            total,
        };
    }

    /**
     * KIỂM TRA PHIM CÓ TRONG YÊU THÍCH KHÔNG
     * Trả về { isFavorite: true/false }
     */
    async isFavorite(userId: string, movieId: string) {
        const favorite = await this.prisma.favorite.findUnique({
            where: { userId_movieId: { userId, movieId } },
        });
        return { isFavorite: !!favorite };
    }

    // ═══════════════════════════════════════════════
    // FORMAT HELPER
    // ═══════════════════════════════════════════════

    /**
     * Định dạng dữ liệu favorite cho API response.
     * Chuẩn hóa posterUrl thành đường dẫn công khai S3.
     */
    private formatFavorite(favorite: any) {
        return {
            id: favorite.id,
            movieId: favorite.movieId,
            userId: favorite.userId,
            createdAt: favorite.createdAt.toISOString(),
            movie: favorite.movie ? {
                id: favorite.movie.id,
                title: favorite.movie.title,
                posterUrl: normalizeS3AssetUrl(favorite.movie.posterUrl, this.s3PublicBaseUrl, this.bucket),
                releaseYear: favorite.movie.releaseYear,
                movieStatus: favorite.movie.movieStatus,
                encodeStatus: favorite.movie.encodeStatus,
            } : null,
        };
    }
}
