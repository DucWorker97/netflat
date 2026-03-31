/**
 * ===== STORAGE URL UTILS - CHUẨN HÓA URL TRUY CẬP FILE S3 =====
 *
 * Các hàm tiện ích chuẩn hóa URL truy cập file trên S3/MinIO.
 *
 * Vấn đề: URL file trên S3 có thể ở nhiều format khác nhau:
 * - Absolute: "http://localhost:9002/netflat-media/posters/abc.jpg"
 * - Key only: "posters/abc.jpg"
 * - With bucket: "netflat-media/posters/abc.jpg"
 * - With slash: "/netflat-media/posters/abc.jpg"
 *
 * Giải pháp: normalizeS3AssetUrl() chuẩn hóa tất cả thành URL đầy đủ:
 * → "http://localhost:9002/netflat-media/posters/abc.jpg"
 */

/**
 * BỎ DẤU "/" CUỐI CHUỖI
 * VD: "http://host/" → "http://host"
 * Dùng để tránh double slash khi nối URL
 */
function trimTrailingSlash(value: string): string {
    return value.replace(/\/+$/, '');
}

/**
 * TẠO URL CÔNG KHAI ĐẦY ĐỦ TỪ BASE URL + OBJECT KEY
 *
 * @param s3PublicBaseUrl - Base URL công khai S3 (VD: "http://localhost:9002/netflat-media")
 * @param objectKey       - Key trên S3 (VD: "posters/abc.jpg")
 * @returns URL đầy đủ: "http://localhost:9002/netflat-media/posters/abc.jpg"
 */
export function buildS3PublicUrl(s3PublicBaseUrl: string, objectKey: string): string {
    const base = trimTrailingSlash(s3PublicBaseUrl);
    const key = objectKey.replace(/^\/+/, ''); // Bỏ "/" đầu của key
    return `${base}/${key}`;
}

/**
 * CHUẨN HÓA URL FILE S3 THÀNH URL CÔNG KHAI
 *
 * Nhận vào URL ở bất kỳ format nào → trả về URL đầy đủ (public URL).
 *
 * Các trường hợp xử lý:
 * 1. null/undefined/rỗng → trả null
 * 2. Đã là URL đầy đủ (bắt đầu bằng base) → trả nguyên
 * 3. Chứa /{bucket}/ marker → trích objectKey phần sau bucket
 * 4. Bắt đầu bằng bucket/ → bỏ bucket prefix
 * 5. Bắt đầu bằng /bucket/ → bỏ /bucket prefix
 * 6. Bắt đầu bằng tên thư mục đã biết (posters, hls, originals, thumbnails)
 *    → dùng làm objectKey trực tiếp
 * 7. Không khớp pattern nào → trả nguyên (có thể là URL tuyệt đối khác)
 *
 * @param rawUrl          - URL cần chuẩn hóa (có thể null)
 * @param s3PublicBaseUrl - Base URL công khai S3
 * @param bucket          - Tên bucket S3 (VD: "netflat-media")
 * @returns URL đầy đủ hoặc null
 */
export function normalizeS3AssetUrl(
    rawUrl: string | null | undefined,
    s3PublicBaseUrl: string,
    bucket: string,
): string | null {
    if (!rawUrl) return null;

    const base = trimTrailingSlash(s3PublicBaseUrl);
    const normalized = rawUrl.trim();
    if (!normalized) return null;

    // Trường hợp 2: Đã là URL đầy đủ → trả nguyên
    if (normalized === base || normalized.startsWith(`${base}/`)) {
        return normalized;
    }

    // Tìm objectKey từ URL bằng cách nhận diện vị trí bucket
    const bucketMarker = `/${bucket}/`;
    let objectKey: string | null = null;

    // Trường hợp 3: URL chứa /{bucket}/ → lấy phần sau
    // VD: "http://other-host/netflat-media/posters/abc.jpg" → "posters/abc.jpg"
    const markerIndex = normalized.indexOf(bucketMarker);
    if (markerIndex >= 0) {
        objectKey = normalized.slice(markerIndex + bucketMarker.length);
    }
    // Trường hợp 4: Bắt đầu bằng "netflat-media/..."
    else if (normalized.startsWith(`${bucket}/`)) {
        objectKey = normalized.slice(bucket.length + 1);
    }
    // Trường hợp 5: Bắt đầu bằng "/netflat-media/..."
    else if (normalized.startsWith(`/${bucket}/`)) {
        objectKey = normalized.slice(bucket.length + 2);
    }
    // Trường hợp 6: Bắt đầu bằng tên thư mục đã biết
    // → objectKey trực tiếp (VD: "posters/abc.jpg", "hls/id/master.m3u8")
    else if (/^(posters|thumbnails|hls|originals)\//i.test(normalized)) {
        objectKey = normalized;
    }

    // Trường hợp 7: Không nhận diện được → trả nguyên
    if (!objectKey) {
        return normalized;
    }

    // Tạo URL đầy đủ từ base + objectKey
    return buildS3PublicUrl(base, objectKey);
}
