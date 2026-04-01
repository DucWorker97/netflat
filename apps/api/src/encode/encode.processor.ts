/**
 * ===== ENCODE PROCESSOR - WORKER XỬ LÝ MÃ HÓA VIDEO HLS =====
 *
 * EncodeProcessor là BullMQ worker xử lý các job encode video.
 * Nó được tự động kích hoạt khi có job trong queue "encode".
 *
 * LUỒNG XỬ LÝ ENCODE (5 bước):
 * ┌───────────────────────────────────────────────────────┐
 * │ 1. Download video gốc từ S3 → file tạm (tmpdir)     │  5%→15%
 * │ 2. Encode từng profile (480p, 720p) bằng FFmpeg       │ 15%→80%
 * │    → Tạo HLS segments (.ts) + playlist (.m3u8)       │
 * │ 3. Tạo master playlist (chứa danh sách variants)     │    82%
 * │ 4. Upload tất cả file HLS lên S3                     │ 82%→95%
 * │ 5. Cập nhật DB: encodeStatus = "ready" + playbackUrl  │   100%
 * └───────────────────────────────────────────────────────┘
 *
 * Xử lý lỗi:
 * - Nếu bất kỳ bước nào thất bại → encodeStatus = "failed"
 * - BullMQ tự động retry (tối đa 3 lần, backoff exponential)
 * - File tạm luôn được dọn dẹp (finally block)
 *
 * Concurrency: 1 (chỉ encode 1 video cùng lúc)
 * → Vì FFmpeg sử dụng nhiều CPU, chạy đồng thời sẽ chậm hơn
 */

