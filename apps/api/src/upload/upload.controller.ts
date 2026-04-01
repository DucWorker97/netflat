/**
 * ===== UPLOAD CONTROLLER - API ENDPOINTS UPLOAD FILE =====
 *
 * Định nghĩa các route API cho upload file lên S3/MinIO:
 *
 * GET  /api/upload/presigned-url     → Tạo presigned URL để upload trực tiếp lên S3
 * POST /api/upload/complete/:movieId → Xác nhận upload hoàn tất + trigger encode
 *
 * Tất cả endpoint đều yêu cầu: JWT + Role admin
 * → Chỉ admin mới được upload file (video, poster)
 */

import {
    Controller,
    Get,
    Post,
    Body,
    Param,
    Query,
    UseGuards,
    ParseUUIDPipe,
    Req,
    Logger,
} from '@nestjs/common';
import { Request } from 'express';
import { UploadService } from './upload.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UploadCompleteDto } from './dto/upload-complete.dto';

@Controller('upload')              // Prefix: /api/upload
@UseGuards(JwtAuthGuard, RolesGuard) // Toàn bộ controller yêu cầu JWT + role
@Roles('admin')                    // Chỉ admin mới có quyền upload
export class UploadController {
    private readonly logger = new Logger(UploadController.name);

    constructor(private readonly uploadService: UploadService) { }

    /**
     * TẠO PRESIGNED URL - GET /api/upload/presigned-url
     *
     * Query params:
     * - movieId: UUID của phim
     * - fileName: Tên file gốc
     * - contentType: MIME type (VD: "video/mp4", "image/jpeg")
     * - sizeBytes: Kích thước file (string → parse thành number)
     * - fileType: "video" hoặc "thumbnail" (mặc định "video")
     *
     * Trả về: { data: { uploadUrl, objectKey, expiresAt } }
     *
     * Client sử dụng uploadUrl để PUT file trực tiếp lên S3
     * (không cần qua API server → tiết kiệm bandwidth)
     */
    @Get('presigned-url')
    async getPresignedUrl(
        @Req() req: Request,
        @Query('movieId', ParseUUIDPipe) movieId: string,
        @Query('fileName') fileName: string,
        @Query('contentType') contentType: string,
        @Query('sizeBytes') sizeBytes: string,
        @Query('fileType') fileType?: string,
    ) {
        // Lấy origin/referer từ request header (cho CORS handling)
        const originHeader = Array.isArray(req.headers.origin) ? req.headers.origin[0] : req.headers.origin;
        const refererHeader = Array.isArray(req.headers.referer) ? req.headers.referer[0] : req.headers.referer;

        const result = await this.uploadService.getPresignedUrl({
            movieId,
            fileName,
            contentType,
            sizeBytes: parseInt(sizeBytes, 10),                      // Chuyển string → number
            fileType: (fileType as 'video' | 'thumbnail') || 'video', // Mặc định là video
            origin: originHeader ?? refererHeader,
        });

        return { data: result };
    }

    /**
     * XÁC NHẬN UPLOAD HOÀN TẤT - POST /api/upload/complete/:movieId
     *
     * Gọi SAU KHI client upload file lên S3 thành công.
     * Body: { objectKey, fileType }
     *
     * Nếu fileType = "video" → trigger job encode FFmpeg → HLS
     * Nếu fileType = "thumbnail" → cập nhật posterUrl
     */
    @Post('complete/:movieId')
    async uploadComplete(
        @Param('movieId', ParseUUIDPipe) movieId: string,
        @Body() dto: UploadCompleteDto,
    ) {
        const result = await this.uploadService.uploadComplete({
            movieId,
            objectKey: dto.objectKey,
            fileType: dto.fileType,
        });

        return { data: result };
    }
}
