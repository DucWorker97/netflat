// @ts-nocheck
import { PrismaClient, UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import axios from 'axios';

const prisma = new PrismaClient();

const TMDB_API_KEY = '1370fd1e67f2b60baa8e595035a68e1d';
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/original';

// Mappers
const mapGenre = (tmdbGenre: any) => ({
    name: tmdbGenre.name,
    slug: tmdbGenre.name.toLowerCase().replace(/\s+/g, '-').replace(/&/g, 'and'),
    tmdbId: tmdbGenre.id,
});

async function main() {
    console.log('đŸŒ± Seeding database...');

    // 1. CLEAR DATA (Preserve Users)
    console.log('đŸ§¹ Clearing old movie data...');
    // 1. CLEAR DATA
    console.log('đŸ§¹ Clearing old movie data...');
    try {
        if (prisma.rating) {
            console.log('  - Deleting Rating...');
            await prisma.rating.deleteMany({});
        }
        if (prisma.favorite) {
            console.log('  - Deleting Favorite...');
            await prisma.favorite.deleteMany({});
        }
        if (prisma.upload) {
            console.log('  - Deleting Upload...');
            await prisma.upload.deleteMany({});
        }
        if (prisma.movieGenre) {
            console.log('  - Deleting MovieGenre...');
            await prisma.movieGenre.deleteMany({});
        }
        if (prisma.movie) {
            console.log('  - Deleting Movie...');
            await prisma.movie.deleteMany({});
        }
        if (prisma.actor) {
            console.log('  - Deleting Actor...');
            await prisma.actor.deleteMany({});
        }
        if (prisma.genre) {
            console.log('  - Deleting Genre...');
            await prisma.genre.deleteMany({});
        }
    } catch (err) {
        console.error('âŒ Error during cleanup:', err);
        throw err;
    }

    // 2. CREATE USERS (Idempotent)
    const adminPassword = await bcrypt.hash('admin123', 10);
    await prisma.user.upsert({
        where: { email: 'admin@netflat.local' },
        update: {},
        create: {
            email: 'admin@netflat.local',
            passwordHash: adminPassword,
            role: UserRole.admin,
        },
    });

    const viewerPassword = await bcrypt.hash('viewer123', 10);
    await prisma.user.upsert({
        where: { email: 'viewer@netflat.local' },
        update: {},
        create: {
            email: 'viewer@netflat.local',
            passwordHash: viewerPassword,
            role: UserRole.viewer,
        },
    });
    console.log('âœ… Users verified (admin@netflat.local / viewer@netflat.local)');

    // 3. FETCH GENRES
    console.log('đŸ“¥ Fetching users genres from TMDB...');
    const genresResponse = await axios.get(`${TMDB_BASE_URL}/genre/movie/list`, {
        params: { api_key: TMDB_API_KEY }
    });
    const tmdbGenres = genresResponse.data.genres;
    const genreMap = new Map(); // tmdbId -> dbId

    for (const g of tmdbGenres) {
        const mapped = mapGenre(g);
        const created = await prisma.genre.create({ data: { name: mapped.name, slug: mapped.slug } });
        genreMap.set(g.id, created.id);
    }
    console.log(`âœ… Created ${tmdbGenres.length} genres`);

    // 4. FETCH MOVIES
    console.log('đŸ“¥ Fetching popular movies from TMDB...');
    // Fetch 2 pages (40 movies)
    let movies: any[] = [];
    for (let page = 1; page <= 2; page++) {
        const res = await axios.get(`${TMDB_BASE_URL}/movie/popular`, {
            params: { api_key: TMDB_API_KEY, page }
        });
        movies = [...movies, ...res.data.results];
    }

    // Process each movie
    for (const m of movies) {
        // Fetch details for runtime and credits
        try {
            const detailRes = await axios.get(`${TMDB_BASE_URL}/movie/${m.id}`, {
                params: { api_key: TMDB_API_KEY, append_to_response: 'credits' }
            });
            const details = detailRes.data;

            // Create Movie
            const createdMovie = await prisma.movie.create({
                data: {
                    title: details.title,
                    description: details.overview || '',
                    releaseYear: details.release_date ? new Date(details.release_date).getFullYear() : 2024,
                    durationSeconds: (details.runtime || 90) * 60,
                    posterUrl: details.poster_path ? `${IMAGE_BASE_URL}${details.poster_path}` : null,
                    backdropUrl: details.backdrop_path ? `${IMAGE_BASE_URL}${details.backdrop_path}` : null,
                    movieStatus: 'published',
                    encodeStatus: 'ready', // Pretend it's ready
                    tmdbId: details.id,
                    popularity: details.popularity,
                    voteAverage: details.vote_average,
                    voteCount: details.vote_count,
                    originalLanguage: details.original_language,
                }
            });

            // Link Genres
            for (const g of details.genres) {
                const dbGenreId = genreMap.get(g.id);
                if (dbGenreId) {
                    await prisma.movieGenre.create({
                        data: { movieId: createdMovie.id, genreId: dbGenreId }
                    });
                }
            }

            // Link Actors (Top 5) — stored as String[] on Movie
            const cast = details.credits?.cast?.slice(0, 5) || [];
            const actorNames = cast.map((c: any) => c.name).filter(Boolean);
            if (actorNames.length > 0) {
                await prisma.movie.update({
                    where: { id: createdMovie.id },
                    data: { actors: actorNames },
                });
                // Also sync to Actor dictionary
                for (const name of actorNames) {
                    await prisma.actor.upsert({
                        where: { name },
                        update: {},
                        create: { name },
                    });
                }
            }
            console.log(`  Processed: ${m.title}`);

        } catch (e) {
            console.error(`  Failed to process movie ${m.title}: ${e.message}`);
        }
    }

    console.log('đŸ‰ Seeding completed!');
}

main()
    .catch((e) => {
        console.error('âŒ Seeding failed:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