import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { S3Client, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { EncodeStatus } from '@prisma/client';
import { Job } from 'bullmq';
import { ENCODE_QUEUE, EncodeJobData, HLS_PROFILES } from './encode.constants';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { Readable } from 'stream';
import { pipeline } from 'stream/promises';

// Chuyển execFile thành async/await (Node.js callback → Promise)
const execFileAsync = promisify(execFile);

@Processor(ENCODE_QUEUE, { concurrency: 1 }) // Xử lý 1 job cùng lúc
export class EncodeProcessor extends WorkerHost {
    private readonly logger = new Logger(EncodeProcessor.name);
    private s3: S3Client;
    private bucket: string;

    constructor(
        private prisma: PrismaService,
        private config: ConfigService,
    ) {
        super();
        this.bucket = this.config.get<string>('S3_BUCKET') || 'netflat-media';

        // Khởi tạo S3 client để download/upload file
        this.s3 = new S3Client({
            endpoint: this.config.get<string>('S3_ENDPOINT') || 'http://localhost:9002',
            region: this.config.get<string>('S3_REGION') || 'us-east-1',
            credentials: {
                accessKeyId: this.config.get<string>('S3_ACCESS_KEY') || 'minioadmin',
                secretAccessKey: this.config.get<string>('S3_SECRET_KEY') || 'minioadmin',
            },
            forcePathStyle: true,
        });
    }

    /**
     * HÀM CHÍNH XỬ LÝ JOB ENCODE
     *
     * Được BullMQ gọi tự động khi có job trong queue.
     * @param job - Chứa data: { movieId, objectKey }
     */
    async process(job: Job<EncodeJobData>): Promise<void> {
        const { movieId, objectKey } = job.data;
        this.logger.log(`[encode] Starting job ${job.id} for movie=${movieId}`);

        // Đánh dấu trạng thái đang xử lý trong DB
        await this.prisma.movie.update({
            where: { id: movieId },
            data: { encodeStatus: EncodeStatus.processing },
        });

        // Tạo thư mục tạm để lưu file trong quá trình encode
        // Tên thư mục: encode-{movieId}-{timestamp} (tránh xung đột)
        const tmpDir = path.join(os.tmpdir(), `encode-${movieId}-${Date.now()}`);
        fs.mkdirSync(tmpDir, { recursive: true });

        const inputFile = path.join(tmpDir, 'input.mp4');

        try {
            // ═══ BƯỚC 1: DOWNLOAD VIDEO GỐC TỪ S3 ═══
            await job.updateProgress(5);
            this.logger.log(`[encode] Downloading ${objectKey}…`);
            await this.downloadFromS3(objectKey, inputFile);
            await job.updateProgress(15);

            // ═══ BƯỚC 2: ENCODE TỪ PROFILE (FFmpeg → HLS) ═══
            const hlsDir = path.join(tmpDir, 'hls');
            fs.mkdirSync(hlsDir, { recursive: true });

            // Lặp qua từng profile (480p, 720p) và encode
            for (let i = 0; i < HLS_PROFILES.length; i++) {
                const profile = HLS_PROFILES[i];
                const variantDir = path.join(hlsDir, profile.suffix); // v0/, v1/
                fs.mkdirSync(variantDir, { recursive: true });

                this.logger.log(`[encode] Encoding ${profile.name} (${profile.suffix})…`);
                await this.encodeVariant(inputFile, variantDir, profile);

                // Cập nhật tiến trình: 15% → 80%
                const pct = 15 + ((i + 1) / HLS_PROFILES.length) * 65;
                await job.updateProgress(Math.round(pct));
            }

            // ═══ BƯỚC 3: TẠO MASTER PLAYLIST ═══
            await job.updateProgress(82);
            const masterContent = this.buildMasterPlaylist();
            fs.writeFileSync(path.join(hlsDir, 'master.m3u8'), masterContent);

            // ═══ BƯỚC 4: UPLOAD TẤT CẢ FILE HLS LÊN S3 ═══
            this.logger.log(`[encode] Uploading HLS files to S3…`);
            await this.uploadHlsToS3(hlsDir, movieId);
            await job.updateProgress(95);

            // ═══ BƯỚC 5: CẬP NHẬT DB → READY ═══
            const publicBase = this.config.get<string>('S3_PUBLIC_BASE_URL') || 'http://localhost:9002/netflat-media';
            const playbackUrl = `${publicBase}/hls/${movieId}/master.m3u8`;

            await this.prisma.movie.update({
                where: { id: movieId },
                data: {
                    encodeStatus: EncodeStatus.ready,  // Đánh dấu encode xong
                    playbackUrl,                        // URL để video player phát
                },
            });

            await job.updateProgress(100);
            this.logger.log(`[encode] Movie ${movieId} is READY → ${playbackUrl}`);
        } catch (err) {
            // Nếu lỗi → đánh dấu failed trong DB
            this.logger.error(`[encode] Failed for movie=${movieId}: ${err}`);
            await this.prisma.movie.update({
                where: { id: movieId },
                data: { encodeStatus: EncodeStatus.failed },
            });
            throw err; // Throw để BullMQ biết job thất bại → retry
        } finally {
            // LUÔN DỌN DẸP file tạm (dù thành công hay thất bại)
            fs.rmSync(tmpDir, { recursive: true, force: true });
        }
    }

    // ═══════════════════════════════════════════════
    // CÁC HÀM HELPER
    // ═══════════════════════════════════════════════

    /**
     * DOWNLOAD FILE TỪ S3 → DISK
     * Sử dụng stream pipeline để xử lý file lớn mà không tốn RAM
     */
    private async downloadFromS3(key: string, dest: string): Promise<void> {
        const command = new GetObjectCommand({ Bucket: this.bucket, Key: key });
        const response = await this.s3.send(command);
        const body = response.Body as Readable;
        // Stream: S3 → file (không load toàn bộ vào memory)
        await pipeline(body, fs.createWriteStream(dest));
    }

    /**
     * ENCODE MỘT VARIANT (VD: 480p hoặc 720p)
     *
     * Sử dụng FFmpeg để chuyển đổi video gốc thành HLS:
     * - Scale video về đúng độ phân giải (pad nếu cần giữ tỷ lệ)
     * - Codec video: H.264 (libx264), preset fast
     * - Codec audio: AAC, 44100 Hz
     * - HLS segment: 6 giây mỗi đoạn
     * - Output: playlist (.m3u8) + segments (.ts)
     */
    private async encodeVariant(
        inputFile: string,
        outputDir: string,
        profile: typeof HLS_PROFILES[number],
    ): Promise<void> {
        const segmentFile = path.join(outputDir, 'prog_index.m3u8');

        // Xây dựng command line FFmpeg
        const args = [
            '-i', inputFile,                          // Input file
            // Scale + pad: Giữ tỷ lệ khung hình gốc, thêm viền đen nếu cần
            '-vf', `scale=${profile.width}:${profile.height}:force_original_aspect_ratio=decrease,pad=${profile.width}:${profile.height}:(ow-iw)/2:(oh-ih)/2`,
            '-c:v', 'libx264',                        // Video codec: H.264
            '-preset', 'fast',                         // Tốc độ encode (fast: cân bằng chất lượng/tốc độ)
            '-b:v', profile.videoBitrate,              // Bitrate video (VD: "1000k")
            '-maxrate', profile.videoBitrate,          // Bitrate tối đa
            '-bufsize', `${parseInt(profile.videoBitrate) * 2}k`, // Buffer size = 2x bitrate
            '-c:a', 'aac',                             // Audio codec: AAC
            '-b:a', profile.audioBitrate,              // Bitrate audio
            '-ar', '44100',                            // Sample rate: 44.1kHz
            '-hls_time', '6',                          // Mỗi segment dài 6 giây
            '-hls_list_size', '0',                     // Giữ tất cả segment trong playlist
            '-hls_segment_filename', path.join(outputDir, 'seg_%03d.ts'), // Tên file segment
            '-f', 'hls',                               // Format output: HLS
            segmentFile,                               // File output playlist
            '-y',                                       // Ghi đè nếu file đã tồn tại
        ];

        // Chạy FFmpeg (từ biến FFMPEG_PATH hoặc mặc định "ffmpeg")
        const ffmpegBin = this.config.get<string>('FFMPEG_PATH') || 'ffmpeg';
        await execFileAsync(ffmpegBin, args, { maxBuffer: 50 * 1024 * 1024 });
    }

    /**
     * TẠO NỘI DUNG MASTER PLAYLIST (master.m3u8)
     *
     * Master playlist là file m3u8 chứa danh sách các variant (480p, 720p).
     * Video player (HLS.js) đọc file này để biết có những chất lượng nào
     * và tự động chọn chất lượng phù hợp với bandwidth.
     *
     * Format:
     *   #EXTM3U
     *   #EXT-X-STREAM-INF:BANDWIDTH=1000000,RESOLUTION=854x480,NAME="480p"
     *   v0/prog_index.m3u8
     *   #EXT-X-STREAM-INF:BANDWIDTH=2500000,RESOLUTION=1280x720,NAME="720p"
     *   v1/prog_index.m3u8
     */
    private buildMasterPlaylist(): string {
        const lines = ['#EXTM3U'];
        for (const profile of HLS_PROFILES) {
            const bps = parseInt(profile.videoBitrate) * 1000; // Đổi "1000k" → 1000000 bps
            lines.push(
                `#EXT-X-STREAM-INF:BANDWIDTH=${bps},RESOLUTION=${profile.width}x${profile.height},NAME="${profile.name}"`,
                `${profile.suffix}/prog_index.m3u8`, // Đường dẫn tương đối tới variant
            );
        }
        return lines.join('\n') + '\n';
    }

    /**
     * UPLOAD TẤT CẢ FILE HLS LÊN S3
     *
     * Duyệt đệ quy thư mục HLS cục bộ → upload từng file lên S3
     * Cấu trúc trên S3: hls/{movieId}/{relPath}
     *
     * Content-Type:
     * - .m3u8 → application/vnd.apple.mpegurl (HLS playlist)
     * - .ts   → video/mp2t (MPEG transport stream)
     */
    private async uploadHlsToS3(hlsLocalDir: string, movieId: string): Promise<void> {
        // Lấy danh sách tất cả file trong thư mục (đệ quy)
        const files = this.walkDir(hlsLocalDir);

        for (const filePath of files) {
            // Chuyển đường dẫn local → đường dẫn S3
            // VD: C:\tmp\encode\hls\v0\seg_000.ts → hls/{movieId}/v0/seg_000.ts
            const relPath = path.relative(hlsLocalDir, filePath).replace(/\\/g, '/');
            const s3Key = `hls/${movieId}/${relPath}`;

            // Xác định Content-Type phù hợp
            const contentType = filePath.endsWith('.m3u8')
                ? 'application/vnd.apple.mpegurl'   // Playlist HLS
                : 'video/mp2t';                      // Segment video

            const body = fs.readFileSync(filePath);
            await this.s3.send(new PutObjectCommand({
                Bucket: this.bucket,
                Key: s3Key,
                Body: body,
                ContentType: contentType,
            }));
        }
    }

    /**
     * DUYỆT ĐỆ QUY THƯ MỤC → LẤY DANH SÁCH TẤT CẢ FILE
     * (tương tự `find . -type f`)
     */
    private walkDir(dir: string): string[] {
        const results: string[] = [];
        for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
            const fullPath = path.join(dir, entry.name);
            if (entry.isDirectory()) {
                results.push(...this.walkDir(fullPath)); // Đệ quy vào thư mục con
            } else {
                results.push(fullPath); // Thêm file vào kết quả
            }
        }
        return results;
    }
}
