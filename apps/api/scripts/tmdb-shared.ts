import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';
import { PrismaClient } from '@prisma/client';

const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/original';

export type TmdbCredentials = {
    apiKey?: string;
    readAccessToken?: string;
};

type SyncTmdbOptions = {
    credentials?: TmdbCredentials;
    delayMs?: number;
    log?: (message: string) => void;
    pages?: number;
};

interface TmdbGenre {
    id: number;
    name: string;
}

interface TmdbPopularMovie {
    id: number;
    title: string;
}

interface TmdbCastMember {
    name: string;
}

interface TmdbVideo {
    key: string;
    official: boolean;
    site: string;
    type: string;
}

interface TmdbMovieDetail {
    id: number;
    title: string;
    overview?: string;
    release_date?: string;
    runtime?: number;
    poster_path?: string | null;
    backdrop_path?: string | null;
    popularity?: number;
    vote_average?: number;
    vote_count?: number;
    original_language?: string;
    genres: TmdbGenre[];
    credits?: {
        cast?: TmdbCastMember[];
    };
    videos?: {
        results?: TmdbVideo[];
    };
}

interface TmdbGenreListResponse {
    genres: TmdbGenre[];
}

interface TmdbPopularResponse {
    results: TmdbPopularMovie[];
}

function loadRootEnvFile(): void {
    const envPath = path.resolve(__dirname, '../../../.env');
    if (!fs.existsSync(envPath)) {
        return;
    }

    const lines = fs.readFileSync(envPath, 'utf8').split(/\r?\n/);
    for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) {
            continue;
        }

        const separatorIndex = trimmed.indexOf('=');
        if (separatorIndex < 0) {
            continue;
        }

        const key = trimmed.slice(0, separatorIndex).trim();
        const value = trimmed.slice(separatorIndex + 1).trim();

        if (!process.env[key]) {
            process.env[key] = value;
        }
    }
}

function normalizeSlug(value: string): string {
    return value.toLowerCase().replace(/\s+/g, '-').replace(/&/g, 'and');
}

function getOfficialTrailerUrl(videos: TmdbVideo[] = []): string | null {
    const trailer = videos.find(
        (video) => video.site === 'YouTube' && video.type === 'Trailer' && video.official,
    ) || videos.find(
        (video) => video.site === 'YouTube' && video.type === 'Trailer',
    ) || videos.find(
        (video) => video.site === 'YouTube',
    );

    return trailer ? `https://www.youtube.com/watch?v=${trailer.key}` : null;
}

function buildTmdbRequestConfig(
    credentials: TmdbCredentials,
    extraParams: Record<string, string | number> = {},
) {
    return {
        params: credentials.apiKey ? { api_key: credentials.apiKey, ...extraParams } : extraParams,
        headers: credentials.readAccessToken
            ? { Authorization: `Bearer ${credentials.readAccessToken}` }
            : undefined,
        timeout: 15_000,
    };
}

export function getTmdbCredentials(): TmdbCredentials {
    loadRootEnvFile();

    const apiKey = process.env.TMDB_API_KEY?.trim();
    const readAccessToken = process.env.TMDB_READ_ACCESS_TOKEN?.trim();
    const legacyAccessToken = process.env.TMDB_ACCESS_TOKEN?.trim();

    return {
        apiKey: apiKey || undefined,
        readAccessToken: readAccessToken || legacyAccessToken || undefined,
    };
}

export function hasTmdbCredentials(credentials: TmdbCredentials): boolean {
    return Boolean(credentials.apiKey || credentials.readAccessToken);
}

async function upsertGenres(
    prisma: PrismaClient,
    credentials: TmdbCredentials,
): Promise<Map<number, string>> {
    const response = await axios.get<TmdbGenreListResponse>(
        `${TMDB_BASE_URL}/genre/movie/list`,
        buildTmdbRequestConfig(credentials),
    );

    const genreMap = new Map<number, string>();

    for (const genre of response.data.genres) {
        const record = await prisma.genre.upsert({
            where: { slug: normalizeSlug(genre.name) },
            update: { name: genre.name },
            create: {
                name: genre.name,
                slug: normalizeSlug(genre.name),
            },
        });

        genreMap.set(genre.id, record.id);
    }

    return genreMap;
}

async function fetchPopularMovies(
    credentials: TmdbCredentials,
    pages: number,
): Promise<TmdbPopularMovie[]> {
    const movies: TmdbPopularMovie[] = [];

    for (let page = 1; page <= pages; page += 1) {
        const response = await axios.get<TmdbPopularResponse>(
            `${TMDB_BASE_URL}/movie/popular`,
            buildTmdbRequestConfig(credentials, { language: 'en-US', page }),
        );
        movies.push(...response.data.results);
    }

    return movies;
}

