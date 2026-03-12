import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { User, UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { assertStrongPassword, normalizeEmail } from '../common/utils/security';

interface CreateUserData {
    email: string;
    passwordHash: string;
    role?: UserRole;
}

@Injectable()
export class UsersService {
    constructor(private prisma: PrismaService) { }

    async findById(id: string): Promise<User | null> {
        return this.prisma.user.findUnique({ where: { id } });
    }

    async findByEmail(email: string): Promise<User | null> {
        return this.prisma.user.findUnique({ where: { email: normalizeEmail(email) } });
    }

    async create(data: CreateUserData): Promise<User> {
        return this.prisma.user.create({
            data: {
                email: normalizeEmail(data.email),
                passwordHash: data.passwordHash,
                role: data.role || UserRole.viewer,
            },
        });
    }

    async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void> {
        const user = await this.prisma.user.findUnique({ where: { id: userId } });

        if (!user) {
            throw new BadRequestException({
                code: 'USER_NOT_FOUND',
                message: 'User not found',
            });
        }

        const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);
        if (!isMatch) {
            throw new BadRequestException({
                code: 'INVALID_PASSWORD',
                message: 'Current password is incorrect',
            });
        }

        assertStrongPassword(newPassword);

        const newHash = await bcrypt.hash(newPassword, 10);
        await this.prisma.$transaction([
            this.prisma.user.update({
                where: { id: userId },
                data: { passwordHash: newHash },
            }),
            this.prisma.refreshToken.updateMany({
                where: { userId, revoked: false },
                data: { revoked: true },
            }),
        ]);
    }

    async getProfile(userId: string) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                email: true,
                displayName: true,
                avatarUrl: true,
                role: true,
                isActive: true,
                createdAt: true,
                _count: {
                    select: {
                        favorites: true,
                        ratings: true,
                    }
                }
            }
        });

        if (!user) {
            throw new BadRequestException({
                code: 'USER_NOT_FOUND',
                message: 'User not found',
            });
        }

        return {
            id: user.id,
            email: user.email,
            displayName: user.displayName,
            avatarUrl: user.avatarUrl,
            role: user.role,
            isActive: user.isActive,
            createdAt: user.createdAt.toISOString(),
            stats: {
                favorites: user._count.favorites,
                ratings: user._count.ratings,
            }
        };
    }

    async updateProfile(userId: string, data: { displayName?: string; avatarUrl?: string }) {
        const user = await this.prisma.user.findUnique({ where: { id: userId } });
        if (!user) {
            throw new NotFoundException({
                code: 'USER_NOT_FOUND',
                message: 'User not found',
            });
        }

        const updated = await this.prisma.user.update({
            where: { id: userId },
            data: {
                displayName: data.displayName !== undefined ? data.displayName : undefined,
                avatarUrl: data.avatarUrl !== undefined ? data.avatarUrl : undefined,
            },
        });

        return {
            id: updated.id,
            email: updated.email,
            displayName: updated.displayName,
            avatarUrl: updated.avatarUrl,
            role: updated.role,
        };
    }

    /**
     * Disable a user account (admin action)
     */
    async disableUser(userId: string, reason?: string): Promise<void> {
        const user = await this.prisma.user.findUnique({ where: { id: userId } });
        if (!user) {
            throw new NotFoundException({
                code: 'USER_NOT_FOUND',
                message: 'User not found',
            });
        }

        await this.prisma.$transaction([
            this.prisma.user.update({
                where: { id: userId },
                data: {
                    isActive: false,
                    disabledAt: new Date(),
                    disabledReason: reason || null,
                },
            }),
            // Revoke all active refresh tokens
            this.prisma.refreshToken.updateMany({
                where: { userId, revoked: false },
                data: { revoked: true },
            }),
        ]);
    }

    /**
     * Re-enable a disabled user account (admin action)
     */
    async enableUser(userId: string): Promise<void> {
        const user = await this.prisma.user.findUnique({ where: { id: userId } });
        if (!user) {
            throw new NotFoundException({
                code: 'USER_NOT_FOUND',
                message: 'User not found',
            });
        }

        await this.prisma.user.update({
            where: { id: userId },
            data: {
                isActive: true,
                disabledAt: null,
                disabledReason: null,
            },
        });
    }
}
