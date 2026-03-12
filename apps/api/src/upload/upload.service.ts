import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { PrismaService } from '../prisma/prisma.service';
import { EncodeStatus, UploadFileType, UploadStatus } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';
import { ENCODE_QUEUE, ENCODE_JOB, EncodeJobData } from '../encode/encode.constants';

interface PresignedUrlParams {
    movieId: string;
    fileName: string;
    contentType: string;
    sizeBytes: number;
    fileType: 'video' | 'thumbnail';
    origin?: string;
}

interface UploadCompleteParams {
    movieId: string;
    objectKey: string;
    fileType?: 'video' | 'thumbnail';
}

@Injectable()
export class UploadService {
    private readonly logger = new Logger(UploadService.name);
    private s3PresignClient: S3Client;
    private bucket: string;
    private maxSizeBytes: number;
    private presignEndpoint: string;

    constructor(
        private prisma: PrismaService,
        private configService: ConfigService,
        @InjectQueue(ENCODE_QUEUE) private encodeQueue: Queue<EncodeJobData>,
    ) {
        this.bucket = this.configService.get<string>('S3_BUCKET') || 'netflat-media';
        this.maxSizeBytes = (parseInt(this.configService.get<string>('UPLOAD_MAX_MB') || '500', 10)) * 1024 * 1024;

        this.presignEndpoint = this.resolvePresignEndpoint();
        this.s3PresignClient = this.buildPresignClient(this.presignEndpoint);
    }

    async getPresignedUrl(params: PresignedUrlParams) {
        const { movieId, fileName, contentType, sizeBytes, fileType, origin } = params;

        // Validate movie exists
        const movie = await this.prisma.movie.findUnique({ where: { id: movieId } });
        if (!movie) {
            throw new NotFoundException({
                code: 'MOVIE_NOT_FOUND',
                message: 'Movie not found',
            });
        }

        // Validate file size
        if (sizeBytes > this.maxSizeBytes) {
            throw new BadRequestException({
                code: 'FILE_TOO_LARGE',
                message: `File size exceeds maximum allowed (${this.maxSizeBytes / (1024 * 1024)}MB)`,
            });
        }

        // Validate content type
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

        // Sanitize filename (remove path traversal)
        const safeFileName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 100);
        const uuid = uuidv4();
        const objectKey = fileType === 'video'
            ? `originals/${movieId}/${uuid}-${safeFileName}`
            : `posters/${movieId}/${uuid}-${safeFileName}`;

        const ttl = parseInt(this.configService.get<string>('UPLOAD_PRESIGNED_TTL_SECONDS') || '1800', 10);

        const command = new PutObjectCommand({
            Bucket: this.bucket,
            Key: objectKey,
            ContentType: contentType,
            ContentLength: sizeBytes,
        });

        const presignClient = this.getPresignClient(origin);
        const uploadUrl = await getSignedUrl(presignClient, command, { expiresIn: ttl });

        const expiresAt = new Date(Date.now() + ttl * 1000).toISOString();

        return { uploadUrl, objectKey, expiresAt };
    }

    async uploadComplete(params: UploadCompleteParams) {
        const { movieId, objectKey, fileType = 'video' } = params;

        const movie = await this.prisma.movie.findUnique({ where: { id: movieId } });
        if (!movie) {
            throw new NotFoundException({
                code: 'MOVIE_NOT_FOUND',
                message: 'Movie not found',
            });
        }

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

        const publicUrl = `${this.configService.get<string>('S3_PUBLIC_BASE_URL') || 'http://localhost:9002/netflat-media'}/${objectKey}`;

        if (fileType === 'video') {
            await this.prisma.movie.update({
                where: { id: movieId },
                data: {
                    originalKey: objectKey,
                    encodeStatus: EncodeStatus.processing,
                },
            });

            // Queue FFmpeg HLS encoding job
            const job = await this.encodeQueue.add(
                ENCODE_JOB,
                { movieId, objectKey },
                {
                    attempts: 3,
                    backoff: { type: 'exponential', delay: 10_000 },
                    removeOnComplete: 50,
                    removeOnFail: 20,
                },
            );
            this.logger.log(`[upload] Queued encode job ${job.id} for movie=${movieId}`);

            return { movieId, encodeStatus: 'processing', jobId: job.id };
        }

        await this.prisma.movie.update({
            where: { id: movieId },
            data: { posterUrl: publicUrl },
        });

        return { movieId, encodeStatus: movie.encodeStatus, posterUrl: publicUrl };
    }

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

    private getPresignClient(_origin?: string): S3Client {
        return this.s3PresignClient;
    }

    private resolvePresignEndpoint(): string {
        return this.configService.get<string>('S3_PRESIGN_BASE_URL')?.trim()
            || this.configService.get<string>('S3_ENDPOINT')?.trim()
            || 'http://localhost:9002';
    }
}
