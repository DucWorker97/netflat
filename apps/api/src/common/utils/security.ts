/**
 * ===== SECURITY UTILS - TIỆN ÍCH BẢO MẬT =====
 *
 * Các hàm tiện ích dùng chung cho logic bảo mật:
 * - Chính sách mật khẩu (password policy)
 * - Chuẩn hóa email
 */

import { BadRequestException } from '@nestjs/common';

/** Độ dài tối thiểu của mật khẩu: 8 ký tự */
export const MIN_PASSWORD_LENGTH = 8;

/**
 * Regex kiểm tra mật khẩu:
 * - (?=.*[A-Za-z]): Phải có ít nhất 1 chữ cái
 * - (?=.*\d): Phải có ít nhất 1 chữ số
 * - .+: Ít nhất 1 ký tự
 */
export const PASSWORD_POLICY_REGEX = /^(?=.*[A-Za-z])(?=.*\d).+$/;

/** Thông báo lỗi khi mật khẩu không đủ mạnh */
export const PASSWORD_POLICY_MESSAGE =
    'Password must be at least 8 characters and include at least one letter and one number';

/**
 * CHUẨN HÓA EMAIL
 * - trim: Bỏ khoảng trắng đầu/cuối
 * - toLowerCase: Chuyển thường
 *
 * VD: "  John@Gmail.COM  " → "john@gmail.com"
 */
export function normalizeEmail(email: string): string {
    return email.trim().toLowerCase();
}

/**
 * KIỂM TRA ĐỘ MẠNH MẬT KHẨU
 *
 * Ném BadRequestException nếu mật khẩu không đạt yêu cầu:
 * - Ít nhất 8 ký tự
 * - Có ít nhất 1 chữ cái VÀ 1 chữ số
 *
 * Được gọi trong: register, changePassword, resetPassword
 */
export function assertStrongPassword(password: string): void {
    if (password.length < MIN_PASSWORD_LENGTH || !PASSWORD_POLICY_REGEX.test(password)) {
        throw new BadRequestException({
            code: 'PASSWORD_TOO_WEAK',
            message: PASSWORD_POLICY_MESSAGE,
        });
    }
}
