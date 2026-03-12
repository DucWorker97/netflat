import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class RatingsService {
    constructor(private prisma: PrismaService) { }

    async rateMovie(userId: string, movieId: string, rating: number, comment?: string | null) {
        const existing = await this.prisma.rating.findUnique({
            where: { userId_movieId: { userId, movieId } },
        });

        if (existing) {
            return this.prisma.rating.update({
                where: { id: existing.id },
                data: { rating, comment: comment !== undefined ? comment : existing.comment },
            });
        }

        return this.prisma.rating.create({
            data: {
                userId,
                movieId,
                rating,
                comment: comment || null,
            },
        });
    }

    async getUserRating(userId: string, movieId: string) {
        return this.prisma.rating.findUnique({
            where: { userId_movieId: { userId, movieId } },
        });
    }

    async getMovieRatingStats(movieId: string) {
        const stats = await this.prisma.rating.aggregate({
            where: { movieId },
            _avg: { rating: true },
            _count: { rating: true },
        });

        return {
            avgRating: stats._avg.rating ? Number(stats._avg.rating.toFixed(1)) : null,
            ratingsCount: stats._count.rating,
        };
    }

    async listMovieRatings(movieId: string, limit = 20) {
        const ratings = await this.prisma.rating.findMany({
            where: { movieId },
            orderBy: { createdAt: 'desc' },
            take: limit,
            include: {
                user: { select: { email: true } },
            },
        });

        return ratings.map((rating) => ({
            id: rating.id,
            rating: rating.rating,
            comment: rating.comment,
            createdAt: rating.createdAt.toISOString(),
            userName: rating.user.email.split('@')[0],
        }));
    }

    async deleteRating(userId: string, movieId: string) {
        const existing = await this.prisma.rating.findUnique({
            where: { userId_movieId: { userId, movieId } },
        });

        if (!existing) {
            return null;
        }

        return this.prisma.rating.delete({
            where: { id: existing.id },
        });
    }
}

