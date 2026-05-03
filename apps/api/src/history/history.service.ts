/**
 * ===== HISTORY SERVICE - LOGIC LỊCH SỬ & TIẾN TRÌNH XEM PHIM =====
 *
 * HistoryService theo dõi lịch sử và tiến trình xem phim của người dùng:
 *
 * - upsertProgress()     → Lưu/cập nhật tiến trình xem (giây đã xem)
 * - getProgress()        → Lấy tiến trình xem của phim cụ thể
 * - getHistory()         → Lịch sử xem (phân trang)
 * - getContinueWatching() → Danh sách "tiếp tục xem" (chưa hoàn thành)
 * - removeHistory()      → Xóa lịch sử xem
 *
 * Cơ chế "Upsert" (Update or Insert):
 * - Nếu chưa có record → tạo mới (insert)
 * - Nếu đã có record → cập nhật giây đã xem (update)
 * → Sử dụng Prisma upsert với composite key (userId + movieId)
 *
 * Đánh dấu "hoàn thành":
 * - Khi progressSeconds >= 90% * durationSeconds → completed = true
 */

import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { normalizeS3AssetUrl } from '../common/utils/storage-url';

@Injectable()
export class HistoryService {
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
     * LƯU / CẬP NHẬT TIẾN TRÌNH XEM (Upsert)
     *
     * Frontend gửi progressSeconds (giây đã xem) định kỳ (VD: mỗi 10 giây).
     *
     * Luồng xử lý:
     * 1. Kiểm tra phim tồn tại → 404
     * 2. Tính toán completed: đã xem ≥ 90% thời lượng?
     * 3. Upsert: tạo mới hoặc cập nhật record WatchHistory
     *    - create: Nếu user chưa từng xem phim này
     *    - update: Nếu đã có record → cập nhật progressSeconds
     */
    async upsertProgress(userId: string, movieId: string, progressSeconds: number) {
        // Kiểm tra phim tồn tại
        const movie = await this.prisma.movie.findUnique({ where: { id: movieId } });
        if (!movie) {
            throw new NotFoundException({
                code: 'MOVIE_NOT_FOUND',
                message: 'Movie not found',
            });
        }

        // Tính toán: đã hoàn thành 90% thời lượng phim chưa?
        const duration = movie.durationSeconds || 0;
        const completed = duration > 0 && progressSeconds >= duration * 0.9;

        // Upsert: tạo mới hoặc cập nhật
        // Composite key: userId + movieId (mỗi user chỉ có 1 record cho mỗi phim)
        const history = await this.prisma.watchHistory.upsert({
            where: {
                userId_movieId: { userId, movieId },
            },
            create: {
                userId,
                movieId,
                progressSeconds,
                completed,
            },
            update: {
                progressSeconds,
                completed,
                updatedAt: new Date(), // Cập nhật thời gian xem gần nhất
            },
        });

        return {
            movieId,
            progressSeconds: history.progressSeconds,
            completed: history.completed,
            updatedAt: history.updatedAt.toISOString(),
        };
    }

    /**
     * LẤY TIẾN TRÌNH XEM CỦA MỘT PHIM CỤ THỂ
     * Trả về: { progressSeconds, completed, updatedAt }
     * Nếu chưa xem → trả giá trị mặc định (0, false, null)
     */
    async getProgress(userId: string, movieId: string) {
        const history = await this.prisma.watchHistory.findUnique({
            where: { userId_movieId: { userId, movieId } },
        });

        if (!history) {
            return {
                movieId,
                progressSeconds: 0,
                completed: false,
                updatedAt: null,
            };
        }

        return {
            movieId,
            progressSeconds: history.progressSeconds,
            completed: history.completed,
            updatedAt: history.updatedAt.toISOString(),
        };
    }

    /**
     * LỊCH SỬ XEM (có phân trang)
     *
     * Trả về danh sách phim đã xem, sắp xếp theo thời gian xem gần nhất.
     * Include thông tin phim kèm theo (join với bảng Movie).
     */
    async getHistory(userId: string, page = 1, limit = 20) {
        const skip = (page - 1) * limit;

        const [items, total] = await Promise.all([
            this.prisma.watchHistory.findMany({
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
                orderBy: { updatedAt: 'desc' }, // Xem gần nhất lên trước
            }),
            this.prisma.watchHistory.count({ where: { userId } }),
        ]);

        return {
            data: items.map((h) => ({
                id: h.id,
                movieId: h.movieId,
                progressSeconds: h.progressSeconds,
                completed: h.completed,
                updatedAt: h.updatedAt.toISOString(),
                movie: h.movie ? {
                    id: h.movie.id,
                    title: h.movie.title,
                    posterUrl: normalizeS3AssetUrl(h.movie.posterUrl, this.s3PublicBaseUrl, this.bucket),
                    durationSeconds: h.movie.durationSeconds,
                } : null,
            })),
            total,
        };
    }

    /**
     * DANH SÁCH "TIẾP TỤC XEM" (Continue Watching)
     *
     * Lấy các phim user đã xem nhưng CHƯA hoàn thành (completed = false).
     * Dùng cho section "Continue Watching" trên trang chủ.
     * Giới hạn: 10 phim gần đây nhất.
     */
    async getContinueWatching(userId: string) {
        const items = await this.prisma.watchHistory.findMany({
            where: {
                userId,
                completed: false,          // Chỉ lấy phim chưa xem xong
                progressSeconds: { gt: 0 }, // Đã xem ít nhất vài giây
            },
            include: {
                movie: true,
            },
            orderBy: { updatedAt: 'desc' }, // Gần nhất trước
            take: 10,                        // Tối đa 10 phim
        });

        return items.map((h) => ({
            movieId: h.movieId,
            progressSeconds: h.progressSeconds,
            updatedAt: h.updatedAt.toISOString(),
            movie: h.movie ? {
                id: h.movie.id,
                title: h.movie.title,
                posterUrl: normalizeS3AssetUrl(h.movie.posterUrl, this.s3PublicBaseUrl, this.bucket),
                durationSeconds: h.movie.durationSeconds,
            } : null,
        }));
    }

    /**
     * XÓA LỊCH SỬ XEM
     * Xóa record WatchHistory theo composite key (userId + movieId)
     */
    async removeHistory(userId: string, movieId: string) {
        const history = await this.prisma.watchHistory.findUnique({
            where: { userId_movieId: { userId, movieId } },
        });

        if (!history) {
            throw new NotFoundException({
                code: 'HISTORY_NOT_FOUND',
                message: 'Watch history not found',
            });
        }

        await this.prisma.watchHistory.delete({
            where: { userId_movieId: { userId, movieId } },
        });

        return { success: true };
    }
}
