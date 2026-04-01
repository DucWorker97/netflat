/**
 * ===== CURRENT USER DECORATOR - LẤY THÔNG TIN USER HIỆN TẠI =====
 *
 * Custom decorator để lấy user đang đăng nhập từ request.
 * Thay vì viết: request.user → dùng @CurrentUser() decorator gọn hơn.
 *
 * Cách hoạt động:
 * 1. JwtAuthGuard giải mã JWT → gắn user vào request.user
 * 2. @CurrentUser() decorator đọc user từ request.user
 * 3. Nếu có data key → trả về field cụ thể (VD: @CurrentUser('id') → user.id)
 * 4. Nếu không có → trả về toàn bộ user object
 *
 * Ví dụ sử dụng:
 *   // Lấy toàn bộ user object
 *   async getProfile(@CurrentUser() user: User) { ... }
 *
 *   // Lấy chỉ user ID
 *   async getHistory(@CurrentUser('id') userId: string) { ... }
 */

import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { User } from '@prisma/client';

export const CurrentUser = createParamDecorator(
    /**
     * @param data - Tên field cần lấy (VD: 'id', 'email', 'role')
     *               Nếu undefined → trả toàn bộ user object
     * @param ctx  - Execution context chứa request
     */
    (data: keyof User | undefined, ctx: ExecutionContext) => {
        // Lấy request từ HTTP context
        const request = ctx.switchToHttp().getRequest();
        // User đã được JwtStrategy gắn vào request.user
        const user = request.user as User;
        // Trả về field cụ thể hoặc toàn bộ user object
        return data ? user?.[data] : user;
    },
);
