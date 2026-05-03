/**
 * ===== ROLES GUARD - KIỂM TRA PHÂN QUYỀN THEO VAI TRÒ =====
 *
 * RolesGuard kiểm tra vai trò (role) của user hiện tại
 * với danh sách vai trò yêu cầu trên route.
 *
 * Cách sử dụng:
 *   @UseGuards(JwtAuthGuard, RolesGuard)
 *   @Roles('admin')              // Chỉ admin
 *   @Roles('admin', 'viewer')    // Admin HOẶC viewer
 *   async doSomething() { ... }
 *
 * Luồng xử lý:
 * 1. Đọc metadata roles từ decorator @Roles() (qua Reflector)
 * 2. Nếu không có roles → cho phép (public route)
 * 3. Lấy user từ request (đã gắn bởi JwtAuthGuard)
 * 4. Kiểm tra user.role có nằm trong requiredRoles không
 *
 * Lưu ý: Guard này phải đặt SAU JwtAuthGuard
 * (vì cần user đã được gắn vào request)
 */

import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { User } from '@prisma/client';

@Injectable()
export class RolesGuard implements CanActivate {
    constructor(private reflector: Reflector) { }

    /**
     * Kiểm tra user có đúng vai trò yêu cầu không
     * @returns true nếu cho phép, false nếu từ chối (NestJS tự throw 403)
     */
    canActivate(context: ExecutionContext): boolean {
        // Đọc danh sách roles yêu cầu từ decorator @Roles()
        const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
            context.getHandler(), // Kiểm tra trên method (handler) trước
            context.getClass(),   // Sau đó kiểm tra trên class (controller)
        ]);

        // Không có yêu cầu role → cho phép (public route)
        if (!requiredRoles) {
            return true;
        }

        // Lấy user từ request (đã được JwtStrategy gắn vào)
        const { user } = context.switchToHttp().getRequest();
        const typedUser = user as User;

        // Chưa đăng nhập → từ chối
        if (!typedUser) {
            return false;
        }

        // Kiểm tra role của user có nằm trong danh sách yêu cầu không
        // VD: requiredRoles = ['admin'], user.role = 'admin' → true
        return requiredRoles.includes(typedUser.role);
    }
}
