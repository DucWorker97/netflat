/**
 * ===== ENCODE CONSTANTS - HẰNG SỐ CHO MODULE MÃ HÓA VIDEO =====
 *
 * Định nghĩa các hằng số cho hệ thống encode video:
 * - Tên queue và job trong BullMQ
 * - Interface dữ liệu truyền vào job
 * - Profiles chất lượng HLS (480p, 720p)
 */

/** Tên hàng đợi BullMQ cho encode job */
export const ENCODE_QUEUE = 'encode';
/** Tên job trong queue */
export const ENCODE_JOB = 'encode-hls';

/**
 * Interface dữ liệu job encode.
 * Được truyền từ UploadService khi thêm job vào queue.
 */
export interface EncodeJobData {
    movieId: string;       // ID phim cần encode
    objectKey: string;     // Key file gốc trên S3 (VD: originals/{movieId}/{file})
}

/**
 * CÁC PROFILE MÃ HÓA HLS
 *
 * Mỗi profile định nghĩa một mức chất lượng video:
 * - name: Tên hiển thị (VD: "480p", "720p")
 * - width x height: Độ phân giải
 * - videoBitrate: Bitrate video (VD: "1000k" = 1 Mbps)
 * - audioBitrate: Bitrate audio
 * - suffix: Tên thư mục trên S3 (v0, v1)
 *
 * Cấu trúc file HLS trên S3 sau encode:
 *   hls/{movieId}/master.m3u8       ← Master playlist (trỏ tới các variant)
 *   hls/{movieId}/v0/prog_index.m3u8 ← Variant playlist 480p
 *   hls/{movieId}/v0/seg_000.ts      ← Video segment 480p
 *   hls/{movieId}/v1/prog_index.m3u8 ← Variant playlist 720p
 *   hls/{movieId}/v1/seg_000.ts      ← Video segment 720p
 */
export const HLS_PROFILES = [
    { name: '480p', width: 854, height: 480, videoBitrate: '1000k', audioBitrate: '128k', suffix: 'v0' },
    { name: '720p', width: 1280, height: 720, videoBitrate: '2500k', audioBitrate: '192k', suffix: 'v1' },
] as const;
