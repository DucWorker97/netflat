/**
 * ===== MAIN.TS - ĐIỂM KHỞI CHẠY ỨNG DỤNG NETFLAT API =====
 *
 * File này là điểm vào (entry point) của toàn bộ server API.
 * Nó khởi tạo ứng dụng NestJS, cấu hình các middleware bảo mật,
 * validation, CORS, và lắng nghe kết nối HTTP.
 *
 * Luồng khởi chạy:
 *  1. Tạo ứng dụng NestJS từ AppModule (module gốc)
 *  2. Cấu hình prefix "/api" cho tất cả route (trừ health check)
 *  3. Bật CORS cho phép frontend gọi API cross-origin
 *  4. Gắn middleware Request ID (gán mã UUID cho mỗi request)
 *  5. Gắn filter xử lý lỗi toàn cục (chuẩn hóa format lỗi trả về)
 *  6. Gắn ValidationPipe toàn cục (tự động validate DTO input)
 *  7. Gắn Helmet (thêm các HTTP security headers chống XSS, clickjacking...)
 *  8. Lắng nghe port (mặc định 3000) và sẵn sàng nhận request
 */

import 'reflect-metadata';
import helmet from 'helmet';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { RequestIdMiddleware } from './common/middleware/request-id.middleware';
import { SecurityConfig } from './config/security.config';

async function bootstrap() {
    // Bước 1: Khởi tạo ứng dụng NestJS từ module gốc (AppModule)
    const app = await NestFactory.create(AppModule);

    // Lấy ConfigService để đọc biến môi trường (.env)
    const configService = app.get(ConfigService);

    // Lấy cấu hình bảo mật (CORS origins, JWT TTL, v.v.)
    const security = configService.getOrThrow<SecurityConfig>('security');

    // Ẩn header "x-powered-by" để không lộ công nghệ backend (bảo mật)
    app.getHttpAdapter().getInstance().disable('x-powered-by');

    // Bước 2: Đặt prefix "/api" cho tất cả route
    // Ví dụ: /auth/login → /api/auth/login
    // Ngoại trừ: /health (để monitoring dễ dàng gọi trực tiếp)
    app.setGlobalPrefix('api', {
        exclude: ['health'],
    });

    // Bước 3: Bật CORS - cho phép frontend (khác domain) gọi API
    // origins: Danh sách domain được phép (từ .env)
    // credentials: Cho phép gửi cookie/token kèm request
    app.enableCors({
        origin: security.cors.origins,
        credentials: security.cors.credentials,
    });

    // Bước 4: Middleware Request ID - gán UUID duy nhất cho mỗi request
    // Giúp theo dõi (tracing) request xuyên suốt hệ thống
    app.use(new RequestIdMiddleware().use.bind(new RequestIdMiddleware()));

    // Bước 5: Filter xử lý lỗi toàn cục
    // Chuẩn hóa tất cả lỗi trả về theo format: { error: { code, message, requestId } }
    app.useGlobalFilters(new HttpExceptionFilter());

    // Bước 6: ValidationPipe toàn cục - tự động validate dữ liệu đầu vào
    // - whitelist: Tự động loại bỏ các field không được khai báo trong DTO
    // - transform: Tự động chuyển đổi kiểu dữ liệu (string → number, v.v.)
    // - forbidNonWhitelisted: Trả lỗi nếu client gửi field không hợp lệ
    // - enableImplicitConversion: Cho phép chuyển đổi kiểu ngầm định
    app.useGlobalPipes(
        new ValidationPipe({
            whitelist: true,
            transform: true,
            forbidNonWhitelisted: true,
            transformOptions: {
                enableImplicitConversion: true,
            },
        }),
    );

    // Bước 7: Helmet - thêm các HTTP security headers
    // Chống XSS, clickjacking, MIME sniffing, và nhiều kiểu tấn công khác
    app.use(helmet());

    // Bước 8: Lắng nghe port và khởi chạy server
    // Đọc PORT từ biến môi trường, mặc định là 3000
    // '0.0.0.0' = lắng nghe trên tất cả network interfaces (cần cho Docker)
    const port = Number(configService.get<string>('PORT') || '3000');
    await app.listen(port, '0.0.0.0');
    console.log(`🚀 API running on http://localhost:${port}`);
    console.log(`📋 Health check: http://localhost:${port}/health`);
}

// Gọi hàm bootstrap để khởi chạy ứng dụng
bootstrap();
