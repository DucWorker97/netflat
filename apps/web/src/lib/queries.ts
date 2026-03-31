import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from './api';

// Types
export interface Genre {
    id: string;
    name: string;
    slug: string;
}

export interface Movie {
    id: string;
    title: string;
    description: string | null;
    posterUrl: string | null;
    backdropUrl: string | null;
    durationSeconds: number | null;
    releaseYear: number | null;
    movieStatus: 'draft' | 'published';
    encodeStatus: 'pending' | 'processing' | 'ready' | 'failed';
    playbackUrl: string | null;
    tmdbId?: number | null;
    voteAverage?: number | null;
    voteCount?: number | null;
    popularity?: number | null;
    originalLanguage?: string | null;
    trailerUrl?: string | null;
    genres: Genre[];
    actors?: string[];
    createdAt: string;
    updatedAt?: string;
}

export interface MovieReview {
    id: string;
    userName: string;
    rating: number;
    comment: string | null;
    createdAt: string;
}

export interface MovieRatingStats {
    avgRating: number | null;
    ratingsCount: number;
}

export interface UserMovieRating {
    id: string;
    userId: string;
    movieId: string;
    rating: number;
    comment: string | null;
    createdAt: string;
    updatedAt: string;
}

interface ApiRatingUser {
    id?: string;
    email?: string;
    displayName?: string | null;
    avatarUrl?: string | null;
}

interface ApiRatingRecord {
    id: string;
    userId: string;
    movieId: string;
    score?: number | null;
    rating?: number | null;
    comment?: string | null;
    createdAt: string;
    updatedAt?: string;
    user?: ApiRatingUser | null;
    userName?: string;
}

function normalizeRatingValue(value: number | null | undefined) {
    return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

function normalizeReviewerName(record: ApiRatingRecord) {
    const explicitName = record.userName?.trim();
    if (explicitName) return explicitName;

    const displayName = record.user?.displayName?.trim();
    if (displayName) return displayName;

    const email = record.user?.email?.trim();
    if (email) return email.split('@')[0];

    return 'Người dùng';
}

function normalizeReview(record: ApiRatingRecord): MovieReview {
    return {
        id: record.id,
        userName: normalizeReviewerName(record),
        rating: normalizeRatingValue(record.score ?? record.rating),
        comment: record.comment ?? null,
        createdAt: record.createdAt,
    };
}

function normalizeUserRating(record: ApiRatingRecord): UserMovieRating {
    return {
        id: record.id,
        userId: record.userId,
        movieId: record.movieId,
        rating: normalizeRatingValue(record.score ?? record.rating),
        comment: record.comment ?? null,
        createdAt: record.createdAt,
        updatedAt: record.updatedAt ?? record.createdAt,
    };
}

interface PaginationMeta {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
}

// Genres
export function useGenres() {
    return useQuery({
        queryKey: ['genres'],
        queryFn: async () => {
            const res = await api.get<{ data: Genre[] }>('/api/genres');
            return res.data;
        },
    });
}

// Movies
export function useMovies(params: { page?: number; limit?: number; genreId?: string; q?: string; sort?: string; order?: string } = {}) {
    const { page = 1, limit = 20, genreId, q, sort, order } = params;
    const queryParams = new URLSearchParams();
    queryParams.set('page', String(page));
    queryParams.set('limit', String(limit));
    queryParams.set('status', 'published'); // Only published movies
    if (genreId) queryParams.set('genreId', genreId);
    if (q) queryParams.set('q', q);
    if (sort) queryParams.set('sort', sort);
    if (order) queryParams.set('order', order);

    return useQuery({
        queryKey: ['movies', params],
        queryFn: async () => {
            const res = await api.get<{ data: Movie[]; meta: PaginationMeta }>(
                `/api/movies?${queryParams.toString()}`
            );
            return res;
        },
    });
}

export function useMovie(id: string) {
    return useQuery({
        queryKey: ['movie', id],
        queryFn: async () => {
            const res = await api.get<{ data: Movie }>(`/api/movies/${id}`);
            return res.data;
        },
        enabled: !!id,
    });
}

export function useStreamUrl(id: string) {
    return useQuery({
        queryKey: ['stream', id],
        queryFn: async () => {
            const res = await api.get<{
                data: {
                    playbackUrl: string;
                    qualityOptions?: { name: string; url: string }[];
                }
            }>(
                `/api/movies/${id}/stream`
            );
            return res.data;
        },
        enabled: !!id,
        staleTime: 5 * 60 * 1000,
    });
}

// Favorites
export function useFavorites() {
    return useQuery({
        queryKey: ['favorites'],
        queryFn: async () => {
            const res = await api.get<{ data: { id: string; movie: Movie }[] }>('/api/favorites');
            return res.data;
        },
    });
}

export function useAddFavorite() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (movieId: string) => {
            await api.post(`/api/favorites/${movieId}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['favorites'] });
        },
    });
}

export function useRemoveFavorite() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (movieId: string) => {
            await api.delete(`/api/favorites/${movieId}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['favorites'] });
        },
    });
}

