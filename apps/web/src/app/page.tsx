'use client';

import { useAuth } from '@/lib/auth-context';
import { useMovies, useGenres, useRecentlyAdded, useContinueWatching } from '@/lib/queries';
import { HeroBannerSkeleton, RailSkeleton, MovieCardSkeleton } from '@/components/skeletons';
import { ErrorState, EmptyState } from '@/components/error-states';
import Link from 'next/link';
import { useState } from 'react';
import { MovieCard } from '@/components/movie-card';
import { HeroBanner } from '@/components/hero-banner';
import { MovieRail } from '@/components/movie-rail';
import { Pagination } from '@/components/pagination';
import { SurpriseMe } from '@/components/SurpriseMe';

const MOVIES_PER_PAGE = 20;

export default function HomePage() {
    const { isLoading: authLoading, isAuthenticated } = useAuth();
    const [selectedGenre, setSelectedGenre] = useState<string>('');
    const [currentPage, setCurrentPage] = useState(1);

    const { data: genres } = useGenres();
    const { data: moviesData, isLoading, error: moviesError, refetch: refetchMovies } = useMovies({
        page: currentPage,
        limit: MOVIES_PER_PAGE,
        genreId: selectedGenre || undefined
    });
    const { data: recentlyAdded, isLoading: recentLoading } = useRecentlyAdded(10);
    const { data: continueWatching, isLoading: cwLoading } = useContinueWatching(10);

    // Pick a featured movie for hero (prefer movie with backdrop, fallback to first movie)
    const featuredMovie = moviesData?.data?.find(m => m.backdropUrl || m.posterUrl) || moviesData?.data?.[0];

    if (authLoading) {
        return (
            <div className="loading-spinner"><div className="spinner" /></div>
        );
    }

    return (
        <>
            <HeroBanner movie={featuredMovie} isLoading={isLoading} />

            <main className="container" style={{ paddingBottom: '4rem' }}>
                {/* Continue Watching Rail */}
                {isAuthenticated && (
                    <MovieRail
                        title="Tiếp tục xem"
                        movies={continueWatching?.map(item => item.movie)}
                        isLoading={cwLoading}
                    />
                )}

                {/* Recently Added Rail */}
                <MovieRail
                    title="Mới thêm"
                    movies={recentlyAdded}
                    isLoading={recentLoading}
                />

                {/* Quick Actions Section */}
                <div className="section-header" style={{ marginTop: '2rem' }}>
                    <h2 className="section-title">Thao tác nhanh</h2>
                </div>
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                    gap: '1rem',
                    marginBottom: '2rem'
                }}>
                    <SurpriseMe variant="card" />
                </div>

                {/* Genre Filter */}
                <div className="genre-pills" style={{ marginBottom: '2rem' }}>
                    <button
                        className="genre-pill"
                        style={{
                            background: !selectedGenre ? 'var(--accent)' : undefined,
                            color: !selectedGenre ? 'white' : undefined,
                            cursor: 'pointer',
                            border: 'none'
                        }}
                        onClick={() => setSelectedGenre('')}
                    >
                        Tất cả
                    </button>
                    {genres?.map((genre) => (
                        <Link
                            key={genre.id}
                            href={`/genre/${genre.id}`}
                            className="genre-pill"
                            style={{
                                background: selectedGenre === genre.id ? 'var(--accent)' : undefined,
                                color: selectedGenre === genre.id ? 'white' : undefined,
                                cursor: 'pointer',
                                border: 'none',
                                textDecoration: 'none'
                            }}
                        >
                            {genre.name}
                        </Link>
                    ))}
                </div>

                <div className="section-header">
                    <h2 className="section-title">
                        {selectedGenre
                            ? genres?.find(g => g.id === selectedGenre)?.name || 'Phim'
                            : 'Tất cả phim'
                        }
                    </h2>
                </div>

                {/* Movies Grid with improved states */}
                {isLoading ? (
                    <div className="movie-grid">
                        {[...Array(10)].map((_, i) => (
                            <MovieCardSkeleton key={i} />
                        ))}
                    </div>
                ) : moviesError ? (
                    <ErrorState
                        title="Không thể tải danh sách phim"
                        message="Đã có lỗi khi tải dữ liệu. Vui lòng thử lại."
                        onRetry={() => refetchMovies()}
                    />
                ) : moviesData?.data?.length === 0 ? (
                    <EmptyState
                        icon="🎬"
                        title="Không tìm thấy phim"
                        message={selectedGenre
                            ? 'Thể loại này chưa có phim. Hãy thử thể loại khác.'
                            : 'Vui lòng quay lại sau để xem nội dung mới.'
                        }
                    />
                ) : (
                    <>
                        <div className="movie-grid">
                            {moviesData?.data?.map((movie) => (
                                <MovieCard key={movie.id} movie={movie} />
                            ))}
                        </div>
                        {moviesData?.meta && (
                            <Pagination
                                currentPage={currentPage}
                                totalPages={moviesData.meta.totalPages}
                                onPageChange={(page) => {
                                    setCurrentPage(page);
                                    window.scrollTo({ top: 400, behavior: 'smooth' });
                                }}
                            />
                        )}
                        {moviesData?.meta && moviesData.meta.total > 0 && (
                            <p style={{
                                textAlign: 'center',
                                color: 'var(--text-secondary)',
                                fontSize: '0.875rem',
                                marginTop: '0.5rem'
                            }}>
                                Hiển thị {(currentPage - 1) * MOVIES_PER_PAGE + 1}–{Math.min(currentPage * MOVIES_PER_PAGE, moviesData.meta.total)} trên tổng {moviesData.meta.total} phim
                            </p>
                        )}
                    </>
                )}
            </main>
        </>
    );
}
