import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UsageService {
    constructor(private readonly prisma: PrismaService) {}

    async getCurrentMonthUsage(userId: string) {
        const now = new Date();
        const year = now.getUTCFullYear();
        const month = now.getUTCMonth() + 1;

        return this.prisma.monthlyUsage.upsert({
            where: {
                userId_year_month: {
                    userId,
                    year,
                    month,
                },
            },
            create: {
                userId,
                year,
                month,
                moviesWatched: 0,
            },
            update: {},
        });
    }

    async canWatchMovie(userId: string, maxMoviesPerMonth: number): Promise<boolean> {
        if (maxMoviesPerMonth <= 0) {
            return false;
        }

        const usage = await this.getCurrentMonthUsage(userId);
        return usage.moviesWatched < maxMoviesPerMonth;
    }

    async incrementMoviesWatched(userId: string) {
        const now = new Date();
        const year = now.getUTCFullYear();
        const month = now.getUTCMonth() + 1;

        return this.prisma.monthlyUsage.upsert({
            where: {
                userId_year_month: {
                    userId,
                    year,
                    month,
                },
            },
            create: {
                userId,
                year,
                month,
                moviesWatched: 1,
            },
            update: {
                moviesWatched: {
                    increment: 1,
                },
            },
        });
    }
}
