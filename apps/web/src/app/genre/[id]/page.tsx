'use client';

import { useMovies, useGenres, type Movie } from '@/lib/queries';
import { MovieCardSkeleton } from '@/components/skeletons';
import { ErrorState, EmptyState } from '@/components/error-states';
import Link from 'next/link';
import { use } from 'react';

import { MovieCard } from '@/components/movie-card';

export default function GenrePage({ params }: { params: Promise<{ id: string }> }) {
    const { id: genreId } = use(params);

    const { data: genres } = useGenres();
    const { data: moviesData, isLoading, error, refetch } = useMovies({
        genreId,
        limit: 50
    });

    const genre = genres?.find(g => g.id === genreId);
    const movies = moviesData?.data || [];

    return (
        <div style={{ minHeight: '100vh', paddingBottom: '4rem' }}>
            {/* Header */}
            <div style={{
                background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
                padding: '3rem 0',
                marginBottom: '2rem'
            }}>
                <div className="container">
                    <Link href="/" style={{
                        color: 'rgba(255,255,255,0.7)',
                        marginBottom: '1rem',
                        display: 'inline-block'
                    }}>
                        ← Về trang chủ
                    </Link>
                    <h1 style={{ fontSize: '3rem', fontWeight: 700 }}>
                        {genre?.name || 'Thể loại'}
                    </h1>
                    <p style={{ color: 'rgba(255,255,255,0.7)', marginTop: '0.5rem' }}>
                        {movies.length} phim
                    </p>
                </div>
            </div>

            {/* Movies Grid */}
            <div className="container">
                {isLoading ? (
                    <div className="movie-grid">
                        {[...Array(12)].map((_, i) => (
                            <MovieCardSkeleton key={i} />
                        ))}
                    </div>
                ) : error ? (
                    <ErrorState
                        title="Không thể tải phim"
                        message="Không thể tải danh sách phim cho thể loại này."
                        onRetry={() => refetch()}
                    />
                ) : movies.length === 0 ? (
                    <EmptyState
                        icon="🎬"
                        title="Thể loại này chưa có phim"
                        message="Vui lòng quay lại sau để xem nội dung mới."
                    />
                ) : (
                    <div className="movie-grid">
                        {movies.map((movie) => (
                            <MovieCard key={movie.id} movie={movie} />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
