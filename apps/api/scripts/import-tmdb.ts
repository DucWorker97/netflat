/**
 * TMDb Import Script
 * Fetches popular movies and cast from The Movie Database API
 * and imports them into the netflat database.
 * 
 * Usage:
 *   1. Add TMDB_ACCESS_TOKEN to your .env file
 *   2. Run: npx ts-node scripts/import-tmdb.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// TMDb API configuration
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p';
const TMDB_ACCESS_TOKEN = process.env.TMDB_ACCESS_TOKEN;

if (!TMDB_ACCESS_TOKEN) {
    console.error('âŒ TMDB_ACCESS_TOKEN is not set in .env file');
    console.error('   Get your token from: https://www.themoviedb.org/settings/api');
    process.exit(1);
}

const headers = {
    'Authorization': `Bearer ${TMDB_ACCESS_TOKEN}`,
    'Content-Type': 'application/json',
};

// Genre mapping from TMDb to netflat slugs
const GENRE_MAP: Record<number, string> = {
    28: 'action',
    12: 'action',      // Adventure -> Action
    16: 'comedy',      // Animation -> Comedy (simplified)
    35: 'comedy',
    80: 'thriller',    // Crime -> Thriller
    99: 'documentary',
    18: 'drama',
    10751: 'comedy',   // Family -> Comedy
    14: 'sci-fi',      // Fantasy -> Sci-Fi
    36: 'drama',       // History -> Drama
    27: 'horror',
    10402: 'drama',    // Music -> Drama
    9648: 'thriller',  // Mystery -> Thriller
    10749: 'romance',
    878: 'sci-fi',
    10770: 'drama',    // TV Movie -> Drama
    53: 'thriller',
    10752: 'action',   // War -> Action
    37: 'action',      // Western -> Action
};

interface TMDbMovie {
    id: number;
    title: string;
    overview: string;
    poster_path: string | null;
    backdrop_path: string | null;
    release_date: string;
    runtime?: number;
    genre_ids?: number[];
    genres?: { id: number; name: string }[];
    // New TMDb fields
    popularity?: number;
    vote_average?: number;
    vote_count?: number;
    original_language?: string;
}

interface TMDbCastMember {
    id: number;
    name: string;
    character: string;
    profile_path: string | null;
    order: number;
}

interface TMDbCredits {
    cast: TMDbCastMember[];
}

interface TMDbVideo {
    key: string;
    site: string;
    type: string;
    official: boolean;
}

interface TMDbVideosResponse {
    results: TMDbVideo[];
}

async function fetchFromTMDb<T>(endpoint: string): Promise<T> {
    const url = `${TMDB_BASE_URL}${endpoint}`;
    const response = await fetch(url, { headers });

    if (!response.ok) {
        throw new Error(`TMDb API error: ${response.status} ${response.statusText}`);
    }

    return response.json() as Promise<T>;
}

async function getPopularMovies(page: number = 1): Promise<TMDbMovie[]> {
    const data = await fetchFromTMDb<{ results: TMDbMovie[] }>(
        `/movie/popular?language=en-US&page=${page}`
    );
    return data.results;
}

async function getMovieDetails(movieId: number): Promise<TMDbMovie> {
    return fetchFromTMDb<TMDbMovie>(`/movie/${movieId}?language=en-US`);
}

async function getMovieCredits(movieId: number): Promise<TMDbCredits> {
    return fetchFromTMDb<TMDbCredits>(`/movie/${movieId}/credits`);
}

async function getMovieVideos(movieId: number): Promise<string | null> {
    try {
        const data = await fetchFromTMDb<TMDbVideosResponse>(`/movie/${movieId}/videos`);
        // Find official YouTube trailer
        const trailer = data.results.find(
            v => v.site === 'YouTube' && v.type === 'Trailer' && v.official
        ) || data.results.find(
            v => v.site === 'YouTube' && v.type === 'Trailer'
        ) || data.results.find(
            v => v.site === 'YouTube'
        );
        return trailer ? `https://www.youtube.com/watch?v=${trailer.key}` : null;
    } catch {
        return null;
    }
}

async function ensureGenresExist(): Promise<void> {
    const genres = [
        { name: 'Action', slug: 'action' },
        { name: 'Comedy', slug: 'comedy' },
        { name: 'Drama', slug: 'drama' },
        { name: 'Sci-Fi', slug: 'sci-fi' },
        { name: 'Horror', slug: 'horror' },
        { name: 'Romance', slug: 'romance' },
        { name: 'Thriller', slug: 'thriller' },
        { name: 'Documentary', slug: 'documentary' },
    ];

    for (const genre of genres) {
        await prisma.genre.upsert({
            where: { slug: genre.slug },
            update: {},
            create: genre,
        });
    }
    console.log('âœ… Genres ready');
}

async function importActor(castMember: TMDbCastMember): Promise<string> {
    // Check if actor exists by name (simple approach)
    let actor = await prisma.actor.findFirst({
        where: { name: castMember.name },
    });

    if (!actor) {
        actor = await prisma.actor.create({
            data: {
                name: castMember.name,

            },
        });
        console.log(`  đŸ‘¤ Created actor: ${castMember.name}`);
    }

    return actor.id;
}

async function importMovie(tmdbMovie: TMDbMovie): Promise<void> {
    // Check if movie already exists by tmdbId
    const existing = await prisma.movie.findUnique({
        where: { tmdbId: tmdbMovie.id },
    });

    if (existing) {
        console.log(`  â­ï¸  Skipping existing: ${tmdbMovie.title}`);
        return;
    }

    // Get full movie details, credits, and trailer
    const details = await getMovieDetails(tmdbMovie.id);
    const credits = await getMovieCredits(tmdbMovie.id);
    const trailerUrl = await getMovieVideos(tmdbMovie.id);

    // Create movie with all TMDb fields
    const movie = await prisma.movie.create({
        data: {
            title: details.title,
            description: details.overview || null,
            posterUrl: details.poster_path
                ? `${TMDB_IMAGE_BASE}/w500${details.poster_path}`
                : null,
            backdropUrl: details.backdrop_path
                ? `${TMDB_IMAGE_BASE}/original${details.backdrop_path}`
                : null,
            releaseYear: details.release_date
                ? parseInt(details.release_date.split('-')[0], 10)
                : null,
            durationSeconds: details.runtime ? details.runtime * 60 : null,
            movieStatus: 'published',
            encodeStatus: 'ready',
            // New TMDb fields
            tmdbId: tmdbMovie.id,
            popularity: details.popularity || tmdbMovie.popularity || 0,
            voteAverage: details.vote_average || tmdbMovie.vote_average || 0,
            voteCount: details.vote_count || tmdbMovie.vote_count || 0,
            originalLanguage: details.original_language || tmdbMovie.original_language || null,
            trailerUrl: trailerUrl,
        },
    });

    console.log(`đŸ¬ Imported: ${movie.title} (${details.release_date?.split('-')[0] || 'N/A'})`);

    // Link genres
    const genreIds = details.genres?.map(g => g.id) || tmdbMovie.genre_ids || [];
    for (const tmdbGenreId of genreIds) {
        const slug = GENRE_MAP[tmdbGenreId];
        if (slug) {
            const genre = await prisma.genre.findUnique({ where: { slug } });
            if (genre) {
                try {
                    await prisma.movieGenre.create({
                        data: { movieId: movie.id, genreId: genre.id },
                    });
                } catch {
                    // Ignore duplicate
                }
            }
        }
    }

    // Import top 5 cast members as String[] on movie
    const topCast = credits.cast.slice(0, 5);
    const actorNames: string[] = [];
    for (const castMember of topCast) {
        await importActor(castMember); // sync to Actor dictionary
        actorNames.push(castMember.name);
    }
    if (actorNames.length > 0) {
        await prisma.movie.update({
            where: { id: movie.id },
            data: { actors: actorNames },
        });
    }
}

async function main() {
    console.log('đŸ€ TMDb Import Script');
    console.log('=====================\n');

    await ensureGenresExist();

    // Import movies from multiple pages (20 movies per page)
    const pagesToFetch = 3; // 60 movies total

    for (let page = 1; page <= pagesToFetch; page++) {
        console.log(`\nđŸ“„ Fetching page ${page}/${pagesToFetch}...`);

        const movies = await getPopularMovies(page);

        for (const movie of movies) {
            try {
                await importMovie(movie);
                // Small delay to avoid rate limiting
                await new Promise(resolve => setTimeout(resolve, 250));
            } catch (error) {
                console.error(`  âŒ Failed to import "${movie.title}":`, error);
            }
        }
    }

    console.log('\nâœ… Import completed!');
}

main()
    .catch((e) => {
        console.error('âŒ Import failed:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
