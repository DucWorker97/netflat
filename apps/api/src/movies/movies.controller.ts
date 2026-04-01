/**
 * ===== MOVIES CONTROLLER - API ENDPOINTS QUẢN LÝ PHIM =====
 *
 * Định nghĩa các route API cho phim:
 *
 * GET    /api/movies                → Danh sách phim (public, có tìm kiếm)
 * POST   /api/movies                → Tạo phim mới (admin only)
 * GET    /api/movies/:id            → Chi tiết phim (yêu cầu JWT + policy check)
 * PUT    /api/movies/:id            → Cập nhật phim (admin only)
 * DELETE /api/movies/:id            → Xóa phim (admin only)
 * PATCH  /api/movies/:id/publish    → Xuất bản/bỏ xuất bản (admin only)
 * POST   /api/movies/:id/upload-complete → Xác nhận upload hoàn tất (admin)
 * GET    /api/movies/:id/stream     → Lấy URL streaming HLS (user)
 * GET    /api/movies/:id/progress   → Lấy tiến trình xem (user)
 *
 * Phân quyền:
 * - Public routes: findAll (danh sách phim)
 * - User routes: findOne, getStreamUrl, getProgress (cần JWT)
 * - Admin routes: create, update, delete, publish, uploadComplete
 */

import {
    Controller,
    Get,
    Post,
    Put,
    Delete,
    Patch,
    Body,
    Param,
    Query,
    UseGuards,
    ParseUUIDPipe,
    Req,
    Logger,
} from '@nestjs/common';
import { Request } from 'express';
import { MoviesService } from './movies.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { PolicyGuard } from '../common/guards/policy.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { MovieReadPolicy, MovieVisiblePolicy } from '../common/decorators/check-policy.decorator';
import { User } from '@prisma/client';
import { CreateMovieDto } from './dto/create-movie.dto';
import { UpdateMovieDto } from './dto/update-movie.dto';
import { ListMoviesDto } from './dto/list-movies.dto';
import { PublishDto } from './dto/publish.dto';
import { UploadService } from '../upload/upload.service';
import { UploadCompleteDto } from '../upload/dto/upload-complete.dto';

@Controller('movies') // Prefix: /api/movies
export class MoviesController {
    private readonly logger = new Logger(MoviesController.name);

    constructor(
        private readonly moviesService: MoviesService,
        private readonly uploadService: UploadService,
    ) { }

    /**
     * DANH SÁCH PHIM - GET /api/movies
     *
     * Public endpoint (JWT tùy chọn, không bắt buộc).
     * OptionalJwtAuthGuard: Nếu có token → gắn user, không có → user = null.
     *
     * Query params: page, limit, q (từ khóa tìm kiếm)
     * Trả về: { data: [...phim], meta: { page, limit, total, totalPages, hasNext, hasPrev } }
     */
    @Get()
    @UseGuards(OptionalJwtAuthGuard) // JWT tùy chọn (public endpoint)
    async findAll(@Query() query: ListMoviesDto, @CurrentUser() user: User | null) {
        const result = await this.moviesService.findAll(query, user ?? undefined);
        const { page = 1, limit = 20 } = query;

        return {
            data: result.data,
            meta: {
                page,
                limit,
                total: result.total,
                totalPages: Math.ceil(result.total / limit),
                hasNext: page * limit < result.total,   // Còn trang tiếp?
                hasPrev: page > 1,                       // Có trang trước?
            },
        };
    }

    /**
     * TẠO PHIM MỚI - POST /api/movies
     *
     * Yêu cầu: JWT + Role admin
     * Body: CreateMovieDto (title, description, releaseYear, ...)
     */
    @Post()
    @UseGuards(JwtAuthGuard, RolesGuard) // Yêu cầu JWT + kiểm tra role
    @Roles('admin')                       // Chỉ admin mới được tạo phim
    async create(@Body() dto: CreateMovieDto) {
        const movie = await this.moviesService.create(dto);
        return { data: movie };
    }

