// ─────────────────────────────────────────────────────────────
// API Response Types
// ─────────────────────────────────────────────────────────────

export interface ApiResponse<T> {
    data: T;
    meta?: PaginationMeta;
}

export interface PaginationMeta {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
}

export interface ErrorResponse {
    error: {
        code: string;
        message: string;
        details?: Record<string, unknown> | null;
        requestId: string;
    };
}

// ─────────────────────────────────────────────────────────────
// Enums
// ─────────────────────────────────────────────────────────────

export enum UserRole {
    VIEWER = 'viewer',
    ADMIN = 'admin',
}

export enum MovieStatus {
    DRAFT = 'draft',
    PUBLISHED = 'published',
}

export enum EncodeStatus {
    PENDING = 'pending',
    PROCESSING = 'processing',
    READY = 'ready',
    FAILED = 'failed',
}

// ─────────────────────────────────────────────────────────────
// Entity Types
// ─────────────────────────────────────────────────────────────

export interface User {
    id: string;
    email: string;
    role: UserRole;
    createdAt: string;
    updatedAt: string;
}

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
    movieStatus: MovieStatus;
    encodeStatus: EncodeStatus;
    genres: Genre[];
    createdAt: string;
    updatedAt: string;
}

export interface MovieListItem {
    id: string;
    title: string;
    posterUrl: string | null;
    durationSeconds: number | null;
    releaseYear: number | null;
    genres: Genre[];
}

export interface Favorite {
    id: string;
    movieId: string;
    movie: MovieListItem;
    createdAt: string;
}

// ─────────────────────────────────────────────────────────────
// Auth Types
// ─────────────────────────────────────────────────────────────

export interface AuthResponse {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
    user: User;
}

export interface LoginRequest {
    email: string;
    password: string;
}

export interface RegisterRequest {
    email: string;
    password: string;
}

// ─────────────────────────────────────────────────────────────
// Stream Types
// ─────────────────────────────────────────────────────────────

export interface StreamResponse {
    playbackUrl: string;
    expiresAt: string;
}
