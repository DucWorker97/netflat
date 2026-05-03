/* eslint-disable @typescript-eslint/no-explicit-any */
import { MoviesService } from './movies.service';

describe('MoviesService stream subscription gating', () => {
    it('returns only quality options allowed by the effective subscription plan', async () => {
        const prisma = {
            movie: {
                findUnique: jest.fn().mockResolvedValue({
                    id: 'movie-1',
                    movieStatus: 'published',
                    encodeStatus: 'ready',
                    playbackUrl: null,
                }),
            },
        };
        const configService = {
            get: jest.fn((key: string) => {
                if (key === 'S3_PUBLIC_BASE_URL') return 'http://cdn.test/netflat-media';
                return null;
            }),
        };
        const subscriptionsService = {
            getActiveSubscription: jest.fn().mockResolvedValue({
                plan: {
                    name: 'free',
                    maxMoviesPerMonth: 5,
                    maxQualityResolution: '480p',
                },
            }),
        };
        const usageService = {
            canWatchMovie: jest.fn().mockResolvedValue(true),
            incrementMoviesWatched: jest.fn(),
        };
        const service = new MoviesService(
            prisma as any,
            configService as any,
            subscriptionsService as any,
            usageService as any,
        );

        const result = await service.getStreamUrl('movie-1', { id: 'user-1' } as any);

        expect(result.playbackUrl).toBe('http://cdn.test/netflat-media/hls/movie-1/master.m3u8');
        expect(result.qualityOptions).toEqual([
            {
                name: '480p',
                url: 'http://cdn.test/netflat-media/hls/movie-1/v0/prog_index.m3u8',
            },
        ]);
        expect(usageService.incrementMoviesWatched).toHaveBeenCalledWith('user-1');
    });
});
