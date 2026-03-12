import { Test, TestingModule } from '@nestjs/testing';
import { MoviesService } from './movies.service';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

// Mock dependencies
jest.mock('@aws-sdk/client-s3');
jest.mock('@aws-sdk/s3-request-presigner');

describe('MoviesService HLS Key Generation', () => {
    let service: MoviesService;
    let configService: ConfigService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                MoviesService,
                {
                    provide: ConfigService,
                    useValue: {
                        get: jest.fn((key: string) => {
                            if (key === 'HLS_PREFIX') return '  hls_custom   '; // Test WITH whitespace
                            if (key === 'S3_BUCKET') return 'test-bucket';
                            return null;
                        }),
                    },
                },
                {
                    provide: PrismaService, useValue: {
                        movie: {
                            findUnique: jest.fn().mockResolvedValue({
                                id: '123',
                                movieStatus: 'published',
                                encodeStatus: 'ready',
                                isPremium: false
                            })
                        }
                    }
                },
            ],
        }).compile();

        service = module.get<MoviesService>(MoviesService);
        configService = module.get<ConfigService>(ConfigService);
    });

    it('should trim HLS_PREFIX and generate correct master key', async () => {
        const s3Mock = new S3Client({});
        (getSignedUrl as jest.Mock).mockResolvedValue('http://signed-url');

        await service.getStreamUrl('123', { id: 'user1' } as any);

        // Verify GetObjectCommand was called with trimmed key
        // The first call is for master.m3u8
        const calls = (GetObjectCommand as unknown as jest.Mock).mock.calls;

        // Find call for master
        const masterCall = calls.find(args => args[0].Key.includes('master.m3u8'));
        expect(masterCall).toBeDefined();

        // Key should be "hls_custom/123/master.m3u8", NOT "  hls_custom   / 123/master.m3u8"
        expect(masterCall[0].Key).toBe('hls_custom/123/master.m3u8');

        // Verify no spaces
        expect(masterCall[0].Key).not.toMatch(/\s/);
    });
});
