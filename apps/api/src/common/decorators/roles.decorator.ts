/**
 * ===== ROLES DECORATOR - GẮN YÊU CẦU VAI TRÒ CHO ROUTE =====
 *
 * Decorator @Roles() gắn metadata danh sách vai trò yêu cầu lên route handler.
 * RolesGuard sẽ đọc metadata này để kiểm tra quyền truy cập.
 *
 * Cách sử dụng:
 *   @Roles('admin')               // Chỉ admin
 *   @Roles('admin', 'viewer')     // Admin HOẶC viewer
 *
 * Ví dụ đầy đủ:
 *   @Post()
 *   @UseGuards(JwtAuthGuard, RolesGuard)
 *   @Roles('admin')
 *   async createMovie(@Body() dto: CreateMovieDto) { ... }
 */

import { SetMetadata } from '@nestjs/common';

/** Key metadata để RolesGuard đọc danh sách roles từ decorator */
export const ROLES_KEY = 'roles';

/**
 * Decorator gắn danh sách roles yêu cầu lên route handler.
 * User phải có ít nhất 1 role trong danh sách mới được truy cập.
 */
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);
