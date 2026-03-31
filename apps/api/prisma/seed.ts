import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import {
    LOCAL_GENRES,
    LOCAL_MOVIES,
    TEST_USERS,
    type LocalMovieSeed,
    type TestUserSeed,
} from '../scripts/seed-shared';
import {
    getTmdbCredentials,
    hasTmdbCredentials,
    syncTmdbPopularMovies,
} from '../scripts/tmdb-shared';

const prisma = new PrismaClient();

function getErrorMessage(error: unknown): string {
    if (error instanceof Error) {
        return error.message;
    }

    return String(error);
}

async function seedUsers(users: TestUserSeed[]): Promise<void> {
    for (const user of users) {
        const passwordHash = await bcrypt.hash(user.password, 10);
        await prisma.user.upsert({
            where: { email: user.email },
            update: {
                passwordHash,
                role: user.role,
            },
            create: {
                email: user.email,
                passwordHash,
                role: user.role,
            },
        });
    }
}

async function upsertLocalGenres(): Promise<Map<string, string>> {
    const genreMap = new Map<string, string>();

    for (const genre of LOCAL_GENRES) {
        const record = await prisma.genre.upsert({
            where: { slug: genre.slug },
            update: { name: genre.name },
            create: {
                name: genre.name,
                slug: genre.slug,
            },
        });

        genreMap.set(genre.slug, record.id);
    }

    return genreMap;
}

async function upsertLocalMovie(movie: LocalMovieSeed, genreMap: Map<string, string>): Promise<void> {
    const existing = await prisma.movie.findFirst({
        where: { title: movie.title },
        select: { id: true },
    });

    const record = existing
        ? await prisma.movie.update({
            where: { id: existing.id },
            data: {
                description: movie.description,
                releaseYear: movie.releaseYear,
                durationSeconds: movie.durationSeconds,
                playbackUrl: movie.playbackUrl,
                posterUrl: movie.posterUrl,
                backdropUrl: movie.backdropUrl,
                movieStatus: 'published',
                encodeStatus: 'ready',
                originalLanguage: movie.originalLanguage,
                actors: movie.actors,
            },
        })
        : await prisma.movie.create({
            data: {
                title: movie.title,
                description: movie.description,
                releaseYear: movie.releaseYear,
                durationSeconds: movie.durationSeconds,
                playbackUrl: movie.playbackUrl,
                posterUrl: movie.posterUrl,
                backdropUrl: movie.backdropUrl,
                movieStatus: 'published',
                encodeStatus: 'ready',
                originalLanguage: movie.originalLanguage,
                actors: movie.actors,
            },
        });

    const genreIds = movie.genres
        .map((genreSlug) => genreMap.get(genreSlug))
        .filter((genreId): genreId is string => Boolean(genreId));

    await prisma.movieGenre.deleteMany({ where: { movieId: record.id } });
    if (genreIds.length > 0) {
        await prisma.movieGenre.createMany({
            data: genreIds.map((genreId) => ({ movieId: record.id, genreId })),
            skipDuplicates: true,
        });
    }
}

async function seedLocalContent(): Promise<void> {
    console.log('TMDB credentials are missing or unavailable. Seeding local sample content without clearing the existing catalog...');

    const genreMap = await upsertLocalGenres();
    for (const movie of LOCAL_MOVIES) {
        await upsertLocalMovie(movie, genreMap);
        console.log(`Upserted local movie: ${movie.title}`);
    }
}

async function main(): Promise<void> {
    console.log('Seeding database...');

    await seedUsers(TEST_USERS);
    console.log(`Seeded ${TEST_USERS.length} test users.`);

    const existingMovieCount = await prisma.movie.count();
    const tmdbCredentials = getTmdbCredentials();

    if (hasTmdbCredentials(tmdbCredentials)) {
        try {
            const result = await syncTmdbPopularMovies(prisma, {
                credentials: tmdbCredentials,
                delayMs: 250,
                log: (message) => console.log(message),
                pages: 3,
            });

            console.log(
                `TMDB sync completed. Imported: ${result.imported}, updated: ${result.updated}, failed: ${result.failed}. Catalog size: ${result.movieCount} movie(s).`,
            );
        } catch (error: unknown) {
            console.warn(`TMDB sync failed: ${getErrorMessage(error)}`);

            if (existingMovieCount === 0) {
                await seedLocalContent();
            } else {
                console.log(`Catalog already has ${existingMovieCount} movie(s). Keeping the existing dataset.`);
            }
        }
    } else if (existingMovieCount === 0) {
        await seedLocalContent();
    } else {
        console.log(`Catalog already has ${existingMovieCount} movie(s). Skipping local fallback seed.`);
    }

    console.log('Seeding completed.');
}

main()
    .catch((error: unknown) => {
        console.error('Seeding failed:', getErrorMessage(error));
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
