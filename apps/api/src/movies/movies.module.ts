/**
 * ===== MOVIES MODULE - CẤU HÌNH MODULE PHIM =====
 *
 * MoviesModule quản lý chức năng cốt lõi của ứng dụng: quản lý phim.
 *
 * Dependencies:
 * - UploadModule: Inject UploadService để xử lý upload-complete
 *   (khi admin hoàn thành upload video/poster cho phim)
 * - MoviesService: Logic CRUD phim (tạo, sửa, xóa, tìm kiếm, streaming)
 * - MoviesController: Định nghĩa API endpoints cho phim
 *
 * Exports MoviesService để các module khác có thể inject
 * (VD: FavoritesModule cần kiểm tra phim tồn tại)
 */

import { Module } from '@nestjs/common';
import { MoviesController } from './movies.controller';
import { MoviesService } from './movies.service';

import { UploadModule } from '../upload/upload.module';

@Module({
    imports: [UploadModule],           // Import UploadModule để dùng UploadService
    controllers: [MoviesController],   // Đăng ký controller xử lý route
    providers: [MoviesService],        // Đăng ký service logic nghiệp vụ
    exports: [MoviesService],          // Xuất cho module khác inject
})
export class MoviesModule { }
