/**
 * ===== CHECK POLICY DECORATOR - GẮN METADATA POLICY CHO ROUTE =====
 *
 * Các decorator này gắn metadata policy lên route handler (method/class).
 * PolicyGuard sẽ đọc metadata này để quyết định quyền truy cập.
 *
 * Decorator sẵn có:
 * - @MovieReadPolicy('id')      → Kiểm tra quyền ĐỌC phim (param 'id')
 * - @MovieVisiblePolicy('movieId') → Kiểm tra phim có visible không
 * - @MovieWritePolicy()         → Chỉ admin mới được GHI (sửa/xóa)
 * - @UserOwnedPolicy()         → Tài nguyên thuộc user hiện tại
 *
 * Ví dụ sử dụng trong controller:
 *   @Get(':id')
 *   @UseGuards(JwtAuthGuard, PolicyGuard)
 *   @MovieReadPolicy('id')       // Lấy movieId từ params.id
 *   async findOne(@Param('id') id: string) { ... }
 */

import { SetMetadata } from '@nestjs/common';
import { POLICY_KEY, PolicyType, PolicyOptions } from '../guards/policy.guard';

/**
 * Decorator gốc: Gắn metadata policy vào route handler.
 * Các decorator bên dưới là shortcut tiện lợi cho từng loại policy.
 */
export const CheckPolicy = (type: PolicyType, options?: PolicyOptions) =>
    SetMetadata(POLICY_KEY, { type, options });

/**
 * @MovieReadPolicy - Quyền đọc phim
 * Viewer: chỉ xem phim published+ready
 * Admin: xem tất cả
 * @param param - Tên route param chứa movieId (mặc định: 'id')
 */
export const MovieReadPolicy = (param = 'id') =>
    CheckPolicy('MovieRead', { param });

/**
 * @MovieVisiblePolicy - Kiểm tra phim visible
 * Tìm movieId từ params hoặc query
 * @param param - Tên param/query chứa movieId (mặc định: 'movieId')
 */
export const MovieVisiblePolicy = (param = 'movieId') =>
    CheckPolicy('MovieVisible', { param });

/**
 * @MovieWritePolicy - Quyền ghi phim (admin only)
 * Không cần param vì chỉ kiểm tra role
 */
export const MovieWritePolicy = () =>
    CheckPolicy('MovieWrite');

/**
 * @UserOwnedPolicy - Tài nguyên sở hữu bởi user
 * Kiểm tra user đã đăng nhập
 */
export const UserOwnedPolicy = () =>
    CheckPolicy('UserOwned');
