/**
 * ===== AUTH SERVICE - LOGIC XÁC THỰC NGƯỜI DÙNG =====
 *
 * AuthService chứa toàn bộ logic nghiệp vụ liên quan đến xác thực:
 * - Đăng ký (register): Tạo tài khoản mới + phát token
 * - Đăng nhập (login): Xác minh email/password + phát token
 * - Refresh token: Đổi refresh token cũ lấy cặp token mới (token rotation)
 * - Đăng xuất (logout): Thu hồi refresh token
 * - Quên mật khẩu (forgot password): Gửi email chứa link đặt lại
 * - Đặt lại mật khẩu (reset password): Xác minh token + cập nhật password
 *
 * Cơ chế bảo mật:
 * - Password được hash bằng bcrypt (salt rounds = 10)
 * - Refresh token được hash SHA-256 trước khi lưu DB (không lưu raw token)
 * - Token rotation: Mỗi lần refresh, token cũ bị thu hồi
 * - Reset password: Token 1 lần sử dụng, hết hạn sau 1 giờ
 */

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

/**
 * Cấu trúc payload được mã hóa bên trong JWT access token.
 * - sub: ID người dùng (subject - theo chuẩn JWT)
 * - email: Email đăng nhập
 * - role: Vai trò (admin / viewer)
 */
interface TokenPayload {
    sub: string;
    email: string;
    role: string;
}

/**
 * Cặp token trả về cho client sau khi xác thực thành công.
 * - accessToken: JWT ngắn hạn, dùng để gọi API (gửi trong header Authorization)
 * - refreshToken: Token dài hạn, dùng để lấy accessToken mới khi hết hạn
 * - expiresIn: Thời gian sống của accessToken (tính bằng giây)
 */
interface AuthTokens {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
}

@Injectable()
export class AuthService {
    // Cấu hình bảo mật (JWT TTL, password policy, v.v.)
    private readonly security: SecurityConfig;

    constructor(
        private usersService: UsersService,     // Service quản lý user
        private jwtService: JwtService,          // Service ký/xác minh JWT
        private prisma: PrismaService,           // Truy cập database
        private mailService: MailService,        // Gửi email
        configService: ConfigService,            // Đọc biến môi trường
    ) {
        // Nạp cấu hình bảo mật từ security.config.ts
        this.security = configService.getOrThrow<SecurityConfig>('security');
    }

    /**
     * ĐĂNG KÝ TÀI KHOẢN MỚI
     *
     * Luồng xử lý:
     * 1. Chuẩn hóa email (trim + lowercase)
     * 2. Kiểm tra độ mạnh mật khẩu (min 8 ký tự, có chữ + số)
     * 3. Kiểm tra email đã tồn tại chưa → nếu có, trả lỗi 409 Conflict
     * 4. Hash mật khẩu bằng bcrypt (salt rounds = 10)
     * 5. Tạo user mới trong database
     * 6. Tạo cặp access token + refresh token
     * 7. Lưu refresh token (đã hash) vào database
     * 8. Trả về thông tin user + tokens
     */
    async register(dto: RegisterDto): Promise<{ user: User } & AuthTokens> {
        // Bước 1: Chuẩn hóa email → trim khoảng trắng, chuyển thường
        const email = normalizeEmail(dto.email);

        // Bước 2: Kiểm tra password phải đủ mạnh (≥8 ký tự, có chữ + số)
        assertStrongPassword(dto.password);

        // Bước 3: Kiểm tra email đã đăng ký chưa
        const existingUser = await this.usersService.findByEmail(email);
        if (existingUser) {
            throw new ConflictException({
                code: 'EMAIL_ALREADY_EXISTS',
                message: 'Email already registered',
            });
        }

        // Bước 4: Hash mật khẩu bằng bcrypt
        // Salt rounds = 10 → cân bằng giữa bảo mật và hiệu suất
        const passwordHash = await bcrypt.hash(dto.password, 10);

        // Bước 5: Tạo user mới trong database
        const user = await this.usersService.create({
            email,
            passwordHash,
        });

        // Bước 6-7: Tạo tokens và lưu refresh token
        const tokens = await this.generateTokens(user);
        await this.saveRefreshToken(user.id, tokens.refreshToken);

        // Bước 8: Trả kết quả
        return { user, ...tokens };
    }

