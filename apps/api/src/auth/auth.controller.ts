import {
    Controller,
    Post,
    Get,
    Body,
    HttpCode,
    HttpStatus,
    UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshDto } from './dto/refresh.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { User } from '@prisma/client';

@Controller('auth')
export class AuthController {
    constructor(private authService: AuthService) { }

    @Post('register')
    @Throttle({ default: { ttl: 60_000, limit: 5 } })
    @HttpCode(HttpStatus.CREATED)
    async register(@Body() dto: RegisterDto) {
        const result = await this.authService.register(dto);
        return {
            data: {
                accessToken: result.accessToken,
                refreshToken: result.refreshToken,
                expiresIn: result.expiresIn,
                user: this.formatUser(result.user),
            },
        };
    }

    @Post('login')
    @Throttle({ default: { ttl: 60_000, limit: 10 } })
    @HttpCode(HttpStatus.OK)
    async login(@Body() dto: LoginDto) {
        const result = await this.authService.login(dto);
        return {
            data: {
                accessToken: result.accessToken,
                refreshToken: result.refreshToken,
                expiresIn: result.expiresIn,
                user: this.formatUser(result.user),
            },
        };
    }

    @Post('refresh')
    @HttpCode(HttpStatus.OK)
    async refresh(@Body() dto: RefreshDto) {
        const result = await this.authService.refresh(dto.refreshToken);
        return {
            data: {
                accessToken: result.accessToken,
                refreshToken: result.refreshToken,
                expiresIn: result.expiresIn,
                user: this.formatUser(result.user),
            },
        };
    }

    @Post('logout')
    @UseGuards(JwtAuthGuard)
    @HttpCode(HttpStatus.OK)
    async logout(@Body() dto: RefreshDto) {
        await this.authService.logout(dto.refreshToken);
        return {
            data: {
                message: 'Logged out successfully',
            },
        };
    }

    @Post('forgot-password')
    @Throttle({ default: { ttl: 60_000, limit: 3 } })
    @HttpCode(HttpStatus.OK)
    async forgotPassword(@Body() dto: ForgotPasswordDto) {
        await this.authService.forgotPassword(dto.email);
        return {
            data: {
                message: 'If an account with that email exists, a reset link has been sent.',
            },
        };
    }

    @Post('reset-password')
    @HttpCode(HttpStatus.OK)
    async resetPassword(@Body() dto: ResetPasswordDto) {
        await this.authService.resetPassword(dto.token, dto.newPassword);
        return {
            data: {
                message: 'Password reset successfully. Please log in with your new password.',
            },
        };
    }

    @Get('me')
    @UseGuards(JwtAuthGuard)
    async getMe(@CurrentUser() user: User) {
        return {
            data: this.formatUser(user),
        };
    }

    private formatUser(user: User) {
        return {
            id: user.id,
            email: user.email,
            displayName: user.displayName,
            avatarUrl: user.avatarUrl,
            role: user.role,
            isActive: user.isActive,
            createdAt: user.createdAt.toISOString(),
        };
    }
}
