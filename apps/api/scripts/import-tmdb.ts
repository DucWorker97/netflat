/**
 * TMDb import entrypoint.
 *
 * Uses the same credential resolution and sync logic as `prisma/seed.ts`.
 * Supported env vars:
 * - TMDB_API_KEY
 * - TMDB_READ_ACCESS_TOKEN
 * - TMDB_ACCESS_TOKEN (legacy fallback)
 */

import { PrismaClient } from '@prisma/client';
import {
    getTmdbCredentials,
    hasTmdbCredentials,
    syncTmdbPopularMovies,
} from './tmdb-shared';

const prisma = new PrismaClient();

function getErrorMessage(error: unknown): string {
    if (error instanceof Error) {
        return error.message;
    }

    return String(error);
}

async function main(): Promise<void> {
    console.log('TMDB import');
    console.log('===========');

    const credentials = getTmdbCredentials();
    if (!hasTmdbCredentials(credentials)) {
        console.error('TMDB credentials are not configured. Set TMDB_API_KEY or TMDB_READ_ACCESS_TOKEN.');
        process.exit(1);
    }

    const result = await syncTmdbPopularMovies(prisma, {
        credentials,
        delayMs: 250,
        log: (message) => console.log(message),
        pages: 3,
    });

    console.log(
        `TMDB import completed. Imported: ${result.imported}, updated: ${result.updated}, failed: ${result.failed}. Catalog size: ${result.movieCount} movie(s).`,
    );
}

main()
    .catch((error: unknown) => {
        console.error('TMDB import failed:', getErrorMessage(error));
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