async function fetchMovieDetails(
    credentials: TmdbCredentials,
    movieId: number,
): Promise<TmdbMovieDetail> {
    const response = await axios.get<TmdbMovieDetail>(
        `${TMDB_BASE_URL}/movie/${movieId}`,
        buildTmdbRequestConfig(credentials, {
            append_to_response: 'credits,videos',
            language: 'en-US',
        }),
    );

    return response.data;
}

export async function syncTmdbPopularMovies(
    prisma: PrismaClient,
    options: SyncTmdbOptions = {},
): Promise<{ failed: number; imported: number; movieCount: number; updated: number }> {
    const credentials = options.credentials ?? getTmdbCredentials();
    const pages = options.pages ?? 3;
    const delayMs = options.delayMs ?? 0;
    const log = options.log ?? (() => undefined);

    if (!hasTmdbCredentials(credentials)) {
        throw new Error('TMDB credentials are not configured');
    }

    log(`Syncing TMDB catalog (${pages} page(s))...`);

    const genreMap = await upsertGenres(prisma, credentials);
    const movies = await fetchPopularMovies(credentials, pages);

    let imported = 0;
    let updated = 0;
    let failed = 0;

    for (const movieSummary of movies) {
        try {
            const details = await fetchMovieDetails(credentials, movieSummary.id);
            const existingMovie = await prisma.movie.findUnique({
                where: { tmdbId: details.id },
                select: { id: true },
            });

            const actorNames = (details.credits?.cast ?? [])
                .slice(0, 5)
                .map((member) => member.name?.trim())
                .filter((name): name is string => Boolean(name));

            const movie = await prisma.movie.upsert({
                where: { tmdbId: details.id },
                update: {
                    title: details.title,
                    description: details.overview || '',
                    releaseYear: details.release_date ? new Date(details.release_date).getFullYear() : null,
                    durationSeconds: details.runtime ? details.runtime * 60 : null,
                    posterUrl: details.poster_path ? `${IMAGE_BASE_URL}${details.poster_path}` : null,
                    backdropUrl: details.backdrop_path ? `${IMAGE_BASE_URL}${details.backdrop_path}` : null,
                    movieStatus: 'published',
                    encodeStatus: 'ready',
                    popularity: details.popularity ?? 0,
                    voteAverage: details.vote_average ?? 0,
                    voteCount: details.vote_count ?? 0,
                    originalLanguage: details.original_language ?? null,
                    trailerUrl: getOfficialTrailerUrl(details.videos?.results ?? []),
                    actors: actorNames,
                },
                create: {
                    title: details.title,
                    description: details.overview || '',
                    releaseYear: details.release_date ? new Date(details.release_date).getFullYear() : null,
                    durationSeconds: details.runtime ? details.runtime * 60 : null,
                    posterUrl: details.poster_path ? `${IMAGE_BASE_URL}${details.poster_path}` : null,
                    backdropUrl: details.backdrop_path ? `${IMAGE_BASE_URL}${details.backdrop_path}` : null,
                    movieStatus: 'published',
                    encodeStatus: 'ready',
                    tmdbId: details.id,
                    popularity: details.popularity ?? 0,
                    voteAverage: details.vote_average ?? 0,
                    voteCount: details.vote_count ?? 0,
                    originalLanguage: details.original_language ?? null,
                    trailerUrl: getOfficialTrailerUrl(details.videos?.results ?? []),
                    actors: actorNames,
                },
            });

            const genreIds = details.genres
                .map((genre) => genreMap.get(genre.id))
                .filter((genreId): genreId is string => Boolean(genreId));

            await prisma.movieGenre.deleteMany({ where: { movieId: movie.id } });
            if (genreIds.length > 0) {
                await prisma.movieGenre.createMany({
                    data: genreIds.map((genreId) => ({ movieId: movie.id, genreId })),
                    skipDuplicates: true,
                });
            }

            if (existingMovie) {
                updated += 1;
                log(`Updated TMDB movie: ${details.title}`);
            } else {
                imported += 1;
                log(`Imported TMDB movie: ${details.title}`);
            }

            if (delayMs > 0) {
                await new Promise((resolve) => setTimeout(resolve, delayMs));
            }
        } catch (error) {
            failed += 1;
            const message = error instanceof Error ? error.message : String(error);
            log(`Failed to sync TMDB movie "${movieSummary.title}": ${message}`);
        }
    }

    const movieCount = await prisma.movie.count();

    return { failed, imported, movieCount, updated };
}

