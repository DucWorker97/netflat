/**
 * ===== POLICY GUARD - BẢO VỆ TRUY CẬP TÀI NGUYÊN (BOLA Protection) =====
 *
 * PolicyGuard là guard trung tâm kiểm soát quyền truy cập tài nguyên.
 * Thực thi OWASP API1:2023 - Broken Object Level Authorization (BOLA):
 * - Kiểm tra quyền truy cập ở MỨC ĐỐI TƯỢNG cho mọi request
 * - Xác minh quyền sở hữu tài nguyên (user-scoped resources)
 * - Áp dụng luật hiển thị nội dung (content visibility rules)
 *
 * Các loại policy:
 * ┌──────────────────┬─────────────────────────────────────────────┐
 * │ Policy Type      │ Mô tả                                      │
 * ├──────────────────┼─────────────────────────────────────────────┤
 * │ MovieRead        │ Viewer: chỉ xem phim published+ready       │
 * │                  │ Admin: xem tất cả phim                     │
 * │ MovieWrite       │ Chỉ Admin mới được sửa/xóa phim           │
 * │ MovieVisible     │ Kiểm tra phim tồn tại + visible cho user  │
 * │ UserOwned        │ Tài nguyên thuộc sở hữu của user hiện tại │
 * └──────────────────┴─────────────────────────────────────────────┘
 *
 * Cách sử dụng (trong controller):
 *   @UseGuards(JwtAuthGuard, PolicyGuard)
 *   @MovieReadPolicy('id')       // Tên param chứa ID phim
 *   async findOne(@Param('id') id: string) { ... }
 *
 * Luồng xử lý:
 * 1. Đọc metadata policy từ decorator (Reflector)
 * 2. Nếu không có policy → cho phép (public route)
 * 3. Lấy user từ request (đã gắn bởi JwtAuthGuard)
 * 4. Switch theo policy type → gọi hàm kiểm tra tương ứng
 * 5. Nếu vi phạm → throw ForbiddenException / NotFoundException
 */

