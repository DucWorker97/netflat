/**
 * ===== ADMIN SERVICE - LOGIC QUẢN TRỊ HỆ THỐNG =====
 *
 * AdminService cung cấp các công cụ quản trị cho admin:
 *
 * - getDiagnostics()   → Kiểm tra sức khỏe hệ thống (health check)
 *   + Database (PostgreSQL): Test kết nối bằng SELECT 1
 *   + Redis: Test kết nối qua URL
 *   + S3/MinIO: Test kết nối bằng HeadBucket
 *
 * - getUsers()         → Danh sách user (delegate sang UsersService)
 * - toggleUserStatus() → Vô hiệu hóa/kích hoạt user
 *
 * Mục đích:
 * - Dashboard admin xem trạng thái hệ thống
 * - Nhanh chóng phát hiện lỗi kết nối infrastructure
 */

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from '../users/users.service';
import { S3Client, HeadBucketCommand } from '@aws-sdk/client-s3';
import Redis from 'ioredis';

@Injectable()
export class AdminService {
    private readonly logger = new Logger(AdminService.name);
    private s3: S3Client;
    private bucket: string;

    constructor(
        private prisma: PrismaService,
        private config: ConfigService,
        private usersService: UsersService,
    ) {
        this.bucket = this.config.get<string>('S3_BUCKET') || 'netflat-media';
        this.s3 = new S3Client({
            endpoint: this.config.get<string>('S3_ENDPOINT') || 'http://localhost:9002',
            region: this.config.get<string>('S3_REGION') || 'us-east-1',
            credentials: {
                accessKeyId: this.config.get<string>('S3_ACCESS_KEY') || 'minioadmin',
                secretAccessKey: this.config.get<string>('S3_SECRET_KEY') || 'minioadmin',
            },
            forcePathStyle: true,
        });
    }

    /**
     * KIỂM TRA SỨC KHỎE HỆ THỐNG (Diagnostics)
     *
     * Kiểm tra 3 thành phần infrastructure chính:
     * 1. Database (PostgreSQL): Chạy "SELECT 1" → xác nhận kết nối
     * 2. Redis: Kết nối qua URL, gọi PING → mong đợi "PONG"
     * 3. S3/MinIO: Gọi HeadBucket → xác nhận bucket tồn tại
     *
     * Trả về: { database, redis, s3 } - mỗi cái có status + latency
     * Status: "ok" (thành công) hoặc "error" (thất bại kèm message)
     *
     * Tất cả 3 check chạy SONG SONG (Promise.allSettled) để nhanh hơn.
     * Promise.allSettled: Luôn trả kết quả tất cả, không dừng khi 1 cái lỗi.
     */
    async getDiagnostics() {
        // Chạy song song 3 health check
        const [dbResult, redisResult, s3Result] = await Promise.allSettled([
            this.checkDatabase(),
            this.checkRedis(),
            this.checkS3(),
        ]);

        return {
            database: dbResult.status === 'fulfilled' ? dbResult.value : {
                status: 'error',
                message: (dbResult as PromiseRejectedResult).reason?.message,
            },
            redis: redisResult.status === 'fulfilled' ? redisResult.value : {
                status: 'error',
                message: (redisResult as PromiseRejectedResult).reason?.message,
            },
            s3: s3Result.status === 'fulfilled' ? s3Result.value : {
                status: 'error',
                message: (s3Result as PromiseRejectedResult).reason?.message,
            },
        };
    }

    /**
     * DANH SÁCH USER (Admin only)
     * Delegate sang UsersService.findAll()
     */
    async getUsers(page = 1, limit = 20) {
        return this.usersService.findAll(page, limit);
    }

    /**
     * VÔ HIỆU HÓA / KÍCH HOẠT USER (Admin only)
     * Delegate sang UsersService.toggleUserStatus()
     */
    async toggleUserStatus(userId: string, active: boolean) {
        return this.usersService.toggleUserStatus(userId, active);
    }

    // ═══════════════════════════════════════════════
    // HEALTH CHECK HELPERS
    // ═══════════════════════════════════════════════

    /**
     * KIỂM TRA DATABASE (PostgreSQL)
     *
     * Thực hiện query đơn giản "SELECT 1" để xác nhận:
     * - Kết nối database hoạt động
     * - Prisma client OK
     * - PostgreSQL đang chạy
     *
     * Đo latency (thời gian phản hồi) bằng performance.now()
     */
    private async checkDatabase(): Promise<{ status: string; latencyMs: number }> {
        const start = performance.now();
        await this.prisma.$queryRaw`SELECT 1`;
        const latencyMs = Math.round(performance.now() - start);
        return { status: 'ok', latencyMs };
    }

    /**
     * KIỂM TRA REDIS
     *
     * Tạo kết nối Redis tạm, gọi PING, đợi PONG.
     * Luôn đóng kết nối sau khi kiểm tra (finally).
     * Có timeout 5 giây (lazyConnect + connectTimeout).
     */
    private async checkRedis(): Promise<{ status: string; latencyMs: number }> {
        const redisUrl = this.config.get<string>('REDIS_URL') || 'redis://localhost:6379';
        const start = performance.now();

        // Tạo kết nối Redis tạm thời (lazyConnect: không kết nối ngay)
        const redis = new Redis(redisUrl, {
            lazyConnect: true,
            connectTimeout: 5000,     // Timeout 5 giây
            maxRetriesPerRequest: 0,  // Không retry (chỉ kiểm tra 1 lần)
        });

        try {
            await redis.connect();          // Kết nối
            const pong = await redis.ping(); // Gửi PING → mong đợi "PONG"
            const latencyMs = Math.round(performance.now() - start);

            if (pong !== 'PONG') {
                throw new Error(`Unexpected Redis response: ${pong}`);
            }

            return { status: 'ok', latencyMs };
        } finally {
            // LUÔN đóng kết nối Redis tạm (tránh rò rỉ kết nối)
            try { redis.disconnect(); } catch { /* bỏ qua */ }
        }
    }

    /**
     * KIỂM TRA S3/MINIO
     *
     * Gọi HeadBucket để xác nhận:
     * - S3/MinIO đang chạy
     * - Bucket tồn tại
     * - Credential (access key) hợp lệ
     */
    private async checkS3(): Promise<{ status: string; latencyMs: number }> {
        const start = performance.now();
        await this.s3.send(new HeadBucketCommand({ Bucket: this.bucket }));
        const latencyMs = Math.round(performance.now() - start);
        return { status: 'ok', latencyMs };
    }
}
