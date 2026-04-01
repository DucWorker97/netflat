/**
 * ===== UPLOAD SERVICE - LOGIC UPLOAD FILE LÊN S3/MINIO =====
 *
 * UploadService xử lý toàn bộ luồng upload file (video + poster):
 *
 * Luồng upload 2 bước (Presigned URL pattern):
 * 1. Client gọi API → server tạo presigned URL (chữ ký tạm thời)
 * 2. Client upload TRỰC TIẾP lên S3 bằng presigned URL (không qua server)
 * 3. Client gọi API upload-complete → server ghi nhận + trigger encode
 *
 * Lợi ích của Presigned URL:
 * - Server không phải xử lý file lớn → tiết kiệm RAM/bandwidth
 * - File truyền trực tiếp client → S3 → nhanh hơn
 * - Presigned URL có giới hạn thời gian → bảo mật
 *
 * Tích hợp:
 * - S3/MinIO: Lưu trữ file
 * - BullMQ: Queue encode job khi upload video hoàn tất
 * - Prisma: Ghi nhận upload record và cập nhật movie
 */

import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { S3Client, PutObjectCommand, HeadBucketCommand, CreateBucketCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { PrismaService } from '../prisma/prisma.service';
import { EncodeStatus, UploadFileType, UploadStatus } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';
import { ENCODE_QUEUE, ENCODE_JOB, EncodeJobData } from '../encode/encode.constants';
import { buildS3PublicUrl } from '../common/utils/storage-url';

/**
 * Tham số cần thiết để tạo presigned URL upload
 */
interface PresignedUrlParams {
    movieId: string;        // ID phim liên quan
    fileName: string;       // Tên file gốc từ client
    contentType: string;    // MIME type (VD: "video/mp4", "image/jpeg")
    sizeBytes: number;      // Kích thước file (bytes)
    fileType: 'video' | 'thumbnail'; // Loại file
    origin?: string;        // Origin header (cho CORS)
}

/**
 * Tham số khi xác nhận upload hoàn tất
 */
interface UploadCompleteParams {
    movieId: string;
    objectKey: string;      // Khóa file trên S3 (VD: "originals/{movieId}/{uuid}-filename.mp4")
    fileType?: 'video' | 'thumbnail';
}

@Injectable()
export class UploadService {
    private readonly logger = new Logger(UploadService.name);

    // Client S3 cho presigned URL (có thể dùng endpoint khác cho CORS trên LAN)
    private s3PresignClient: S3Client;
    // Client S3 cho thao tác storage nội bộ (tạo bucket, v.v.)
    private s3StorageClient: S3Client;
    private bucket: string;               // Tên bucket S3
    private maxSizeBytes: number;          // Giới hạn kích thước file upload (bytes)
    private presignEndpoint: string;       // Endpoint S3 cho presigned URL
    private storageEndpoint: string;       // Endpoint S3 cho storage nội bộ
    private bucketReady = false;           // Flag: bucket đã tồn tại chưa
    private bucketEnsurePromise: Promise<void> | null = null; // Promise đảm bảo bucket tồn tại

    constructor(
        private prisma: PrismaService,
        private configService: ConfigService,
        // Inject hàng đợi encode (BullMQ) để thêm job khi upload video hoàn tất
        @InjectQueue(ENCODE_QUEUE) private encodeQueue: Queue<EncodeJobData>,
    ) {
        this.bucket = this.configService.get<string>('S3_BUCKET') || 'netflat-media';
        // Tính giới hạn upload: đổi MB → bytes
        this.maxSizeBytes = (parseInt(this.configService.get<string>('UPLOAD_MAX_MB') || '500', 10)) * 1024 * 1024;

        // Khởi tạo 2 client S3 (có thể khác endpoint cho presign vs storage)
        this.presignEndpoint = this.resolvePresignEndpoint();
        this.storageEndpoint = this.resolveStorageEndpoint();
        this.s3PresignClient = this.buildPresignClient(this.presignEndpoint);
        this.s3StorageClient = this.buildPresignClient(this.storageEndpoint);
    }

    /**
     * TẠO PRESIGNED URL ĐỂ CLIENT UPLOAD TRỰC TIẾP LÊN S3
     *
     * Luồng xử lý:
     * 1. Đảm bảo bucket S3 tồn tại (tự tạo nếu chưa có)
     * 2. Validate phim tồn tại → 404
     * 3. Validate kích thước file → 400 nếu vượt giới hạn
     * 4. Validate content type phù hợp với fileType → 400
     * 5. Tạo objectKey duy nhất: {prefix}/{movieId}/{uuid}-{filename}
     * 6. Tạo presigned URL bằng AWS SDK (có giới hạn thời gian TTL)
     * 7. Trả về: { uploadUrl, objectKey, expiresAt }
     *
     * Client sử dụng uploadUrl để PUT file trực tiếp lên S3
     */
    async getPresignedUrl(params: PresignedUrlParams) {
        const { movieId, fileName, contentType, sizeBytes, fileType, origin } = params;

        // Bước 1: Đảm bảo bucket S3 tồn tại
        await this.ensureBucketExists();

        // Bước 2: Kiểm tra phim tồn tại
        const movie = await this.prisma.movie.findUnique({ where: { id: movieId } });
        if (!movie) {
            throw new NotFoundException({
                code: 'MOVIE_NOT_FOUND',
                message: 'Movie not found',
            });
        }

        // Bước 3: Kiểm tra kích thước file
        if (sizeBytes > this.maxSizeBytes) {
            throw new BadRequestException({
                code: 'FILE_TOO_LARGE',
                message: `File size exceeds maximum allowed (${this.maxSizeBytes / (1024 * 1024)}MB)`,
            });
        }

        // Bước 4: Kiểm tra content type hợp lệ
        if (fileType === 'video') {
            if (!contentType.startsWith('video/')) {
                throw new BadRequestException({
                    code: 'INVALID_CONTENT_TYPE',
                    message: 'Invalid content type for video upload',
                });
            }
        } else if (fileType === 'thumbnail') {
            if (!contentType.startsWith('image/')) {
                throw new BadRequestException({
                    code: 'INVALID_CONTENT_TYPE',
                    message: 'Invalid content type for thumbnail upload',
                });
            }
        }

        // Bước 5: Tạo object key duy nhất trên S3
        // Sanitize filename: chỉ giữ chữ, số, dấu chấm, gạch ngang, gạch dưới
        // (chống path traversal attack: ../../etc/passwd)
        const safeFileName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 100);
        const uuid = uuidv4(); // UUID đảm bảo tên file duy nhất

        // Cấu trúc lưu trữ trên S3:
        // - Video: originals/{movieId}/{uuid}-{filename}
        // - Poster: posters/{movieId}/{uuid}-{filename}
        const objectKey = fileType === 'video'
            ? `originals/${movieId}/${uuid}-${safeFileName}`
            : `posters/${movieId}/${uuid}-${safeFileName}`;

        // Bước 6: Tạo presigned URL
        const ttl = parseInt(this.configService.get<string>('UPLOAD_PRESIGNED_TTL_SECONDS') || '1800', 10);

        const command = new PutObjectCommand({
            Bucket: this.bucket,
            Key: objectKey,
            ContentType: contentType,
            ContentLength: sizeBytes,
        });

        // Chọn client phù hợp (có thể khác endpoint cho CORS)
        const presignClient = this.getPresignClient(origin);
        const uploadUrl = await getSignedUrl(presignClient, command, { expiresIn: ttl });

        const expiresAt = new Date(Date.now() + ttl * 1000).toISOString();

        return { uploadUrl, objectKey, expiresAt };
    }

    /**
     * XÁC NHẬN UPLOAD HOÀN TẤT + TRIGGER ENCODE (nếu là video)
     *
     * Được gọi SAU KHI client upload file lên S3 thành công.
     *
     * Luồng xử lý:
     * 1. Kiểm tra phim tồn tại
     * 2. Ghi nhận upload record trong DB (tránh trùng lặp)
     * 3. Nếu là VIDEO:
     *    a. Cập nhật movie.originalKey + encodeStatus = "processing"
     *    b. Thêm job encode vào hàng đợi BullMQ
     *       → Worker (EncodeProcessor) sẽ tự động nhận và xử lý
     *       → Job có retry 3 lần, backoff exponential
     * 4. Nếu là THUMBNAIL:
     *    → Cập nhật movie.posterUrl = URL công khai của poster
     */
    async uploadComplete(params: UploadCompleteParams) {
        const { movieId, objectKey, fileType = 'video' } = params;

        // Kiểm tra phim tồn tại
        const movie = await this.prisma.movie.findUnique({ where: { id: movieId } });
        if (!movie) {
            throw new NotFoundException({
                code: 'MOVIE_NOT_FOUND',
                message: 'Movie not found',
            });
        }

        // Ghi nhận upload record (tránh tạo trùng nếu client gọi lại)
        const existingUpload = await this.prisma.upload.findUnique({
            where: { objectKey },
        });

        if (!existingUpload) {
            await this.prisma.upload.create({
                data: {
                    movieId,
                    objectKey,
                    fileType: fileType === 'video' ? UploadFileType.video : UploadFileType.thumbnail,
                    uploadStatus: UploadStatus.uploaded,
                },
            });
        }

        // Tạo URL công khai của file trên S3
        const s3PublicBaseUrl = this.configService.get<string>('S3_PUBLIC_BASE_URL') || 'http://localhost:9002/netflat-media';
        const publicUrl = buildS3PublicUrl(s3PublicBaseUrl, objectKey);

        // ─── XỬ LÝ VIDEO ────────────────────────────────
        if (fileType === 'video') {
            // Cập nhật movie: lưu key file gốc + đánh dấu đang encode
            await this.prisma.movie.update({
                where: { id: movieId },
                data: {
                    originalKey: objectKey,
                    encodeStatus: EncodeStatus.processing,
                },
            });

            // Thêm job encode vào hàng đợi BullMQ
            // Worker (EncodeProcessor) sẽ tự động nhận job này
            const job = await this.encodeQueue.add(
                ENCODE_JOB,                              // Tên job
                { movieId, objectKey },                   // Data truyền cho worker
                {
                    attempts: 3,                          // Retry tối đa 3 lần
                    backoff: { type: 'exponential', delay: 10_000 }, // Backoff: 10s, 20s, 40s
                    removeOnComplete: 50,                 // Giữ 50 job hoàn thành gần nhất
                    removeOnFail: 20,                     // Giữ 20 job thất bại gần nhất
                },
            );
            this.logger.log(`[upload] Queued encode job ${job.id} for movie=${movieId}`);

            return { movieId, encodeStatus: 'processing', jobId: job.id };
        }

        // ─── XỬ LÝ THUMBNAIL (POSTER) ───────────────────
        // Chỉ cập nhật posterUrl, không cần encode
        await this.prisma.movie.update({
            where: { id: movieId },
            data: { posterUrl: publicUrl },
        });

        return { movieId, encodeStatus: movie.encodeStatus, posterUrl: publicUrl };
    }

    // ═══════════════════════════════════════════════
    // CÁC HÀM NỘI BỘ (Private Methods)
    // ═══════════════════════════════════════════════

    /**
     * Tạo S3Client với endpoint cho trước
     * forcePathStyle: Bắt buộc cho MinIO (URL dạng http://host/bucket/key)
     */
    private buildPresignClient(endpoint: string): S3Client {
        return new S3Client({
            endpoint,
            region: this.configService.get<string>('S3_REGION') || 'us-east-1',
            credentials: {
                accessKeyId: this.configService.get<string>('S3_ACCESS_KEY') || 'minioadmin',
                secretAccessKey: this.configService.get<string>('S3_SECRET_KEY') || 'minioadmin',
            },
            forcePathStyle: true,
        });
    }

    /**
     * Chọn S3 client cho presigned URL
     * (có thể mở rộng để chọn endpoint khác dựa trên origin)
     */
    private getPresignClient(_origin?: string): S3Client {
        return this.s3PresignClient;
    }

    /**
     * Resolve endpoint cho presigned URL
     * Ưu tiên: S3_PRESIGN_BASE_URL → S3_ENDPOINT → localhost
     */
    private resolvePresignEndpoint(): string {
        return this.configService.get<string>('S3_PRESIGN_BASE_URL')?.trim()
            || this.configService.get<string>('S3_ENDPOINT')?.trim()
            || 'http://localhost:9002';
    }

    /**
     * Resolve endpoint cho storage nội bộ
     * Ưu tiên: S3_ENDPOINT → S3_PRESIGN_BASE_URL → localhost
     */
    private resolveStorageEndpoint(): string {
        return this.configService.get<string>('S3_ENDPOINT')?.trim()
            || this.configService.get<string>('S3_PRESIGN_BASE_URL')?.trim()
            || 'http://localhost:9002';
    }

    /**
     * ĐẢM BẢO BUCKET TỒN TẠI (tự tạo nếu chưa có)
     *
     * Pattern "lazy initialization" + singleton promise:
     * - Lần đầu: Kiểm tra bucket → tạo nếu cần → đánh dấu ready
     * - Lần sau: Bỏ qua (đã ready)
     * - Nếu đang kiểm tra: Chờ promise hiện tại (tránh race condition)
     */
    private async ensureBucketExists(): Promise<void> {
        // Đã sẵn sàng → bỏ qua
        if (this.bucketReady) return;

        // Đang có promise khác kiểm tra → chờ nó hoàn thành
        if (this.bucketEnsurePromise) {
            await this.bucketEnsurePromise;
            return;
        }

        // Tạo promise kiểm tra/tạo bucket
        this.bucketEnsurePromise = (async () => {
            try {
                // Kiểm tra bucket đã tồn tại chưa (HeadBucket)
                await this.s3StorageClient.send(new HeadBucketCommand({ Bucket: this.bucket }));
                this.bucketReady = true;
                return;
            } catch (error) {
                // Nếu lỗi KHÔNG PHẢI "bucket không tồn tại" → throw
                if (!this.isMissingBucketError(error)) {
                    this.logger.error('[upload] Failed to verify storage bucket', error as any);
                    throw new BadRequestException({
                        code: 'STORAGE_UNAVAILABLE',
                        message: 'Storage service is not available. Please try again.',
                    });
                }
            }

            // Bucket chưa tồn tại → tự động tạo mới
            try {
                this.logger.warn(`[upload] Bucket ${this.bucket} not found. Creating bucket automatically.`);
                await this.s3StorageClient.send(new CreateBucketCommand({ Bucket: this.bucket }));
                this.bucketReady = true;
                this.logger.log(`[upload] Bucket ${this.bucket} created successfully.`);
            } catch (error) {
                // Race condition: bucket đã được tạo bởi process khác → OK
                if (this.isBucketAlreadyExistsError(error)) {
                    this.bucketReady = true;
                    return;
                }

                this.logger.error('[upload] Failed to create storage bucket', error as any);
                throw new BadRequestException({
                    code: 'STORAGE_UNAVAILABLE',
                    message: 'Storage bucket setup failed. Please try again.',
                });
            }
        })();

        try {
            await this.bucketEnsurePromise;
        } finally {
            // Reset promise để lần sau có thể kiểm tra lại nếu cần
            this.bucketEnsurePromise = null;
        }
    }

    /**
     * Kiểm tra lỗi "bucket không tồn tại"
     * Xử lý nhiều định dạng lỗi từ các S3 provider khác nhau
     */
    private isMissingBucketError(error: unknown): boolean {
        const e = error as { name?: string; Code?: string; $metadata?: { httpStatusCode?: number } };
        const name = (e?.name || '').toLowerCase();
        const code = (e?.Code || '').toLowerCase();
        const status = e?.$metadata?.httpStatusCode;
        return name.includes('nosuchbucket')
            || code.includes('nosuchbucket')
            || name.includes('notfound')
            || status === 404;
    }

    /**
     * Kiểm tra lỗi "bucket đã tồn tại" (race condition khi tạo đồng thời)
     */
    private isBucketAlreadyExistsError(error: unknown): boolean {
        const e = error as { name?: string; Code?: string };
        const name = (e?.name || '').toLowerCase();
        const code = (e?.Code || '').toLowerCase();
        return name.includes('bucketalreadyownedbyyou')
            || name.includes('bucketalreadyexists')
            || code.includes('bucketalreadyownedbyyou')
            || code.includes('bucketalreadyexists');
    }
}