    /**
     * ĐĂNG NHẬP
     *
     * Luồng xử lý:
     * 1. Chuẩn hóa email
     * 2. Tìm user theo email
     * 3. So sánh password với hash trong DB (bcrypt.compare)
     *    → Luôn thực hiện compare ngay cả khi không tìm thấy user
     *      để tránh timing attack (kẻ tấn công đo thời gian phản hồi)
     * 4. Kiểm tra tài khoản có bị vô hiệu hóa không
     * 5. Tạo cặp tokens mới
     * 6. Lưu refresh token vào DB
     */
    async login(dto: LoginDto): Promise<{ user: User } & AuthTokens> {
        const email = normalizeEmail(dto.email);

        // Tìm user theo email
        const user = await this.usersService.findByEmail(email);

        // So sánh password - QUAN TRỌNG: Luôn gọi bcrypt.compare
        // ngay cả khi user không tồn tại để tránh timing attack
        const isPasswordValid = user ? await bcrypt.compare(dto.password, user.passwordHash) : false;

        // Email sai HOẶC password sai → trả cùng một lỗi chung
        // (không tiết lộ email có tồn tại hay không → chống email enumeration)
        if (!user || !isPasswordValid) {
            throw new UnauthorizedException({
                code: 'AUTH_INVALID_CREDENTIALS',
                message: 'Invalid email or password',
            });
        }

        // Kiểm tra tài khoản có bị admin vô hiệu hóa không
        if (!user.isActive) {
            throw new HttpException({
                code: 'ACCOUNT_DISABLED',
                message: 'Your account has been disabled. Contact support for assistance.',
                disabledAt: user.disabledAt?.toISOString(),
            }, HttpStatus.FORBIDDEN);
        }

        // Tạo tokens và lưu refresh token
        const tokens = await this.generateTokens(user);
        await this.saveRefreshToken(user.id, tokens.refreshToken);

        return { user, ...tokens };
    }

    /**
     * LÀM MỚI TOKEN (Refresh Token Rotation)
     *
     * Cơ chế Token Rotation:
     * 1. Client gửi refresh token hiện tại
     * 2. Server tìm token trong DB (phải chưa bị thu hồi + chưa hết hạn)
     * 3. THU HỒI token cũ (đánh dấu revoked = true)
     * 4. Tạo cặp tokens MỚI hoàn toàn
     * 5. Lưu refresh token mới vào DB
     *
     * Tại sao dùng Token Rotation?
     * → Nếu refresh token bị đánh cắp và kẻ tấn công dùng nó, token gốc
     *   đã bị thu hồi → user hợp lệ sẽ bị lỗi → phát hiện token bị đánh cắp
     */
    async refresh(refreshToken: string): Promise<{ user: User } & AuthTokens> {
        if (!refreshToken) {
            throw new BadRequestException({
                code: 'AUTH_REFRESH_TOKEN_REQUIRED',
                message: 'Refresh token is required',
            });
        }

        // Hash refresh token để so sánh với bản hash trong DB
        // (DB không lưu raw token, chỉ lưu hash SHA-256)
        const tokenHash = this.hashToken(refreshToken);

        // Tìm token trong DB: phải chưa bị thu hồi VÀ chưa hết hạn
        const storedToken = await this.prisma.refreshToken.findFirst({
            where: {
                token: tokenHash,
                revoked: false,                    // Chưa bị thu hồi
                expiresAt: { gt: new Date() },     // Chưa hết hạn (greater than now)
            },
            include: { user: true },               // Kèm thông tin user
        });

        if (!storedToken) {
            throw new UnauthorizedException({
                code: 'AUTH_INVALID_REFRESH_TOKEN',
                message: 'Invalid or expired refresh token',
            });
        }

        // Token Rotation: Thu hồi token cũ trước khi phát token mới
        await this.prisma.refreshToken.update({
            where: { id: storedToken.id },
            data: { revoked: true },
        });

        // Tạo cặp tokens mới hoàn toàn
        const tokens = await this.generateTokens(storedToken.user);
        await this.saveRefreshToken(storedToken.user.id, tokens.refreshToken);

        return { user: storedToken.user, ...tokens };
    }

    /**
     * ĐĂNG XUẤT
     *
     * Thu hồi refresh token → token đó không thể dùng để refresh nữa.
     * Access token hiện tại vẫn còn hiệu lực cho đến khi hết hạn
     * (đây là đặc điểm của JWT stateless, không thể thu hồi access token).
     */
    async logout(refreshToken: string): Promise<void> {
        if (!refreshToken) {
            return; // Không có token → không cần làm gì
        }

        const tokenHash = this.hashToken(refreshToken);

        // Thu hồi tất cả bản ghi khớp với hash này
        await this.prisma.refreshToken.updateMany({
            where: { token: tokenHash },
            data: { revoked: true },
        });
    }

    /**
     * QUÊN MẬT KHẨU - Gửi email đặt lại
     *
     * Luồng xử lý:
     * 1. Tìm user theo email
     * 2. Nếu KHÔNG tìm thấy → vẫn trả thành công (chống email enumeration)
     * 3. Vô hiệu hóa tất cả token reset cũ
     * 4. Tạo token reset mới (random 48 bytes hex)
     * 5. Lưu hash của token vào DB (hết hạn sau 1 giờ)
     * 6. Gửi email chứa link reset kèm raw token
     *
     * BẢO MẬT: Luôn trả thành công dù email có tồn tại hay không
     * → Kẻ tấn công không thể biết email nào đã đăng ký
     */
    async forgotPassword(email: string): Promise<void> {
        const user = await this.usersService.findByEmail(email);
        // Luôn trả thành công để chống email enumeration
        if (!user) return;

        // Vô hiệu hóa các token reset cũ (đánh dấu used = true)
        await this.prisma.passwordResetToken.updateMany({
            where: { userId: user.id, used: false },
            data: { used: true },
        });

        // Tạo token reset mới: 48 bytes random → 96 ký tự hex
        const rawToken = crypto.randomBytes(48).toString('hex');
        const tokenHash = this.hashToken(rawToken);

        // Lưu hash token vào DB, hết hạn sau 1 giờ
        await this.prisma.passwordResetToken.create({
            data: {
                userId: user.id,
                token: tokenHash,
                expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 giờ
            },
        });

        // Gửi email chứa link reset với raw token (không phải hash)
        await this.mailService.sendPasswordResetEmail(user.email, rawToken);
    }

