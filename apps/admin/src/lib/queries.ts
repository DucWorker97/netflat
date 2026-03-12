import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from './api';

// Types
interface Genre {
    id: string;
    name: string;
    slug: string;
    movieCount?: number;
}

interface Movie {
    id: string;
    title: string;
    description: string | null;
    posterUrl: string | null;
    durationSeconds: number | null;
    releaseYear: number | null;
    movieStatus: 'draft' | 'published';
    encodeStatus: 'pending' | 'processing' | 'ready' | 'failed';
    genres: Genre[];
    actors: string[];
    createdAt: string;
    updatedAt: string;
    videoUrl?: string | null;
}

interface PaginationMeta {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
}

interface MoviesListParams {
    page?: number;
    limit?: number;
    q?: string;
    genreId?: string;
}

interface CreateMovieInput {
    title: string;
    description?: string;
    genreIds?: string[];
    actors?: string[];
    releaseYear?: number;
    durationSeconds?: number;
}

interface UpdateMovieInput {
    title?: string;
    description?: string;
    genreIds?: string[];
    actors?: string[];
    releaseYear?: number;
    durationSeconds?: number;
}

// Queries
export function useGenres() {
    return useQuery({
        queryKey: ['genres'],
        queryFn: async () => {
            const res = await api.get<{ data: Genre[] }>('/api/genres');
            return res.data;
        },
    });
}

export function useCreateGenre() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (input: { name: string; slug?: string }) => {
            const res = await api.post<{ data: Genre }>('/api/genres', input);
            return res.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['genres'] });
        },
    });
}

export function useUpdateGenre() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ id, input }: { id: string; input: { name?: string; slug?: string } }) => {
            const res = await api.put<{ data: Genre }>(`/api/genres/${id}`, input);
            return res.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['genres'] });
        },
    });
}

export function useDeleteGenre() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (id: string) => {
            await api.delete(`/api/genres/${id}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['genres'] });
        },
    });
}

export function useMovies(params: MoviesListParams = {}) {
    const { page = 1, limit = 20, q, genreId } = params;
    const queryParams = new URLSearchParams();
    queryParams.set('page', String(page));
    queryParams.set('limit', String(limit));
    if (q) queryParams.set('q', q);
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

export function useMoviePolling(id: string, enabled: boolean) {
    return useQuery({
        queryKey: ['movie', id],
        queryFn: async () => {
            const res = await api.get<{ data: Movie }>(`/api/movies/${id}`);
            return res.data;
        },
        enabled: !!id && enabled,
        refetchInterval: enabled ? 3000 : false,
    });
}

// Mutations
export function useCreateMovie() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (input: CreateMovieInput) => {
            const res = await api.post<{ data: Movie }>('/api/movies', input);
            return res.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['movies'] });
        },
    });
}

export function useUpdateMovie() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ id, input }: { id: string; input: UpdateMovieInput }) => {
            const res = await api.put<{ data: Movie }>(`/api/movies/${id}`, input);
            return res.data;
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['movies'] });
            queryClient.invalidateQueries({ queryKey: ['movie', variables.id] });
        },
    });
}

export function useDeleteMovie() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (id: string) => {
            await api.delete(`/api/movies/${id}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['movies'] });
        },
    });
}

export function usePublishMovie() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ id, published }: { id: string; published: boolean }) => {
            const res = await api.patch<{ data: Movie }>(`/api/movies/${id}/publish`, { published });
            return res.data;
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['movies'] });
            queryClient.invalidateQueries({ queryKey: ['movie', variables.id] });
        },
    });
}

// Upload
interface PresignedUrlResponse {
    uploadUrl: string;
    objectKey: string;
    expiresAt: string;
}

export function usePresignedUrl() {
    return useMutation({
        mutationFn: async (params: {
            movieId: string;
            fileName: string;
            contentType: string;
            sizeBytes: number;
            fileType?: 'video' | 'thumbnail';
        }) => {
            const searchParams = new URLSearchParams();
            searchParams.set('movieId', params.movieId);
            searchParams.set('fileName', params.fileName);
            searchParams.set('contentType', params.contentType);
            searchParams.set('sizeBytes', String(params.sizeBytes));
            if (params.fileType) searchParams.set('fileType', params.fileType);

            const res = await api.get<{ data: PresignedUrlResponse }>(
                `/api/upload/presigned-url?${searchParams.toString()}`
            );
            return res.data;
        },
    });
}

export function useUploadComplete() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (params: { movieId: string; objectKey: string; fileType?: string }) => {
            const res = await api.post<{ data: { movieId: string; encodeStatus: string } }>(
                `/api/movies/${params.movieId}/upload-complete`,
                { objectKey: params.objectKey, fileType: params.fileType }
            );
            return res.data;
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['movie', variables.movieId] });
        },
    });
}

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

export type {
    Genre,
    Movie,
    PaginationMeta,
    CreateMovieInput,
    UpdateMovieInput,
};
