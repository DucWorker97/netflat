import {
    Injectable,
    BadRequestException,
    UnauthorizedException,
    ConflictException,
    HttpException,
    HttpStatus,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { UsersService } from '../users/users.service';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { User } from '@prisma/client';
import { assertStrongPassword, normalizeEmail } from '../common/utils/security';
import { SecurityConfig } from '../config/security.config';

interface TokenPayload {
    sub: string;
    email: string;
    role: string;
}

interface AuthTokens {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
}

@Injectable()
export class AuthService {
    private readonly security: SecurityConfig;

    constructor(
        private usersService: UsersService,
        private jwtService: JwtService,
        private prisma: PrismaService,
        private mailService: MailService,
        configService: ConfigService,
    ) {
        this.security = configService.getOrThrow<SecurityConfig>('security');
    }

    async register(dto: RegisterDto): Promise<{ user: User } & AuthTokens> {
        const email = normalizeEmail(dto.email);
        assertStrongPassword(dto.password);

        const existingUser = await this.usersService.findByEmail(email);
        if (existingUser) {
            throw new ConflictException({
                code: 'EMAIL_ALREADY_EXISTS',
                message: 'Email already registered',
            });
        }

        const passwordHash = await bcrypt.hash(dto.password, 10);
        const user = await this.usersService.create({
            email,
            passwordHash,
        });

        const tokens = await this.generateTokens(user);
        await this.saveRefreshToken(user.id, tokens.refreshToken);

        return { user, ...tokens };
    }

    async login(dto: LoginDto): Promise<{ user: User } & AuthTokens> {
        const email = normalizeEmail(dto.email);

        const user = await this.usersService.findByEmail(email);
        const isPasswordValid = user ? await bcrypt.compare(dto.password, user.passwordHash) : false;

        if (!user || !isPasswordValid) {
            throw new UnauthorizedException({
                code: 'AUTH_INVALID_CREDENTIALS',
                message: 'Invalid email or password',
            });
        }

        // Check if account is disabled
        if (!user.isActive) {
            throw new HttpException({
                code: 'ACCOUNT_DISABLED',
                message: 'Your account has been disabled. Contact support for assistance.',
                disabledAt: user.disabledAt?.toISOString(),
            }, HttpStatus.FORBIDDEN);
        }

        const tokens = await this.generateTokens(user);
        await this.saveRefreshToken(user.id, tokens.refreshToken);

        return { user, ...tokens };
    }

    async refresh(refreshToken: string): Promise<{ user: User } & AuthTokens> {
        if (!refreshToken) {
            throw new BadRequestException({
                code: 'AUTH_REFRESH_TOKEN_REQUIRED',
                message: 'Refresh token is required',
            });
        }

        const tokenHash = this.hashToken(refreshToken);

        const storedToken = await this.prisma.refreshToken.findFirst({
            where: {
                token: tokenHash,
                revoked: false,
                expiresAt: { gt: new Date() },
            },
            include: { user: true },
        });

        if (!storedToken) {
            throw new UnauthorizedException({
                code: 'AUTH_INVALID_REFRESH_TOKEN',
                message: 'Invalid or expired refresh token',
            });
        }

        // Revoke old token (token rotation)
        await this.prisma.refreshToken.update({
            where: { id: storedToken.id },
            data: { revoked: true },
        });

        // Generate new tokens
        const tokens = await this.generateTokens(storedToken.user);
        await this.saveRefreshToken(storedToken.user.id, tokens.refreshToken);

        return { user: storedToken.user, ...tokens };
    }

    async logout(refreshToken: string): Promise<void> {
        if (!refreshToken) {
            return;
        }

        const tokenHash = this.hashToken(refreshToken);

        await this.prisma.refreshToken.updateMany({
            where: { token: tokenHash },
            data: { revoked: true },
        });
    }

    async forgotPassword(email: string): Promise<void> {
        const user = await this.usersService.findByEmail(email);
        // Always return success to prevent email enumeration
        if (!user) return;

        // Invalidate existing reset tokens
        await this.prisma.passwordResetToken.updateMany({
            where: { userId: user.id, used: false },
            data: { used: true },
        });

        // Generate secure token
        const rawToken = crypto.randomBytes(48).toString('hex');
        const tokenHash = this.hashToken(rawToken);

        await this.prisma.passwordResetToken.create({
            data: {
                userId: user.id,
                token: tokenHash,
                expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
            },
        });

        await this.mailService.sendPasswordResetEmail(user.email, rawToken);
    }

    async resetPassword(token: string, newPassword: string): Promise<void> {
        assertStrongPassword(newPassword);

        const tokenHash = this.hashToken(token);

        const resetToken = await this.prisma.passwordResetToken.findFirst({
            where: {
                token: tokenHash,
                used: false,
                expiresAt: { gt: new Date() },
            },
        });

        if (!resetToken) {
            throw new BadRequestException({
                code: 'INVALID_RESET_TOKEN',
                message: 'Invalid or expired reset token',
            });
        }

        const passwordHash = await bcrypt.hash(newPassword, 10);

        await this.prisma.$transaction([
            this.prisma.user.update({
                where: { id: resetToken.userId },
                data: { passwordHash },
            }),
            this.prisma.passwordResetToken.update({
                where: { id: resetToken.id },
                data: { used: true },
            }),
            // Revoke all refresh tokens for security
            this.prisma.refreshToken.updateMany({
                where: { userId: resetToken.userId, revoked: false },
                data: { revoked: true },
            }),
        ]);
    }

    private async generateTokens(user: User): Promise<AuthTokens> {
        const payload: TokenPayload = {
            sub: user.id,
            email: user.email,
            role: user.role,
        };

        const accessToken = this.jwtService.sign(payload);
        const refreshToken = crypto.randomBytes(64).toString('hex');
        const expiresIn = this.security.auth.jwt.accessTtlSeconds;

        return { accessToken, refreshToken, expiresIn };
    }

    private async saveRefreshToken(userId: string, refreshToken: string): Promise<void> {
        const tokenHash = this.hashToken(refreshToken);
        const expiresInMs = this.security.auth.jwt.refreshTtlSeconds * 1000;

        await this.prisma.refreshToken.create({
            data: {
                userId,
                token: tokenHash,
                expiresAt: new Date(Date.now() + expiresInMs),
            },
        });
    }

    private hashToken(token: string): string {
        return crypto.createHash('sha256').update(token).digest('hex');
    }
}
