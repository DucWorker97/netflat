/**
 * ===== LOGGING UTILS - TIỆN ÍCH LOG AN TOÀN =====
 *
 * Các hàm logging an toàn, đảm bảo KHÔNG bao giờ log
 * presigned URL đầy đủ (chứa chữ ký S3 bảo mật).
 *
 * BẢO MẬT: Presigned URL chứa chữ ký (X-Amz-Signature)
 * → Nếu bị lộ qua log, kẻ tấn công có thể dùng URL để
 * truy cập file trên S3 mà không cần credential.
 *
 * Giải pháp: Mask query string trước khi log
 * VD: "https://host/bucket/key?X-Amz-Signature=abc123"
 *   → "https://host/bucket/key?[MASKED]"
 */

/**
 * CHE GIẤU PRESIGNED URL CHO LOG
 *
 * Giữ lại phần path (để debug) nhưng ẩn query string (chứa chữ ký).
 *
 * @example
 * maskPresignedUrl('https://minio:9000/bucket/key?X-Amz-Signature=...')
 * // Returns: 'https://minio:9000/bucket/key?[MASKED]'
 *
 * Xử lý 2 cách:
 * 1. Parse URL → bỏ query string (nếu URL hợp lệ)
 * 2. Cắt tại dấu '?' (nếu URL không parse được)
 */
export function maskPresignedUrl(url: string): string {
    try {
        const parsed = new URL(url);
        // Nếu có query string → thay bằng [MASKED]
        if (parsed.search) {
            return `${parsed.origin}${parsed.pathname}?[MASKED]`;
        }
        return url;
    } catch {
        // URL không hợp lệ → cắt thủ công tại dấu ?
        const qIndex = url.indexOf('?');
        if (qIndex > 0) {
            return url.substring(0, qIndex) + '?[MASKED]';
        }
        return url;
    }
}

/**
 * RÚT GỌN S3 OBJECT KEY CHO LOG
 *
 * Key dài (> maxLength) được rút gọn: giữ 15 ký tự đầu + cuối.
 * VD: "originals/abc123-very-long-filename-here.mp4"
 *   → "originals/abc12...lename-here.mp4"
 */
export function maskObjectKey(key: string, maxLength = 40): string {
    if (key.length <= maxLength) return key;
    const start = key.substring(0, 15); // 15 ký tự đầu
    const end = key.substring(key.length - 15); // 15 ký tự cuối
    return `${start}...${end}`;
}

/**
 * CHE GIẤU URL TRONG OBJECT (ĐỆ QUY)
 *
 * Duyệt đệ quy tất cả property của object:
 * - Nếu là string chứa chữ ký S3 → mask URL
 * - Nếu là string URL có query string → mask URL
 * - Nếu là object → đệ quy vào bên trong
 *
 * Sử dụng để log toàn bộ object mà không sợ lộ chữ ký S3.
 *
 * @example
 * maskObjectForLogging({ uploadUrl: 'https://...?X-Amz-Signature=abc', movieId: '123' })
 * // { uploadUrl: 'https://...?[MASKED]', movieId: '123' }
 */
export function maskObjectForLogging<T extends Record<string, any>>(obj: T): T {
    const masked = { ...obj } as Record<string, any>;

    for (const key of Object.keys(masked)) {
        const value = masked[key];

        if (typeof value === 'string') {
            // Kiểm tra có phải presigned URL (chứa chữ ký AWS S3)
            if (
                value.includes('X-Amz-Signature') ||
                value.includes('X-Amz-Credential') ||
                value.includes('Signature=')
            ) {
                masked[key] = maskPresignedUrl(value);
            }
            // Kiểm tra có phải URL có query string
            else if (value.startsWith('http') && value.includes('?')) {
                masked[key] = maskPresignedUrl(value);
            }
        } else if (typeof value === 'object' && value !== null) {
            // Đệ quy vào object lồng nhau
            masked[key] = maskObjectForLogging(value);
        }
    }

    return masked as T;
}