import {
    Injectable,
    CanActivate,
    ExecutionContext,
    ForbiddenException,
    NotFoundException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../../prisma/prisma.service';
import { User, MovieStatus, EncodeStatus } from '@prisma/client';

/**
 * Kiểu policy hỗ trợ:
 * - MovieRead:    Quyền đọc phim (viewer: published+ready only, admin: all)
 * - MovieWrite:   Quyền ghi phim (admin only)
 * - UserOwned:    Tài nguyên sở hữu bởi user (owner hoặc admin)
 * - MovieVisible: Phim phải visible (published+ready) cho non-admin
 */
export type PolicyType =
    | 'MovieRead'      // Viewer: published+ready, Admin: all
    | 'MovieWrite'     // Admin only
    | 'UserOwned'      // Owner or Admin
    | 'MovieVisible';  // Movie must be published+ready for non-admins

/**
 * Tùy chọn policy:
 * - param: Tên route parameter chứa resource ID
 *   (VD: 'id' cho /movies/:id, 'movieId' cho /favorites/:movieId)
 */
export interface PolicyOptions {
    /** Tên route parameter chứa resource ID */
    param?: string;
}

/** Key metadata để Reflector đọc policy từ decorator */
export const POLICY_KEY = 'policy';

/**
 * Guard kiểm tra quyền truy cập tài nguyên theo policy.
 * Được đăng ký dưới dạng Injectable và sử dụng qua @UseGuards().
 */
@Injectable()
export class PolicyGuard implements CanActivate {
    constructor(
        private reflector: Reflector,       // Đọc metadata từ decorator
        private prisma: PrismaService,       // Truy vấn DB kiểm tra tài nguyên
    ) { }

    /**
     * HÀM CHÍNH: Kiểm tra quyền truy cập
     *
     * Được NestJS gọi tự động trước mỗi request tới route có @UseGuards(PolicyGuard)
     * Trả về true = cho phép, throw exception = từ chối
     */
    async canActivate(context: ExecutionContext): Promise<boolean> {
        // Đọc metadata policy từ decorator @CheckPolicy() / @MovieReadPolicy()
        // getAllAndOverride: Lấy metadata từ handler (method) hoặc class (controller)
        const policyMeta = this.reflector.getAllAndOverride<{
            type: PolicyType;
            options?: PolicyOptions;
        }>(POLICY_KEY, [context.getHandler(), context.getClass()]);

        // Không có policy nào được đặt → cho phép truy cập
        // (authentication vẫn được kiểm tra bởi JwtAuthGuard)
        if (!policyMeta) {
            return true;
        }

        // Lấy thông tin request và user hiện tại
        const request = context.switchToHttp().getRequest();
        const user = request.user as User | undefined;
        const { type, options = {} } = policyMeta;

        // Phân nhánh theo loại policy
        switch (type) {
            case 'MovieRead':
                return this.checkMovieRead(request, user, options);
            case 'MovieWrite':
                return this.checkAdminOnly(user);
            case 'MovieVisible':
                return this.checkMovieVisible(request, user, options);
            case 'UserOwned':
                return this.checkUserOwned(user);
            default:
                return true;
        }
    }

    /**
     * KIỂM TRA QUYỀN ĐỌC PHIM (MovieRead)
     *
     * Luồng kiểm tra:
     * 1. Lấy movieId từ route params
     * 2. Truy vấn DB xem phim có tồn tại không → 404
     * 3. Admin → cho phép xem tất cả
     * 4. Viewer → chỉ xem phim published + encode ready → 403
     */
    private async checkMovieRead(
        request: any,
        user: User | undefined,
        options: PolicyOptions,
    ): Promise<boolean> {
        const movieId = request.params[options.param || 'id'];
        if (!movieId) return true; // Không có ID → bỏ qua (route không liên quan)

        // Truy vấn phim: chỉ lấy các trường cần thiết (hiệu suất)
        const movie = await this.prisma.movie.findUnique({
            where: { id: movieId },
            select: { id: true, movieStatus: true, encodeStatus: true },
        });

        // Phim không tồn tại → 404 Not Found
        if (!movie) {
            throw new NotFoundException({
                code: 'MOVIE_NOT_FOUND',
                message: 'Movie not found',
            });
        }

        // Admin → cho phép xem tất cả phim (kể cả draft, encoding)
        if (user?.role === 'admin') {
            return true;
        }

        // Viewer → chỉ xem phim đã xuất bản VÀ encode xong
        if (
            movie.movieStatus !== MovieStatus.published ||
            movie.encodeStatus !== EncodeStatus.ready
        ) {
            throw new ForbiddenException({
                code: 'MOVIE_NOT_AVAILABLE',
                message: 'Movie is not available',
            });
        }

        return true;
    }

    /**
     * KIỂM TRA PHIM CÓ VISIBLE KHÔNG (MovieVisible)
     *
     * Tương tự MovieRead nhưng:
     * - Lấy movieId từ cả params VÀ query string
     * - Dùng cho các endpoint tương tác (favorites, ratings, history)
     *   nơi ID phim có thể nằm ở query hoặc params
     */
    private async checkMovieVisible(
        request: any,
        user: User | undefined,
        options: PolicyOptions,
    ): Promise<boolean> {
        // Lấy movieId từ params hoặc query
        const movieId = request.params[options.param || 'movieId'] ||
            request.query[options.param || 'movieId'];
        if (!movieId) return true;

        const movie = await this.prisma.movie.findUnique({
            where: { id: movieId },
            select: { id: true, movieStatus: true, encodeStatus: true },
        });

        if (!movie) {
            throw new NotFoundException({
                code: 'MOVIE_NOT_FOUND',
                message: 'Movie not found',
            });
        }

        // Admin → truy cập bất kỳ phim nào
        if (user?.role === 'admin') {
            return true;
        }

        // Non-admin: phim phải published + ready
        if (
            movie.movieStatus !== MovieStatus.published ||
            movie.encodeStatus !== EncodeStatus.ready
        ) {
            throw new ForbiddenException({
                code: 'MOVIE_NOT_AVAILABLE',
                message: 'Movie is not available',
            });
        }

        return true;
    }

    /**
     * KIỂM TRA CHỈ ADMIN (MovieWrite / AdminOnly)
     * Nếu không phải admin → 403 Forbidden
     */
    private checkAdminOnly(user: User | undefined): boolean {
        if (!user || user.role !== 'admin') {
            throw new ForbiddenException({
                code: 'FORBIDDEN_ADMIN_ONLY',
                message: 'This action requires admin role',
            });
        }
        return true;
    }

    /**
     * KIỂM TRA TÀI NGUYÊN THUỘC SỞ HỮU USER (UserOwned)
     * Hiện tại chỉ kiểm tra user đã đăng nhập (có token hợp lệ).
     * Logic kiểm tra ownership cụ thể nằm ở từng service.
     */
    private checkUserOwned(user: User | undefined): boolean {
        if (!user) {
            throw new ForbiddenException({
                code: 'UNAUTHORIZED',
                message: 'Authentication required',
            });
        }

        return true;
    }
}