    /**
     * CHI TIẾT MỘT PHIM - GET /api/movies/:id
     *
     * Yêu cầu: JWT + PolicyGuard (kiểm tra quyền xem phim)
     * @MovieReadPolicy: Viewer chỉ xem phim published+ready, Admin xem tất cả
     * @ParseUUIDPipe: Validate param ":id" phải là UUID hợp lệ
     */
    @Get(':id')
    @UseGuards(JwtAuthGuard, PolicyGuard) // JWT + kiểm tra policy
    @MovieReadPolicy('id')                 // Policy: kiểm tra quyền đọc phim
    async findOne(
        @Param('id', ParseUUIDPipe) id: string, // Validate UUID
        @CurrentUser() user: User,
    ) {
        const movie = await this.moviesService.findById(id, user);
        return { data: movie };
    }

    /**
     * CẬP NHẬT PHIM - PUT /api/movies/:id
     * Admin only. Body: UpdateMovieDto (các trường tùy chọn)
     */
    @Put(':id')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('admin')
    async update(
        @Param('id', ParseUUIDPipe) id: string,
        @Body() dto: UpdateMovieDto,
    ) {
        const movie = await this.moviesService.update(id, dto);
        return { data: movie };
    }

    /**
     * XÓA PHIM - DELETE /api/movies/:id
     * Admin only. Xóa phim + dọn dẹp file S3.
     */
    @Delete(':id')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('admin')
    async delete(@Param('id', ParseUUIDPipe) id: string) {
        const result = await this.moviesService.delete(id);
        return { data: result };
    }

    /**
     * XUẤT BẢN / BỎ XUẤT BẢN - PATCH /api/movies/:id/publish
     * Admin only. Body: { published: true/false }
     */
    @Patch(':id/publish')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('admin')
    async publish(
        @Param('id', ParseUUIDPipe) id: string,
        @Body() dto: PublishDto,
    ) {
        const movie = await this.moviesService.publish(id, dto.published);
        return { data: movie };
    }

    /**
     * XÁC NHẬN UPLOAD HOÀN TẤT - POST /api/movies/:id/upload-complete
     *
     * Admin only. Gọi sau khi frontend upload file lên S3 thành công.
     * Luồng xử lý:
     * 1. UploadService ghi nhận upload
     * 2. Nếu là video → tự động đẩy job encode vào hàng đợi BullMQ
     * 3. Nếu là thumbnail → cập nhật posterUrl trong DB
     */
    @Post(':id/upload-complete')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('admin')
    async uploadComplete(
        @Param('id', ParseUUIDPipe) id: string,
        @Body() dto: UploadCompleteDto,
    ) {
        const result = await this.uploadService.uploadComplete({
            movieId: id,
            objectKey: dto.objectKey,
            fileType: dto.fileType,
        });

        // Log sự kiện upload hoàn tất (structured logging)
        this.logger.log(
            JSON.stringify({
                type: 'upload_complete',
                movieId: id,
            })
        );

        return { data: result };
    }

    /**
     * LẤY URL STREAMING - GET /api/movies/:id/stream
     * User đã đăng nhập. Trả về URL master playlist HLS + quality options.
     */
    @Get(':id/stream')
    @UseGuards(JwtAuthGuard)
    async getStreamUrl(
        @Param('id', ParseUUIDPipe) id: string,
        @CurrentUser() user: User,
    ) {
        const result = await this.moviesService.getStreamUrl(id, user);
        return { data: result };
    }

    /**
     * LẤY TIẾN TRÌNH XEM - GET /api/movies/:id/progress
     * User đã đăng nhập. Trả về số giây đã xem, tổng thời lượng, v.v.
     */
    @Get(':id/progress')
    @UseGuards(JwtAuthGuard)
    async getProgress(
        @Param('id', ParseUUIDPipe) id: string,
        @CurrentUser() user: User,
    ) {
        const result = await this.moviesService.getProgress(id, user.id);
        return { data: result };
    }
}