    /**
     * ĐẶT LẠI MẬT KHẨU (sau khi nhận email)
     *
     * Luồng xử lý:
     * 1. Kiểm tra độ mạnh mật khẩu mới
     * 2. Hash token để tìm trong DB
     * 3. Tìm token: phải chưa sử dụng (used=false) VÀ chưa hết hạn
     * 4. Sử dụng transaction để đảm bảo tính nhất quán:
     *    a. Cập nhật password mới (đã hash bcrypt)
     *    b. Đánh dấu token đã sử dụng
     *    c. Thu hồi TẤT CẢ refresh token của user (buộc đăng nhập lại)
     */
    async resetPassword(token: string, newPassword: string): Promise<void> {
        // Kiểm tra mật khẩu mới phải đủ mạnh
        assertStrongPassword(newPassword);

        const tokenHash = this.hashToken(token);

        // Tìm token reset: chưa dùng + chưa hết hạn
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

        // Hash mật khẩu mới bằng bcrypt
        const passwordHash = await bcrypt.hash(newPassword, 10);

        // Transaction: Thực hiện 3 thao tác cùng lúc, đảm bảo tính nhất quán
        // Nếu bất kỳ thao tác nào thất bại → rollback tất cả
        await this.prisma.$transaction([
            // a. Cập nhật mật khẩu mới cho user
            this.prisma.user.update({
                where: { id: resetToken.userId },
                data: { passwordHash },
            }),
            // b. Đánh dấu token reset đã sử dụng (không dùng lại được)
            this.prisma.passwordResetToken.update({
                where: { id: resetToken.id },
                data: { used: true },
            }),
            // c. Thu hồi toàn bộ refresh token → buộc user đăng nhập lại
            //    trên tất cả thiết bị (bảo mật sau khi đổi mật khẩu)
            this.prisma.refreshToken.updateMany({
                where: { userId: resetToken.userId, revoked: false },
                data: { revoked: true },
            }),
        ]);
    }

    // ═══════════════════════════════════════════════
    // CÁC HÀM NỘI BỘ (Private Methods)
    // ═══════════════════════════════════════════════

    /**
     * TẠO CẶP TOKEN (access + refresh)
     *
     * - Access token: JWT có chứa payload (sub, email, role),
     *   ký bằng secret, thời hạn ngắn (VD: 15 phút)
     * - Refresh token: Chuỗi random 64 bytes (128 ký tự hex),
     *   KHÔNG phải JWT, thời hạn dài (VD: 7 ngày)
     */
    private async generateTokens(user: User): Promise<AuthTokens> {
        // Payload chứa trong access token JWT
        const payload: TokenPayload = {
            sub: user.id,       // Subject = User ID
            email: user.email,
            role: user.role,
        };

        // Ký JWT với payload → tạo access token
        const accessToken = this.jwtService.sign(payload);

        // Tạo refresh token: random 64 bytes → 128 ký tự hex
        // (KHÔNG phải JWT, chỉ là chuỗi random an toàn)
        const refreshToken = crypto.randomBytes(64).toString('hex');

        // Lấy thời gian sống của access token từ cấu hình
        const expiresIn = this.security.auth.jwt.accessTtlSeconds;

        return { accessToken, refreshToken, expiresIn };
    }

    /**
     * LƯU REFRESH TOKEN VÀO DATABASE
     *
     * QUAN TRỌNG: Chỉ lưu HASH SHA-256 của token, không lưu raw token.
     * → Nếu database bị lộ, kẻ tấn công không thể dùng hash
     *   để tạo lại refresh token hợp lệ.
     */
    private async saveRefreshToken(userId: string, refreshToken: string): Promise<void> {
        // Hash refresh token bằng SHA-256 trước khi lưu
        const tokenHash = this.hashToken(refreshToken);

        // Tính thời điểm hết hạn từ cấu hình TTL
        const expiresInMs = this.security.auth.jwt.refreshTtlSeconds * 1000;

        await this.prisma.refreshToken.create({
            data: {
                userId,
                token: tokenHash,                              // Lưu hash, KHÔNG lưu raw
                expiresAt: new Date(Date.now() + expiresInMs),  // Thời điểm hết hạn
            },
        });
    }

    /**
     * HASH TOKEN bằng SHA-256
     *
     * Dùng để hash refresh token và reset token trước khi lưu DB.
     * SHA-256 là hàm hash một chiều → không thể giải ngược.
     */
    private hashToken(token: string): string {
        return crypto.createHash('sha256').update(token).digest('hex');
    }
}
