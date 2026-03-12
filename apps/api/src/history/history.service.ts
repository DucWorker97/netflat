import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MovieStatus, EncodeStatus } from '@prisma/client';

@Injectable()
export class HistoryService {
    constructor(private prisma: PrismaService) {}

    async upsert(
        userId: string,
        movieId: string,
        progressSeconds: number,
        durationSeconds: number,
    ) {
        const movie = await this.prisma.movie.findUnique({ where: { id: movieId } });
        if (!movie) {
            throw new NotFoundException({ code: 'MOVIE_NOT_FOUND', message: 'Movie not found' });
        }

        const completed = durationSeconds > 0 && progressSeconds / durationSeconds >= 0.95;

        const record = await this.prisma.watchHistory.upsert({
            where: { userId_movieId: { userId, movieId } },
            create: {
                userId,
                movieId,
                progressSeconds,
                durationSeconds,
                completed,
                lastWatchedAt: new Date(),
            },
            update: {
                progressSeconds,
                durationSeconds,
                completed,
                lastWatchedAt: new Date(),
            },
        });

        return {
            id: record.id,
            movieId: record.movieId,
            progressSeconds: record.progressSeconds,
            durationSeconds: record.durationSeconds,
            completed: record.completed,
            lastWatchedAt: record.lastWatchedAt.toISOString(),
        };
    }

    async findAll(userId: string, page = 1, limit = 20) {
        const skip = (page - 1) * limit;

        const [items, total] = await Promise.all([
            this.prisma.watchHistory.findMany({
                where: { userId },
                skip,
                take: limit,
                orderBy: { lastWatchedAt: 'desc' },
                include: {
                    movie: {
                        include: {
                            genres: { include: { genre: true } },
                        },
                    },
                },
            }),
            this.prisma.watchHistory.count({ where: { userId } }),
        ]);

        const data = items.map((item: typeof items[number]) => ({
            id: item.id,
            movieId: item.movieId,
            progressSeconds: item.progressSeconds,
            durationSeconds: item.durationSeconds,
            completed: item.completed,
            lastWatchedAt: item.lastWatchedAt.toISOString(),
            movie: {
                id: item.movie.id,
                title: item.movie.title,
                posterUrl: item.movie.posterUrl,
                durationSeconds: item.movie.durationSeconds,
                releaseYear: item.movie.releaseYear,
                genres: item.movie.genres.map((mg: typeof item.movie.genres[number]) => ({
                    id: mg.genre.id,
                    name: mg.genre.name,
                    slug: mg.genre.slug,
                })),
            },
        }));

        return { data, total };
    }

    async continueWatching(userId: string, limit = 10) {
        const items = await this.prisma.watchHistory.findMany({
            where: {
                userId,
                completed: false,
                progressSeconds: { gt: 0 },
                movie: {
                    movieStatus: MovieStatus.published,
                    encodeStatus: EncodeStatus.ready,
                },
            },
            take: limit,
            orderBy: { lastWatchedAt: 'desc' },
            include: {
                movie: {
                    include: {
                        genres: { include: { genre: true } },
                    },
                },
            },
        });

        return items.map((item: typeof items[number]) => ({
            id: item.id,
            movieId: item.movieId,
            progressSeconds: item.progressSeconds,
            durationSeconds: item.durationSeconds,
            lastWatchedAt: item.lastWatchedAt.toISOString(),
            movie: {
                id: item.movie.id,
                title: item.movie.title,
                posterUrl: item.movie.posterUrl,
                durationSeconds: item.movie.durationSeconds,
                releaseYear: item.movie.releaseYear,
                genres: item.movie.genres.map((mg: typeof item.movie.genres[number]) => ({
                    id: mg.genre.id,
                    name: mg.genre.name,
                    slug: mg.genre.slug,
                })),
            },
        }));
    }

    async remove(userId: string, movieId: string) {
        const existing = await this.prisma.watchHistory.findUnique({
            where: { userId_movieId: { userId, movieId } },
        });

        if (!existing) {
            throw new NotFoundException({
                code: 'HISTORY_NOT_FOUND',
                message: 'History entry not found',
            });
        }

        await this.prisma.watchHistory.delete({ where: { id: existing.id } });
        return { message: 'History entry removed' };
    }
}
