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

const execFileAsync = promisify(execFile);

@Processor(ENCODE_QUEUE, { concurrency: 1 })
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

    async process(job: Job<EncodeJobData>): Promise<void> {
        const { movieId, objectKey } = job.data;
        this.logger.log(`[encode] Starting job ${job.id} for movie=${movieId}`);

        // Mark processing
        await this.prisma.movie.update({
            where: { id: movieId },
            data: { encodeStatus: EncodeStatus.processing },
        });

        const tmpDir = path.join(os.tmpdir(), `encode-${movieId}-${Date.now()}`);
        fs.mkdirSync(tmpDir, { recursive: true });

        const inputFile = path.join(tmpDir, 'input.mp4');

        try {
            // 1. Download original from S3
            await job.updateProgress(5);
            this.logger.log(`[encode] Downloading ${objectKey}…`);
            await this.downloadFromS3(objectKey, inputFile);
            await job.updateProgress(15);

            // 2. Encode each profile
            const hlsDir = path.join(tmpDir, 'hls');
            fs.mkdirSync(hlsDir, { recursive: true });

            for (let i = 0; i < HLS_PROFILES.length; i++) {
                const profile = HLS_PROFILES[i];
                const variantDir = path.join(hlsDir, profile.suffix);
                fs.mkdirSync(variantDir, { recursive: true });

                this.logger.log(`[encode] Encoding ${profile.name} (${profile.suffix})…`);
                await this.encodeVariant(inputFile, variantDir, profile);

                const pct = 15 + ((i + 1) / HLS_PROFILES.length) * 65;
                await job.updateProgress(Math.round(pct));
            }

            // 3. Generate master playlist
            await job.updateProgress(82);
            const masterContent = this.buildMasterPlaylist();
            fs.writeFileSync(path.join(hlsDir, 'master.m3u8'), masterContent);

            // 4. Upload all HLS files to S3
            this.logger.log(`[encode] Uploading HLS files to S3…`);
            await this.uploadHlsToS3(hlsDir, movieId);
            await job.updateProgress(95);

            // 5. Mark ready
            const publicBase = this.config.get<string>('S3_PUBLIC_BASE_URL') || 'http://localhost:9002/netflat-media';
            const playbackUrl = `${publicBase}/hls/${movieId}/master.m3u8`;

            await this.prisma.movie.update({
                where: { id: movieId },
                data: {
                    encodeStatus: EncodeStatus.ready,
                    playbackUrl,
                },
            });

            await job.updateProgress(100);
            this.logger.log(`[encode] Movie ${movieId} is READY → ${playbackUrl}`);
        } catch (err) {
            this.logger.error(`[encode] Failed for movie=${movieId}: ${err}`);
            await this.prisma.movie.update({
                where: { id: movieId },
                data: { encodeStatus: EncodeStatus.failed },
            });
            throw err;
        } finally {
            // Cleanup temp files
            fs.rmSync(tmpDir, { recursive: true, force: true });
        }
    }

    // ── Helpers ──────────────────────────────────────────────

    private async downloadFromS3(key: string, dest: string): Promise<void> {
        const command = new GetObjectCommand({ Bucket: this.bucket, Key: key });
        const response = await this.s3.send(command);
        const body = response.Body as Readable;
        await pipeline(body, fs.createWriteStream(dest));
    }

    private async encodeVariant(
        inputFile: string,
        outputDir: string,
        profile: typeof HLS_PROFILES[number],
    ): Promise<void> {
        const segmentFile = path.join(outputDir, 'prog_index.m3u8');

        const args = [
            '-i', inputFile,
            '-vf', `scale=${profile.width}:${profile.height}:force_original_aspect_ratio=decrease,pad=${profile.width}:${profile.height}:(ow-iw)/2:(oh-ih)/2`,
            '-c:v', 'libx264',
            '-preset', 'fast',
            '-b:v', profile.videoBitrate,
            '-maxrate', profile.videoBitrate,
            '-bufsize', `${parseInt(profile.videoBitrate) * 2}k`,
            '-c:a', 'aac',
            '-b:a', profile.audioBitrate,
            '-ar', '44100',
            '-hls_time', '6',
            '-hls_list_size', '0',
            '-hls_segment_filename', path.join(outputDir, 'seg_%03d.ts'),
            '-f', 'hls',
            segmentFile,
            '-y',
        ];

        const ffmpegBin = this.config.get<string>('FFMPEG_PATH') || 'ffmpeg';
        await execFileAsync(ffmpegBin, args, { maxBuffer: 50 * 1024 * 1024 });
    }

    private buildMasterPlaylist(): string {
        const lines = ['#EXTM3U'];
        for (const profile of HLS_PROFILES) {
            const bps = parseInt(profile.videoBitrate) * 1000;
            lines.push(
                `#EXT-X-STREAM-INF:BANDWIDTH=${bps},RESOLUTION=${profile.width}x${profile.height},NAME="${profile.name}"`,
                `${profile.suffix}/prog_index.m3u8`,
            );
        }
        return lines.join('\n') + '\n';
    }

    private async uploadHlsToS3(hlsLocalDir: string, movieId: string): Promise<void> {
        const files = this.walkDir(hlsLocalDir);
        for (const filePath of files) {
            const relPath = path.relative(hlsLocalDir, filePath).replace(/\\/g, '/');
            const s3Key = `hls/${movieId}/${relPath}`;
            const contentType = filePath.endsWith('.m3u8')
                ? 'application/vnd.apple.mpegurl'
                : 'video/mp2t';

            const body = fs.readFileSync(filePath);
            await this.s3.send(new PutObjectCommand({
                Bucket: this.bucket,
                Key: s3Key,
                Body: body,
                ContentType: contentType,
            }));
        }
    }

    private walkDir(dir: string): string[] {
        const results: string[] = [];
        for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
            const fullPath = path.join(dir, entry.name);
            if (entry.isDirectory()) {
                results.push(...this.walkDir(fullPath));
            } else {
                results.push(fullPath);
            }
        }
        return results;
    }
}
