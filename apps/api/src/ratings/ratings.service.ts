/**
 * ===== RATINGS SERVICE - LOGIC ĐÁNH GIÁ & BÌNH LUẬN PHIM =====
 *
 * RatingsService xử lý đánh giá và bình luận phim:
 *
 * - createOrUpdate() → Tạo/cập nhật đánh giá (score 1-5 + comment tùy chọn)
 * - getRating()      → Lấy đánh giá của user cho phim cụ thể
 * - getMovieRatings() → Danh sách đánh giá của phim (phân trang)
 * - getStats()       → Thống kê: điểm trung bình, tổng số đánh giá
 * - deleteRating()   → Xóa đánh giá
 *
 * Mỗi user chỉ được đánh giá MỘT LẦN cho mỗi phim.
 * Nếu đánh giá lại → cập nhật điểm/bình luận (upsert).
 */

import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class RatingsService {
    constructor(private prisma: PrismaService) { }

    /**
     * TẠO HOẶC CẬP NHẬT ĐÁNH GIÁ (Upsert)
     *
     * Sử dụng Prisma upsert với composite key (userId + movieId):
     * - Nếu chưa đánh giá → tạo mới
     * - Nếu đã đánh giá → cập nhật score và comment
     *
     * @param score - Điểm đánh giá (1-5 sao)
     * @param comment - Bình luận tùy chọn (có thể null)
     */
    async createOrUpdate(userId: string, movieId: string, ratingValue: number, comment?: string) {
        // Kiểm tra phim tồn tại → 404
        const movie = await this.prisma.movie.findUnique({ where: { id: movieId } });
        if (!movie) {
            throw new NotFoundException({
                code: 'MOVIE_NOT_FOUND',
                message: 'Movie not found',
            });
        }

        // Upsert: tạo mới hoặc cập nhật đánh giá
        const rating = await this.prisma.rating.upsert({
            where: {
                userId_movieId: { userId, movieId }, // Composite unique key
            },
            create: {
                userId,
                movieId,
                rating: ratingValue,
                comment: comment || null,
            },
            update: {
                rating: ratingValue,
                comment: comment || null,
                updatedAt: new Date(),
            },
            include: {
                user: {
                    select: { id: true, email: true, displayName: true, avatarUrl: true },
                },
            },
        });

        return this.formatRating(rating);
    }

    /**
     * LẤY ĐÁNH GIÁ CỦA USER CHO PHIM CỤ THỂ
     * Trả về null nếu user chưa đánh giá.
     */
    async getRating(userId: string, movieId: string) {
        const rating = await this.prisma.rating.findUnique({
            where: { userId_movieId: { userId, movieId } },
            include: {
                user: {
                    select: { id: true, email: true, displayName: true, avatarUrl: true },
                },
            },
        });

        return rating ? this.formatRating(rating) : null;
    }

    /**
     * DANH SÁCH ĐÁNH GIÁ CỦA PHIM (có phân trang)
     *
     * Trả về list đánh giá kèm thông tin user (hiển thị tên + avatar).
     * Sắp xếp theo thời gian tạo giảm dần (mới nhất trước).
     */
    async getMovieRatings(movieId: string, page = 1, limit = 20) {
        const skip = (page - 1) * limit;

        const [ratings, total] = await Promise.all([
            this.prisma.rating.findMany({
                where: { movieId },
                include: {
                    user: {
                        select: { id: true, email: true, displayName: true, avatarUrl: true },
                    },
                },
                take: limit,
                skip,
                orderBy: { createdAt: 'desc' },
            }),
            this.prisma.rating.count({ where: { movieId } }),
        ]);

        return {
            data: ratings.map((r) => this.formatRating(r)),
            total,
        };
    }

    /**
     * THỐNG KÊ ĐÁNH GIÁ CỦA PHIM
     *
     * Sử dụng Prisma aggregate để tính:
     * - _avg.score: Điểm trung bình
     * - _count.score: Tổng số lượt đánh giá
     *
     * Kết quả VD: { averageScore: 4.2, totalRatings: 150 }
     */
    async getStats(movieId: string) {
        const stats = await this.prisma.rating.aggregate({
            where: { movieId },
            _avg: { rating: true },      // Tính trung bình rating
            _count: { rating: true },    // Đếm số lượt đánh giá
        });

        return {
            averageScore: stats._avg?.rating ? Math.round(stats._avg.rating * 10) / 10 : 0,
            totalRatings: typeof stats._count === 'object' ? (stats._count?.rating ?? 0) : 0,
        };
    }

    /**
     * XÓA ĐÁNH GIÁ
     * Kiểm tra tồn tại → 404
     * Xóa theo composite key (userId + movieId)
     */
    async deleteRating(userId: string, movieId: string) {
        const rating = await this.prisma.rating.findUnique({
            where: { userId_movieId: { userId, movieId } },
        });

        if (!rating) {
            throw new NotFoundException({
                code: 'RATING_NOT_FOUND',
                message: 'Rating not found',
            });
        }

        await this.prisma.rating.delete({
            where: { userId_movieId: { userId, movieId } },
        });

        return { success: true };
    }

    // ═══════════════════════════════════════════════
    // FORMAT HELPER
    // ═══════════════════════════════════════════════

    private formatRating(rating: any) {
        return {
            id: rating.id,
            userId: rating.userId,
            movieId: rating.movieId,
            score: rating.rating,
            comment: rating.comment,
            createdAt: rating.createdAt.toISOString(),
            updatedAt: rating.updatedAt.toISOString(),
            user: rating.user || null,
        };
    }
}
