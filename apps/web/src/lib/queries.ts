import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from './api';

// Types
export interface Genre {
    id: string;
    name: string;
    slug: string;
}

export interface Actor {
    id: string;
    name: string;
    avatarUrl: string | null;
    role?: string;
    movieCount?: number;
}

export interface ActorWithMovies extends Actor {
    movies: {
        id: string;
        title: string;
        posterUrl: string | null;
        releaseYear: number | null;
        role: string | null;
        genres: Genre[];
    }[];
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
    genres: Genre[];
    actors?: Actor[];
    createdAt: string;
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
export function useMovies(params: { page?: number; limit?: number; genreId?: string } = {}) {
    const { page = 1, limit = 20, genreId } = params;
    const queryParams = new URLSearchParams();
    queryParams.set('page', String(page));
    queryParams.set('limit', String(limit));
    queryParams.set('status', 'published'); // Only published movies
    if (genreId) queryParams.set('genreId', genreId);

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
                    expiresAt: string | null;
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

// Watch History
export function useWatchHistory() {
    return useQuery({
        queryKey: ['history'],
        queryFn: async () => {
            const res = await api.get<{ data: { id: string; movie: Movie; progressSeconds: number; completed: boolean }[] }>('/api/history');
            return res.data;
        },
    });
}

// Continue Watching - incomplete movies only
export function useContinueWatching() {
    return useQuery({
        queryKey: ['continueWatching'],
        queryFn: async () => {
            const res = await api.get<{ data: { id: string; movie: Movie; progressSeconds: number; completed: boolean; durationSeconds: number }[] }>('/api/history');
            // Filter for movies with progress > 0 and not completed
            return res.data.filter(item => item.progressSeconds > 0 && !item.completed);
        },
    });
}

export function useUpdateProgress() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({
            movieId,
            progressSeconds,
            durationSeconds,
        }: {
            movieId: string;
            progressSeconds: number;
            durationSeconds: number;
        }) => {
            await api.post(`/api/history/${movieId}`, { progressSeconds, durationSeconds });
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['progress', variables.movieId] });
            queryClient.invalidateQueries({ queryKey: ['history'] });
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
            const res = await api.get<{ data: { avgRating: number | null; ratingsCount: number } }>(`/api/ratings/${movieId}/stats`);
            return res.data;
        },
    });
}

export function useUserRating(movieId: string) {
    return useQuery({
        queryKey: ['ratings', movieId, 'user'],
        queryFn: async () => {
            const res = await api.get<{ data: { rating: number } | null }>(`/api/ratings/${movieId}/user`);
            return res.data;
        },
    });
}

export function useRateMovie() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ movieId, rating }: { movieId: string; rating: number }) => {
            await api.post(`/api/ratings/${movieId}`, { rating });
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['ratings', variables.movieId] });
        },
    });
}

// Similar Movies (Mock)
export function useSimilarMovies(movieId: string) {
    return useQuery({
        queryKey: ['movies', movieId, 'similar'],
        queryFn: async () => {
            // Simulate API delay
            await new Promise(resolve => setTimeout(resolve, 800));
            // Return mock data (random subset of recent movies logic or just static)
            // In real app, this calls /api/movies/:id/similar
            const res = await api.get<{ data: Movie[] }>('/api/movies?limit=10&sort=createdAt&order=desc');
            return res.data.slice(0, 8); // Return 8 movies
        },
        enabled: !!movieId,
    });
}

// Actors
export function useActors() {
    return useQuery({
        queryKey: ['actors'],
        queryFn: async () => {
            const res = await api.get<{ data: Actor[] }>('/api/actors');
            return res.data;
        },
    });
}

export function useActor(id: string) {
    return useQuery({
        queryKey: ['actor', id],
        queryFn: async () => {
            const res = await api.get<{ data: ActorWithMovies }>(`/api/actors/${id}`);
            return res.data;
        },
        enabled: !!id,
    });
}
