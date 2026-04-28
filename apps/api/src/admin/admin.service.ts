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

import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma, SubscriptionStatus } from '@prisma/client';
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

    async getBillingStats() {
        const [totalRevenue, completedPayments, recentPayments, subscriptionCounts] = await Promise.all([
            this.prisma.payment.aggregate({
                where: { status: 'completed' },
                _sum: { amount: true },
            }),
            this.prisma.payment.findMany({
                where: { status: 'completed' },
                include: {
                    subscription: {
                        include: { plan: true },
                    },
                },
            }),
            this.prisma.payment.findMany({
                where: { status: 'completed' },
                include: {
                    user: {
                        select: {
                            id: true,
                            email: true,
                            displayName: true,
                        },
                    },
                    subscription: {
                        include: { plan: true },
                    },
                },
                orderBy: { createdAt: 'desc' },
                take: 10,
            }),
            this.prisma.subscription.groupBy({
                by: ['planId', 'status'],
                _count: { id: true },
            }),
        ]);

        const planIds = [...new Set(subscriptionCounts.map((item) => item.planId))];
        const plans = await this.prisma.subscriptionPlan.findMany({
            where: { id: { in: planIds } },
        });
        const planById = new Map(plans.map((plan) => [plan.id, plan]));

        const revenueByPlan = completedPayments.reduce<Record<string, {
            planName: string;
            displayName: string;
            amount: number;
            payments: number;
        }>>((acc, payment) => {
            const plan = payment.subscription.plan;
            acc[plan.name] ??= {
                planName: plan.name,
                displayName: plan.displayName,
                amount: 0,
                payments: 0,
            };
            acc[plan.name].amount += payment.amount;
            acc[plan.name].payments += 1;
            return acc;
        }, {});

        return {
            totalRevenue: totalRevenue._sum.amount ?? 0,
            revenueByPlan: Object.values(revenueByPlan),
            subscriptionCounts: subscriptionCounts.map((item) => {
                const plan = planById.get(item.planId);
                return {
                    planId: item.planId,
                    planName: plan?.name ?? 'unknown',
                    displayName: plan?.displayName ?? 'Unknown',
                    status: item.status,
                    count: item._count.id,
                };
            }),
            recentPayments,
        };
    }

    async getSubscriptions(params: {
        page?: number;
        limit?: number;
        planName?: string;
        status?: string;
    }) {
        const page = Math.max(1, params.page || 1);
        const limit = Math.min(100, Math.max(1, params.limit || 20));
        const where: Prisma.SubscriptionWhereInput = {};

        if (params.status) {
            if (!Object.values(SubscriptionStatus).includes(params.status as SubscriptionStatus)) {
                throw new BadRequestException({
                    code: 'INVALID_SUBSCRIPTION_STATUS',
                    message: 'Invalid subscription status',
                });
            }
            where.status = params.status as SubscriptionStatus;
        }

        if (params.planName) {
            where.plan = { name: params.planName };
        }

        const [items, total] = await Promise.all([
            this.prisma.subscription.findMany({
                where,
                include: {
                    user: {
                        select: {
                            id: true,
                            email: true,
                            displayName: true,
                            isActive: true,
                        },
                    },
                    plan: true,
                },
                orderBy: { updatedAt: 'desc' },
                skip: (page - 1) * limit,
                take: limit,
            }),
            this.prisma.subscription.count({ where }),
        ]);

        return {
            data: items,
            meta: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
                hasNext: page * limit < total,
                hasPrev: page > 1,
            },
        };
    }

    async overrideUserPlan(userId: string, planName: string, reason: string) {
        const trimmedReason = reason?.trim();
        if (!trimmedReason) {
            throw new BadRequestException({
                code: 'OVERRIDE_REASON_REQUIRED',
                message: 'Override reason is required',
            });
        }

        const [user, plan] = await Promise.all([
            this.prisma.user.findUnique({
                where: { id: userId },
                select: {
                    id: true,
                    email: true,
                    displayName: true,
                },
            }),
            this.prisma.subscriptionPlan.findFirst({
                where: {
                    name: planName,
                    isActive: true,
                },
            }),
        ]);

        if (!user) {
            throw new NotFoundException({
                code: 'USER_NOT_FOUND',
                message: 'User not found',
            });
        }

        if (!plan) {
            throw new NotFoundException({
                code: 'PLAN_NOT_FOUND',
                message: 'Subscription plan not found',
            });
        }

        const now = new Date();
        const endDate = new Date(now);
        endDate.setUTCFullYear(endDate.getUTCFullYear() + 1);

        const subscription = await this.prisma.subscription.upsert({
            where: { userId },
            create: {
                userId,
                planId: plan.id,
                status: SubscriptionStatus.active,
                startDate: now,
                endDate,
                autoRenew: plan.name === 'free',
            },
            update: {
                planId: plan.id,
                status: SubscriptionStatus.active,
                startDate: now,
                endDate,
                autoRenew: plan.name === 'free',
            },
            include: {
                user: {
                    select: {
                        id: true,
                        email: true,
                        displayName: true,
                    },
                },
                plan: true,
            },
        });

        this.logger.log(
            `Admin override plan for ${user.email}: ${plan.name}. Reason: ${trimmedReason}`,
        );

        return subscription;
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
