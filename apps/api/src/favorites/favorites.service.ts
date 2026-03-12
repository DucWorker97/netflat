import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MovieStatus, EncodeStatus } from '@prisma/client';

@Injectable()
export class FavoritesService {
    constructor(private prisma: PrismaService) { }

    async findAll(userId: string, page = 1, limit = 20) {
        const skip = (page - 1) * limit;

        const [favorites, total] = await Promise.all([
            this.prisma.favorite.findMany({
                where: { userId },
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
                include: {
                    movie: {
                        include: {
                            genres: { include: { genre: true } },
                        },
                    },
                },
            }),
            this.prisma.favorite.count({ where: { userId } }),
        ]);

        const data = favorites.map((fav: typeof favorites[number]) => ({
            id: fav.id,
            movieId: fav.movieId,
            movie: {
                id: fav.movie.id,
                title: fav.movie.title,
                posterUrl: fav.movie.posterUrl,
                durationSeconds: fav.movie.durationSeconds,
                releaseYear: fav.movie.releaseYear,
                genres: fav.movie.genres.map((mg: typeof fav.movie.genres[number]) => ({
                    id: mg.genre.id,
                    name: mg.genre.name,
                    slug: mg.genre.slug,
                })),
            },
            createdAt: fav.createdAt.toISOString(),
        }));

        return { data, total };
    }

    async add(userId: string, movieId: string) {
        const movie = await this.prisma.movie.findUnique({ where: { id: movieId } });
        if (!movie) {
            throw new NotFoundException({
                code: 'MOVIE_NOT_FOUND',
                message: 'Movie not found',
            });
        }

        if (movie.movieStatus !== MovieStatus.published || movie.encodeStatus !== EncodeStatus.ready) {
            throw new NotFoundException({
                code: 'MOVIE_NOT_FOUND',
                message: 'Movie not found',
            });
        }

        const existing = await this.prisma.favorite.findUnique({
            where: { userId_movieId: { userId, movieId } },
        });

        if (existing) {
            throw new ConflictException({
                code: 'FAVORITE_ALREADY_EXISTS',
                message: 'Movie already in favorites',
            });
        }

        const favorite = await this.prisma.favorite.create({
            data: { userId, movieId },
            include: {
                movie: {
                    include: {
                        genres: { include: { genre: true } },
                    },
                },
            },
        });

        return {
            id: favorite.id,
            movieId: favorite.movieId,
            movie: {
                id: favorite.movie.id,
                title: favorite.movie.title,
                posterUrl: favorite.movie.posterUrl,
                durationSeconds: favorite.movie.durationSeconds,
                releaseYear: favorite.movie.releaseYear,
                genres: favorite.movie.genres.map((mg: typeof favorite.movie.genres[number]) => ({
                    id: mg.genre.id,
                    name: mg.genre.name,
                    slug: mg.genre.slug,
                })),
            },
            createdAt: favorite.createdAt.toISOString(),
        };
    }

    async remove(userId: string, movieId: string) {
        const existing = await this.prisma.favorite.findUnique({
            where: { userId_movieId: { userId, movieId } },
        });

        if (!existing) {
            throw new NotFoundException({
                code: 'FAVORITE_NOT_FOUND',
                message: 'Not in favorites',
            });
        }

        await this.prisma.favorite.delete({
            where: { id: existing.id },
        });

        return { message: 'Removed from favorites' };
    }
}