// Recently Added Movies  
export function useRecentlyAdded(limit = 10) {
    return useQuery({
        queryKey: ['movies', 'recent', limit],
        queryFn: async () => {
            const res = await api.get<{ data: Movie[] }>(`/api/movies?limit=${limit}&sort=createdAt&order=desc`);
            return res.data;
        },
    });
}

// Ratings
export function useMovieRatingStats(movieId: string) {
    return useQuery({
        queryKey: ['ratings', movieId, 'stats'],
        queryFn: async () => {
            const res = await api.get<{
                data: {
                    avgRating?: number | null;
                    ratingsCount?: number;
                    averageScore?: number | null;
                    totalRatings?: number;
                }
            }>(`/api/ratings/${movieId}/stats`);

            return {
                avgRating: typeof res.data.avgRating === 'number'
                    ? res.data.avgRating
                    : typeof res.data.averageScore === 'number'
                        ? res.data.averageScore
                        : null,
                ratingsCount: typeof res.data.ratingsCount === 'number'
                    ? res.data.ratingsCount
                    : typeof res.data.totalRatings === 'number'
                        ? res.data.totalRatings
                        : 0,
            } satisfies MovieRatingStats;
        },
    });
}

export function useUserRating(movieId: string, enabled = true) {
    return useQuery({
        queryKey: ['ratings', movieId, 'user'],
        queryFn: async () => {
            const res = await api.get<{ data: ApiRatingRecord | null }>(`/api/ratings/${movieId}/user`);
            return res.data ? normalizeUserRating(res.data) : null;
        },
        enabled: !!movieId && enabled,
    });
}

export function useRateMovie() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ movieId, rating, comment }: { movieId: string; rating: number; comment?: string }) => {
            await api.post(`/api/ratings/${movieId}`, { rating, comment });
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['ratings', variables.movieId] });
            queryClient.invalidateQueries({ queryKey: ['ratings', variables.movieId, 'list'] });
        },
    });
}

export function useMovieReviews(movieId: string, limit = 20) {
    return useQuery({
        queryKey: ['ratings', movieId, 'list', limit],
        queryFn: async () => {
            const res = await api.get<{
                data: ApiRatingRecord[] | { data?: ApiRatingRecord[]; total?: number }
            }>(`/api/ratings/${movieId}/list?limit=${limit}`);

            const records = Array.isArray(res.data)
                ? res.data
                : Array.isArray(res.data?.data)
                    ? res.data.data
                    : [];

            return records.map(normalizeReview);
        },
        enabled: !!movieId,
    });
}

// Actor Autocomplete
export function useActorSuggest(q: string) {
    return useQuery({
        queryKey: ['actors', 'suggest', q],
        queryFn: async () => {
            const res = await api.get<{ data: string[] }>(`/api/actors/suggest?q=${encodeURIComponent(q)}`);
            return res.data;
        },
        enabled: q.length > 0,
    });
}

// Profile
export interface UserProfile {
    id: string;
    email: string;
    displayName: string | null;
    avatarUrl: string | null;
    role: string;
    isActive: boolean;
    createdAt: string;
    stats: {
        favorites: number;
        ratings: number;
    };
}

export function useProfile(enabled = true) {
    return useQuery({
        queryKey: ['profile'],
        queryFn: async () => {
            const res = await api.get<{ data: UserProfile }>('/api/users/profile');
            return res.data;
        },
        enabled,
    });
}

export function useUpdateProfile() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (data: { displayName?: string; avatarUrl?: string }) => {
            const res = await api.put<{ data: { displayName: string | null; avatarUrl: string | null } }>(
                '/api/users/profile',
                data,
            );
            return res.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['profile'] });
        },
    });
}

export function useChangePassword() {
    return useMutation({
        mutationFn: async (data: { currentPassword: string; newPassword: string }) => {
            await api.post('/api/users/change-password', data);
        },
    });
}

// Watch History
export interface WatchHistoryItem {
    id: string;
    movieId: string;
    progressSeconds: number;
    durationSeconds: number;
    completed: boolean;
    lastWatchedAt: string;
    movie: Movie;
}

export function useWatchHistory(page = 1, limit = 20) {
    return useQuery({
        queryKey: ['history', page, limit],
        queryFn: async () => {
            const res = await api.get<{ data: WatchHistoryItem[]; meta: PaginationMeta }>(
                `/api/history?page=${page}&limit=${limit}`
            );
            return res;
        },
    });
}

export function useContinueWatching(limit = 10) {
    return useQuery({
        queryKey: ['history', 'continue-watching', limit],
        queryFn: async () => {
            const res = await api.get<{ data: WatchHistoryItem[] }>(
                `/api/history/continue-watching?limit=${limit}`
            );
            return res.data;
        },
    });
}

export function useUpdateProgress() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ movieId, progressSeconds, durationSeconds }: {
            movieId: string;
            progressSeconds: number;
            durationSeconds: number;
        }) => {
            await api.post(`/api/history/${movieId}`, { progressSeconds, durationSeconds });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['history'] });
        },
    });
}

export function useRemoveHistory() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (movieId: string) => {
            await api.delete(`/api/history/${movieId}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['history'] });
        },
    });
}
