/**
 * ===== REQUEST ID MIDDLEWARE - GẮN MÃ ĐỊNH DANH CHO MỖI REQUEST =====
 *
 * RequestIdMiddleware gắn một UUID duy nhất cho mỗi HTTP request.
 * UUID này giúp theo dõi (tracing) một request xuyên suốt hệ thống.
 *
 * Chức năng:
 * 1. Gắn requestId cho request:
 *    - Nếu client gửi header "x-request-id" → dùng luôn (distributed tracing)
 *    - Nếu không → tự tạo UUID v4 mới
 * 2. Trả requestId trong response header "x-request-id"
 *    → Client nhận được để debug/report lỗi
 * 3. Log structured (JSON) khi request hoàn thành:
 *    - Method, path, status code, thời gian xử lý (ms)
 *    - Bỏ qua /health (giảm noise trong log)
 *
 * Lợi ích:
 * - Debugging: Tìm log hệ thống bằng requestId khi có lỗi
 * - Monitoring: Đo thời gian phản hồi từng request
 * - Distributed tracing: Liên kết request qua nhiều service
 *
 * Mở rộng global Express.Request:
 * - Thêm property requestId? và startTime? vào interface Request
 */

import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';

// Mở rộng Express Request interface (TypeScript declaration merging)
// → Cho phép gắn thuộc tính requestId và startTime vào request object
declare global {
    // eslint-disable-next-line @typescript-eslint/no-namespace
    namespace Express {
        interface Request {
            requestId?: string;   // UUID duy nhất cho request
            startTime?: number;   // Thời điểm bắt đầu (ms) để tính thời gian xử lý
        }
    }
}

@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
    // Logger riêng cho HTTP (tên logger: "HTTP")
    private readonly logger = new Logger('HTTP');

    /**
     * Middleware handler - được gọi cho MỌI request HTTP
     *
     * @param req  - Express Request object
     * @param res  - Express Response object
     * @param next - Callback gọi middleware/handler tiếp theo
     */
    use(req: Request, res: Response, next: NextFunction) {
        // Bước 1: Lấy requestId từ header hoặc tự tạo UUID mới
        // Nếu client (VD: API gateway, load balancer) gửi header "x-request-id"
        // → dùng luôn để duy trì chuỗi tracing xuyên suốt các service
        const requestId = (req.headers['x-request-id'] as string) || uuidv4();
        const startTime = Date.now();

        // Bước 2: Gắn requestId và startTime vào request object
        // → Các handler/guard/filter sau có thể đọc request.requestId
        req.requestId = requestId;
        req.startTime = startTime;

        // Bước 3: Trả requestId trong response header
        // → Client nhận được để report lỗi: "Lỗi ở request ID: abc-123"
        res.setHeader('x-request-id', requestId);

        // Bước 4: Đăng ký callback khi response hoàn tất
        // Event 'finish' được trigger khi response đã gửi xong cho client
        res.on('finish', () => {
            const duration = Date.now() - startTime;
            const { method, originalUrl } = req;
            const { statusCode } = res;

            // Bỏ qua health check (endpoint gọi liên tục bởi monitoring)
            // → Giảm noise trong log
            if (originalUrl === '/health') return;

            // Log structured JSON (dễ parse bằng ELK, Cloudwatch, Datadog...)
            this.logger.log(
                JSON.stringify({
                    service: 'api',                              // Tên service
                    env: process.env.NODE_ENV || 'development',  // Môi trường
                    type: 'http',                                 // Loại log
                    requestId,                                    // ID request
                    method,                                       // HTTP method (GET, POST, ...)
                    path: originalUrl,                            // Đường dẫn request
                    status: statusCode,                           // HTTP status (200, 404, ...)
                    durationMs: duration,                         // Thời gian xử lý (ms)
                    // User-Agent: Cắt 100 ký tự đầu (tránh log quá dài)
                    userAgent: req.headers['user-agent']?.substring(0, 100),
                })
            );
        });

        // Bước 5: Chuyển tiếp sang middleware/handler tiếp theo
        next();
    }
}
