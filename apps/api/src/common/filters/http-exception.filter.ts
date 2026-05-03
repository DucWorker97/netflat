/**
 * ===== HTTP EXCEPTION FILTER - BỘ LỌC LỖI TOÀN CỤC =====
 *
 * HttpExceptionFilter bắt TẤT CẢ exception trong ứng dụng
 * và chuẩn hóa format lỗi trả về client.
 *
 * Vấn đề: NestJS mặc định trả lỗi ở nhiều format khác nhau
 *   - HttpException: { statusCode, message }
 *   - Validation: { statusCode, message: [...], error }
 *   - Unhandled: stack trace (bảo mật kém!)
 *
 * Giải pháp: Chuẩn hóa thành format thống nhất:
 * {
 *   "error": {
 *     "code": "VALIDATION_FAILED",       // Mã lỗi dạng CONSTANT_CASE
 *     "message": "Validation failed",    // Mô tả lỗi
 *     "details": { "errors": [...] },    // Chi tiết (tùy chọn)
 *     "requestId": "abc-123-..."         // ID request để debug
 *   }
 * }
 *
 * @Catch() không có parameter → bắt TẤT CẢ exception (HttpException, Error, v.v.)
 */

import {
    ExceptionFilter,
    Catch,
    ArgumentsHost,
    HttpException,
    HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';

/** Interface chuẩn cho response lỗi */
interface ErrorResponse {
    error: {
        code: string;                              // Mã lỗi: "BAD_REQUEST", "UNAUTHORIZED", v.v.
        message: string;                            // Mô tả lỗi cho user
        details?: Record<string, unknown> | null;   // Chi tiết bổ sung (VD: validation errors)
        requestId: string;                          // UUID request (cho debugging)
    };
}

@Catch() // Bắt TẤT CẢ loại exception
export class HttpExceptionFilter implements ExceptionFilter {
    /**
     * Handler xử lý exception
     *
     * Luồng xử lý:
     * 1. Lấy request và response từ context
     * 2. Lấy requestId (đã được RequestIdMiddleware gắn)
     * 3. Phân loại exception:
     *    a. HttpException (NestJS): Lấy status, code, message từ exception
     *    b. Error (JavaScript): Lấy message, status = 500
     *    c. Unknown: Message mặc định, status = 500
     * 4. Xử lý đặc biệt: class-validator errors (mảng message)
     * 5. Trả response theo format chuẩn
     */
    catch(exception: unknown, host: ArgumentsHost) {
        const ctx = host.switchToHttp();
        const response = ctx.getResponse<Response>();
        const request = ctx.getRequest<Request>();

        // Lấy requestId từ middleware (gắn bởi RequestIdMiddleware)
        const requestId = (request as Request & { requestId?: string }).requestId || 'unknown';

        // Giá trị mặc định cho lỗi không xác định
        let status = HttpStatus.INTERNAL_SERVER_ERROR;
        let code = 'INTERNAL_SERVER_ERROR';
        let message = 'An unexpected error occurred';
        let details: Record<string, unknown> | null = null;

        if (exception instanceof HttpException) {
            // ─── XỬ LÝ HTTP EXCEPTION (NestJS) ───
            status = exception.getStatus();
            const exceptionResponse = exception.getResponse();

            if (typeof exceptionResponse === 'string') {
                // Response dạng string đơn giản
                message = exceptionResponse;
            } else if (typeof exceptionResponse === 'object') {
                // Response dạng object (chứa code, message, details)
                const resp = exceptionResponse as Record<string, unknown>;
                message = (resp.message as string) || message;
                code = (resp.code as string) || this.getCodeFromStatus(status);
                details = (resp.details as Record<string, unknown>) || null;

                // ─── XỬ LÝ LỖI VALIDATION (class-validator) ───
                // class-validator trả message dưới dạng mảng string
                // VD: ["email must be an email", "password is too short"]
                if (Array.isArray(resp.message)) {
                    message = 'Validation failed';
                    code = 'VALIDATION_FAILED';
                    details = { errors: resp.message }; // Gói mảng lỗi vào details
                }
            }
        } else if (exception instanceof Error) {
            // ─── XỬ LÝ ERROR THƯỜNG (JavaScript Error) ───
            message = exception.message;
            // Log chi tiết ra console (nhưng KHÔNG trả stack trace cho client)
            console.error('Unhandled exception:', exception);
        }

        // Tạo response theo format chuẩn
        const errorResponse: ErrorResponse = {
            error: {
                code,
                message,
                details,
                requestId, // Gắn requestId để frontend/ops có thể trace lỗi
            },
        };

        response.status(status).json(errorResponse);
    }

    /**
     * CHUYỂN HTTP STATUS CODE → ERROR CODE
     * Dùng khi exception không có code riêng
     */
    private getCodeFromStatus(status: number): string {
        switch (status) {
            case 400: return 'BAD_REQUEST';
            case 401: return 'UNAUTHORIZED';
            case 403: return 'FORBIDDEN';
            case 404: return 'NOT_FOUND';
            case 409: return 'CONFLICT';
            case 422: return 'VALIDATION_FAILED';
            default:  return 'INTERNAL_SERVER_ERROR';
        }
    }
}
