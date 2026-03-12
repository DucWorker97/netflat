import { Injectable, Logger, BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { S3Client, HeadBucketCommand } from '@aws-sdk/client-s3';
import * as bcrypt from 'bcrypt';
import { UserRole } from '@prisma/client';
import { assertStrongPassword, normalizeEmail } from '../common/utils/security';

@Injectable()
export class AdminService {
    private readonly logger = new Logger(AdminService.name);

    constructor(
        private readonly prisma: PrismaService,
        private readonly config: ConfigService,
    ) { }

    async getDiagnostics() {
        const diagnostics: Record<string, unknown> = {
            timestamp: new Date().toISOString(),
            database: { status: 'unknown' },
            redis: { status: 'unknown' },
            storage: { status: 'unknown' },
        };

        // Check database
        try {
            await this.prisma.$queryRaw`SELECT 1`;
            diagnostics.database = { status: 'connected' };
        } catch (err) {
            diagnostics.database = { status: 'error', message: String(err).slice(0, 200) };
        }

        // Check Redis
        try {
            const redisUrl = this.config.get<string>('REDIS_URL') || 'redis://localhost:6379';
            const redis = new Redis(redisUrl);
            const pong = await redis.ping();
            await redis.quit();
            diagnostics.redis = { status: pong === 'PONG' ? 'connected' : 'error' };
        } catch (err) {
            diagnostics.redis = { status: 'error', message: String(err).slice(0, 200) };
        }

        // Check S3/MinIO
        try {
            const s3Client = new S3Client({
                endpoint: this.config.get<string>('S3_ENDPOINT'),
                region: this.config.get<string>('S3_REGION') || 'us-east-1',
                credentials: {
                    accessKeyId: this.config.get<string>('S3_ACCESS_KEY') || '',
                    secretAccessKey: this.config.get<string>('S3_SECRET_KEY') || '',
                },
                forcePathStyle: true,
            });

            await s3Client.send(
                new HeadBucketCommand({
                    Bucket: this.config.get<string>('S3_BUCKET') || 'netflat-media',
                })
            );
            diagnostics.storage = { status: 'connected', bucket: this.config.get<string>('S3_BUCKET') };
        } catch (err) {
            diagnostics.storage = { status: 'error', message: String(err).slice(0, 200) };
        }

        return diagnostics;
    }

    /**
     * Get users with pagination and filtering
     */
    async getUsers(options: {
        page?: number;
        limit?: number;
        search?: string;
        role?: string;
    }) {
        const page = options.page || 1;
        const limit = Math.min(options.limit || 10, 100);
        const skip = (page - 1) * limit;

        const where: any = {};

        if (options.search) {
            where.email = { contains: options.search, mode: 'insensitive' };
        }

        if (options.role && (options.role === 'admin' || options.role === 'viewer')) {
            where.role = options.role;
        }

        const [users, total] = await Promise.all([
            this.prisma.user.findMany({
                where,
                select: {
                    id: true,
                    email: true,
                    role: true,
                    isActive: true,
                    disabledReason: true,
                    createdAt: true,
                    updatedAt: true,
                    _count: {
                        select: {
                            favorites: true,
                            ratings: true,
                        }
                    }
                },
                orderBy: { createdAt: 'desc' },
                skip,
                take: limit,
            }),
            this.prisma.user.count({ where }),
        ]);

        return {
            data: users.map((user: typeof users[number]) => ({
                id: user.id,
                email: user.email,
                role: user.role,
                isActive: user.isActive,
                disabledReason: user.disabledReason,
                createdAt: user.createdAt,
                lastLoginAt: user.updatedAt, // Using updatedAt as proxy
                stats: {
                    favorites: user._count.favorites,
                    ratings: user._count.ratings,
                }
            })),
            meta: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            }
        };
    }

    /**
     * Create a new user (admin only action)
     */
    async createUser(params: { email: string; password: string; role?: UserRole }) {
        const email = normalizeEmail(params.email);
        assertStrongPassword(params.password);

        const existing = await this.prisma.user.findUnique({ where: { email } });
        if (existing) {
            throw new ConflictException({
                code: 'EMAIL_ALREADY_EXISTS',
                message: 'Email already registered',
            });
        }

        const passwordHash = await bcrypt.hash(params.password, 10);
        const user = await this.prisma.user.create({
            data: {
                email,
                passwordHash,
                role: params.role || UserRole.viewer,
            },
            select: {
                id: true,
                email: true,
                role: true,
                createdAt: true,
                updatedAt: true,
            },
        });

        return user;
    }

    /**
     * Update user fields (admin only action)
     */
    async updateUser(params: { userId: string; email?: string; role?: UserRole; password?: string }) {
        const { userId, email, role, password } = params;

        if (!email && !role && !password) {
            throw new BadRequestException({
                code: 'NO_FIELDS',
                message: 'At least one field must be provided',
            });
        }

        let normalizedEmail = email ? normalizeEmail(email) : undefined;

        if (normalizedEmail) {
            const existing = await this.prisma.user.findUnique({ where: { email: normalizedEmail } });
            if (existing && existing.id !== userId) {
                throw new ConflictException({
                    code: 'EMAIL_ALREADY_EXISTS',
                    message: 'Email already registered',
                });
            }
        }

        const data: Record<string, unknown> = {};
        if (normalizedEmail) data.email = normalizedEmail;
        if (role) data.role = role;
        if (password) {
            assertStrongPassword(password);
            data.passwordHash = await bcrypt.hash(password, 10);
        }

        const user = await this.prisma.user.update({
            where: { id: userId },
            data,
            select: {
                id: true,
                email: true,
                role: true,
                createdAt: true,
                updatedAt: true,
            },
        });

        if (password) {
            await this.prisma.refreshToken.updateMany({
                where: { userId, revoked: false },
                data: { revoked: true },
            });
        }

        return user;
    }

    /**
     * Delete user (admin only action)
     */
    async deleteUser(userId: string) {
        const existing = await this.prisma.user.findUnique({ where: { id: userId } });
        if (!existing) {
            throw new NotFoundException({
                code: 'USER_NOT_FOUND',
                message: 'User not found',
            });
        }

        await this.prisma.user.delete({ where: { id: userId } });
        return { id: userId };
    }
}

