/**
 * ===== USERS SERVICE - LOGIC QUẢN LÝ NGƯỜI DÙNG =====
 *
 * UsersService xử lý nghiệp vụ liên quan đến hồ sơ người dùng:
 *
 * Cho user:
 * - findByEmail()     → Tìm user theo email (dùng cho đăng nhập)
 * - findById()        → Lấy profile user
 * - getProfile()      → Lấy profile (format trả về cho API)
 * - updateProfile()   → Cập nhật thông tin cá nhân (tên, avatar)
 * - changePassword()  → Đổi mật khẩu (yêu cầu nhập MK cũ)
 * - create()          → Tạo user mới (dùng bởi AuthService.register)
 *
 * Cho admin:
 * - findAll()         → Danh sách user (phân trang)
 * - toggleUserStatus() → Vô hiệu hóa / kích hoạt tài khoản
 */

import {
    Injectable,
    NotFoundException,
    BadRequestException,
    ConflictException,

} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { User } from '@prisma/client';
import { assertStrongPassword, normalizeEmail } from '../common/utils/security';

@Injectable()
export class UsersService {
    constructor(private prisma: PrismaService) { }

    /**
     * TÌM USER THEO EMAIL
     * Chuẩn hóa email (trim + lowercase) trước khi truy vấn.
     * Trả về null nếu không tìm thấy (không throw lỗi).
     */
    async findByEmail(email: string): Promise<User | null> {
        return this.prisma.user.findUnique({
            where: { email: normalizeEmail(email) },
        });
    }

    /**
     * TÌM USER THEO ID
     * Trả về null nếu không tìm thấy.
     */
    async findById(id: string): Promise<User | null> {
        return this.prisma.user.findUnique({
            where: { id },
        });
    }

    /**
     * TẠO USER MỚI
     * Được gọi bởi AuthService.register().
     * @param data - { email, passwordHash } (password đã hash sẵn bằng bcrypt)
     */
    async create(data: { email: string; passwordHash: string }): Promise<User> {
        return this.prisma.user.create({
            data: {
                email: data.email,
                passwordHash: data.passwordHash,
            },
        });
    }

    /**
     * LẤY PROFILE USER (format API response)
     * Loại bỏ các trường nhạy cảm (passwordHash).
     */
    async getProfile(userId: string) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
        });

        if (!user) {
            throw new NotFoundException({
                code: 'USER_NOT_FOUND',
                message: 'User not found',
            });
        }

        return this.formatUser(user);
    }

    /**
     * CẬP NHẬT THÔNG TIN CÁ NHÂN
     *
     * Cho phép user cập nhật: displayName, avatarUrl
     * Không cho phép cập nhật: email, role, password (có endpoint riêng)
     */
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
                displayName: data.displayName,
                avatarUrl: data.avatarUrl,
            },
        });

        return this.formatUser(updated);
    }

    /**
     * ĐỔI MẬT KHẨU
     *
     * Luồng xử lý:
     * 1. Kiểm tra mật khẩu hiện tại có đúng không (bcrypt.compare)
     * 2. Kiểm tra mật khẩu mới phải đủ mạnh (≥8 ký tự, có chữ + số)
     * 3. Hash mật khẩu mới bằng bcrypt
     * 4. Cập nhật database
     *
     * Bảo mật: Yêu cầu nhập mật khẩu cũ → chống trường hợp
     * kẻ tấn công chiếm phiên đăng nhập rồi đổi MK
     */
    async changePassword(userId: string, currentPassword: string, newPassword: string) {
        const user = await this.prisma.user.findUnique({ where: { id: userId } });
        if (!user) {
            throw new NotFoundException({
                code: 'USER_NOT_FOUND',
                message: 'User not found',
            });
        }

        // Kiểm tra mật khẩu hiện tại
        const valid = await bcrypt.compare(currentPassword, user.passwordHash);
        if (!valid) {
            throw new BadRequestException({
                code: 'INVALID_CURRENT_PASSWORD',
                message: 'Current password is incorrect',
            });
        }

        // Kiểm tra mật khẩu mới phải đủ mạnh
        assertStrongPassword(newPassword);

        // Hash + cập nhật mật khẩu mới
        const passwordHash = await bcrypt.hash(newPassword, 10);
        await this.prisma.user.update({
            where: { id: userId },
            data: { passwordHash },
        });

        return { message: 'Password changed successfully' };
    }

    /**
     * DANH SÁCH USER (Admin only, có phân trang)
     *
     * Trả về danh sách user gồm thông tin cơ bản (không có passwordHash).
     * Sắp xếp theo thời gian tạo giảm dần (mới nhất trước).
     */
    async findAll(page = 1, limit = 20) {
        const skip = (page - 1) * limit;

        const [users, total] = await Promise.all([
            this.prisma.user.findMany({
                take: limit,
                skip,
                orderBy: { createdAt: 'desc' },
            }),
            this.prisma.user.count(),
        ]);

        return {
            data: users.map((u) => this.formatUser(u)),
            total,
        };
    }

    /**
     * VÔ HIỆU HÓA / KÍCH HOẠT TÀI KHOẢN (Admin only)
     *
     * - active = false → Tài khoản bị vô hiệu hóa, user không thể đăng nhập
     *   + Ghi lại thời điểm vô hiệu hóa (disabledAt)
     * - active = true  → Kích hoạt lại tài khoản
     *   + Xóa thời điểm vô hiệu hóa (disabledAt = null)
     */
    async toggleUserStatus(userId: string, active: boolean) {
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
                isActive: active,
                disabledAt: active ? null : new Date(), // Ghi thời điểm vô hiệu hóa
            },
        });

        return this.formatUser(updated);
    }

    // ═══════════════════════════════════════════════
    // HÀM HELPER
    // ═══════════════════════════════════════════════

    /**
     * FORMAT DỮ LIỆU USER CHO API RESPONSE
     * Loại bỏ passwordHash và các trường nội bộ.
     */
    private formatUser(user: User) {
        return {
            id: user.id,
            email: user.email,
            displayName: user.displayName,
            avatarUrl: user.avatarUrl,
            role: user.role,
            isActive: user.isActive,
            disabledAt: user.disabledAt?.toISOString() || null,
            createdAt: user.createdAt.toISOString(),
            updatedAt: user.updatedAt.toISOString(),
        };
    }
}
