/**
 * Pipeline Idempotency E2E Test Suite
 * 
 * Verifies:
 * 1. DB Idempotency (Unique constraints)
 * 2. Logic Idempotency (UploadService handling)
 * 3. Queue Configuration (Retry, Backoff, Deduplication)
 */

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { getQueueToken } from '@nestjs/bullmq';
import { v4 as uuidv4 } from 'uuid';

describe('Pipeline Idempotency (e2e)', () => {
    let app: INestApplication;
    let prisma: PrismaService;
    let jwtService: JwtService;

    // Mock Queue
    const mockEncodeQueue = {
        add: jest.fn().mockResolvedValue({ id: 'mock-job-id' }),
    };

    // Test data
    let adminToken: string;
    let movieId: string;
    const objectKey = `test-uploads/unique-key-${Date.now()}.mp4`;

    beforeAll(async () => {
        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [AppModule],
        })
            .overrideProvider(getQueueToken('encode'))
            .useValue(mockEncodeQueue)
            .compile();

        // @ts-ignore
        app = moduleFixture.createNestApplication();
        app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
        await app.init();

        prisma = moduleFixture.get<PrismaService>(PrismaService);
        jwtService = moduleFixture.get<JwtService>(JwtService);

        // Create admin user
        const adminId = uuidv4();
        await prisma.user.create({
            data: {
                id: adminId,
                email: `admin-pipeline-${Date.now()}@test.com`,
                passwordHash: 'hash',
                role: 'admin'
            },
        });
        adminToken = jwtService.sign({ sub: adminId, role: 'admin' });

        // Create movie
        movieId = uuidv4();
        await prisma.movie.create({
            data: { id: movieId, title: 'Idempotency Test Movie', releaseYear: 2026 },
        });
    });

    afterAll(async () => {
        await prisma.encodeJob.deleteMany({ where: { movieId } });
        await prisma.upload.deleteMany({ where: { movieId } });
        await prisma.movie.deleteMany({ where: { id: movieId } });
        await prisma.user.deleteMany({ where: { email: { contains: 'admin-pipeline' } } });
        await app.close();
    });

    beforeEach(() => {
        mockEncodeQueue.add.mockClear();
    });

    describe('Upload Complete Idempotency', () => {
        it('1. First call: Should create Upload, EncodeJob and enqueue to BullMQ', async () => {
            const response = await request(app.getHttpServer())
                .post(`/movies/${movieId}/upload-complete`)
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    objectKey,
                    fileType: 'video',
                })
                .expect(201);

            // Verify status
            expect(response.body.encodeStatus).toBe('pending');
            expect(response.body.status).toBe('queued');

            // Verify DB records
            const upload = await prisma.upload.findUnique({ where: { objectKey } });
            expect(upload).toBeDefined();

            const encodeJob = await prisma.encodeJob.findUnique({ where: { inputKey: objectKey } });
            expect(encodeJob).toBeDefined();
            expect(encodeJob?.status).toBe('pending');
            expect(encodeJob?.attempts).toBe(0);

            // Verify Queue call
            expect(mockEncodeQueue.add).toHaveBeenCalledTimes(1);

            // Verify Job Configuration (Retry/Backoff/Dedupe)
            const [name, data, opts] = mockEncodeQueue.add.mock.calls[0];
            expect(name).toBe('ENCODE_HLS');
            expect(data.inputKey).toBe(objectKey);

            // Check Critical Configs
            expect(opts.jobId).toBe(`encode_${encodeJob?.id}`);
            expect(opts.attempts).toBe(3); // Requirement: Retry
            expect(opts.backoff).toEqual(expect.objectContaining({ type: 'exponential' })); // Requirement: Backoff
            expect(opts.removeOnComplete).toBeDefined();
        });

        it('2. Second call: Should return existing job info WITHOUT enqueuing new job', async () => {
            // Wait a small amount to ensure distinct timestamps if logic was wrong
            await new Promise(r => setTimeout(r, 100));

            const response = await request(app.getHttpServer())
                .post(`/movies/${movieId}/upload-complete`)
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    objectKey,
                    fileType: 'video',
                })
                .expect(201); // 201 Created is default for POST, but logic returns success

            // Verify response indicates idempotency
            expect(response.body.status).toBe('already_queued');
            expect(response.body.encodeStatus).toBe('pending');

            // Verify DB counts (Constraints verify this too, but logic should prevent collision)
            const jobCount = await prisma.encodeJob.count({ where: { movieId } });
            expect(jobCount).toBe(1);

            // Verify Queue was NOT called again
            expect(mockEncodeQueue.add).not.toHaveBeenCalled();
        });

        it('3. Fail scenario: Should retry if job is failed', async () => {
            // Manually set job to failed
            await prisma.encodeJob.update({
                where: { inputKey: objectKey },
                data: { status: 'failed', errorMessage: 'Simulated error' },
            });

            const response = await request(app.getHttpServer())
                .post(`/movies/${movieId}/upload-complete`)
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    objectKey,
                    fileType: 'video',
                })
                .expect(201);

            expect(response.body.status).toBe('retry_queued');

            // Verify DB update
            const job = await prisma.encodeJob.findUnique({ where: { inputKey: objectKey } });
            expect(job).toBeDefined();
            expect(job?.status).toBe('pending');
            expect(job?.attempts).toBe(1); // Incremented

            // Verify re-enqueue
            expect(mockEncodeQueue.add).toHaveBeenCalledTimes(1);
            expect(mockEncodeQueue.add.mock.calls[0][2].jobId).toContain('encode_');
        });

        it('4. Completed scenario: Should skip if job is completed', async () => {
            // Manually set job to completed
            await prisma.encodeJob.update({
                where: { inputKey: objectKey },
                data: { status: 'completed' },
            });

            const response = await request(app.getHttpServer())
                .post(`/movies/${movieId}/upload-complete`)
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    objectKey,
                    fileType: 'video',
                })
                .expect(201);

            expect(response.body.status).toBe('already_completed');

            // Verify NO re-enqueue
            expect(mockEncodeQueue.add).not.toHaveBeenCalled();
        });
    });
});
