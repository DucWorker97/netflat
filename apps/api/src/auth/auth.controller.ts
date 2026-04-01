/**
 * ===== AUTH CONTROLLER - ĐIỀU KHIỂN CÁC ENDPOINT XÁC THỰC =====
 *
 * AuthController định nghĩa các API endpoint cho hệ thống xác thực:
 *
 * POST /api/auth/register       → Đăng ký tài khoản mới
 * POST /api/auth/login          → Đăng nhập
 * POST /api/auth/refresh        → Làm mới access token
 * POST /api/auth/logout         → Đăng xuất (yêu cầu JWT)
 * POST /api/auth/forgot-password → Yêu cầu đặt lại mật khẩu
 * POST /api/auth/reset-password  → Đặt lại mật khẩu bằng token
 * GET  /api/auth/me             → Lấy thông tin user hiện tại (yêu cầu JWT)
 *
 * Rate Limiting (giới hạn tốc độ):
 * - Register: 5 request / 60 giây (chống tạo tài khoản spam)
 * - Login: 10 request / 60 giây (chống brute force password)
 * - Forgot password: 3 request / 60 giây (chống spam email)
 */

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

@Controller('auth') // Prefix route: /api/auth/*
export class AuthController {
    constructor(private authService: AuthService) { }

    /**
     * ĐĂNG KÝ - POST /api/auth/register
     *
     * Body: { email, password }
     * Trả về: { data: { accessToken, refreshToken, expiresIn, user } }
     *
     * @Throttle: Giới hạn 5 request / 60 giây cho endpoint này
     * @HttpCode(201): Trả mã HTTP 201 Created (mặc định POST trả 201)
     */
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

    /**
     * ĐĂNG NHẬP - POST /api/auth/login
     *
     * Body: { email, password }
     * Trả về: { data: { accessToken, refreshToken, expiresIn, user } }
     *
     * @Throttle: Giới hạn 10 request / 60 giây (chống brute force)
     * @HttpCode(200): Đăng nhập thành công trả 200 OK (không phải 201)
     */
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

    /**
     * LÀM MỚI TOKEN - POST /api/auth/refresh
     *
     * Body: { refreshToken }
     * Trả về: Cặp token mới (access + refresh)
     *
     * Client gọi API này khi access token hết hạn
     * → Nhận access token mới mà không cần đăng nhập lại
     */
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

    /**
     * ĐĂNG XUẤT - POST /api/auth/logout
     *
     * Body: { refreshToken }
     * Yêu cầu: JWT hợp lệ trong header Authorization
     *
     * Thu hồi refresh token → không thể dùng để refresh nữa
     * Access token hiện tại vẫn hoạt động đến khi tự hết hạn
     */
    @Post('logout')
    @UseGuards(JwtAuthGuard) // Yêu cầu đã đăng nhập
    @HttpCode(HttpStatus.OK)
    async logout(@Body() dto: RefreshDto) {
        await this.authService.logout(dto.refreshToken);
        return {
            data: {
                message: 'Logged out successfully',
            },
        };
    }

    /**
     * QUÊN MẬT KHẨU - POST /api/auth/forgot-password
     *
     * Body: { email }
     * Luôn trả thành công (chống email enumeration)
     *
     * @Throttle: Giới hạn 3 request / 60 giây (chống spam email)
     */
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

    /**
     * ĐẶT LẠI MẬT KHẨU - POST /api/auth/reset-password
     *
     * Body: { token, newPassword }
     * Token được lấy từ link trong email quên mật khẩu
     */
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

    /**
     * LẤY THÔNG TIN USER HIỆN TẠI - GET /api/auth/me
     *
     * Yêu cầu: JWT hợp lệ trong header Authorization
     * Trả về: Thông tin user đang đăng nhập
     *
     * @CurrentUser() decorator lấy user từ request.user
     * (đã được JwtStrategy gắn vào sau khi giải mã JWT)
     */
    @Get('me')
    @UseGuards(JwtAuthGuard) // Yêu cầu JWT hợp lệ
    async getMe(@CurrentUser() user: User) {
        return {
            data: this.formatUser(user),
        };
    }

    // ═══════════════════════════════════════════════
    // HÀM TIỆN ÍCH (Private Helper)
    // ═══════════════════════════════════════════════

    /**
     * Định dạng thông tin user trước khi trả về client.
     * Loại bỏ các trường nhạy cảm (passwordHash, timestamps nội bộ)
     * và chỉ trả về các trường cần thiết.
     */
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
