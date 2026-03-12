'use client';

import { useEffect, useState } from 'react';
import { useDebounce } from '@/lib/hooks/use-debounce';
import { useGenres, useMovies } from '@/lib/queries';
import { MovieCard } from '@/components/movie-card';
import { MovieCardSkeleton } from '@/components/skeletons';
import { ErrorState, EmptyState } from '@/components/error-states';
import { Pagination } from '@/components/pagination';
import styles from './movies.module.css';

const MOVIES_PER_PAGE = 24;

export default function MoviesPage() {
    const [currentPage, setCurrentPage] = useState(1);
    const [selectedGenre, setSelectedGenre] = useState('');
    const [searchTerm, setSearchTerm] = useState('');

    const debouncedSearch = useDebounce(searchTerm, 300);

    const { data: genres } = useGenres();
    const { data: moviesData, isLoading, error, refetch } = useMovies({
        page: currentPage,
        limit: MOVIES_PER_PAGE,
        genreId: selectedGenre || undefined,
        q: debouncedSearch || undefined,
    });

    const movies = moviesData?.data || [];
    const total = moviesData?.meta?.total || 0;

    useEffect(() => {
        setCurrentPage(1);
    }, [selectedGenre, debouncedSearch]);

    const clearFilters = () => {
        setSelectedGenre('');
        setSearchTerm('');
    };

    return (
        <div className={styles.page}>
            <div className={styles.hero}>
                <div className={styles.heroContent}>
                    <h1 className={styles.title}>Movies</h1>
                    <p className={styles.subtitle}>
                        Browse the full Netflat catalog and discover your next favorite.
                    </p>
                    <div className={styles.searchRow}>
                        <input
                            className={styles.searchInput}
                            type="search"
                            placeholder="Search by title..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                        {(searchTerm || selectedGenre) && (
                            <button className={styles.clearButton} onClick={clearFilters}>
                                Clear Filters
                            </button>
                        )}
                    </div>
                </div>
            </div>

            <main className="container" style={{ paddingBottom: '4rem' }}>
                <div className={styles.filters}>
                    <button
                        className={`${styles.filterButton} ${!selectedGenre ? styles.filterActive : ''}`}
                        onClick={() => setSelectedGenre('')}
                    >
                        All Genres
                    </button>
                    {genres?.map((genre) => (
                        <button
                            key={genre.id}
                            className={`${styles.filterButton} ${selectedGenre === genre.id ? styles.filterActive : ''}`}
                            onClick={() => setSelectedGenre(genre.id)}
                        >
                            {genre.name}
                        </button>
                    ))}
                </div>

                <div className={styles.resultsHeader}>
                    <h2 className={styles.resultsTitle}>
                        {selectedGenre
                            ? genres?.find(g => g.id === selectedGenre)?.name || 'Movies'
                            : 'All Movies'}
                    </h2>
                    {total > 0 && (
                        <span className={styles.summary}>
                            Showing {(currentPage - 1) * MOVIES_PER_PAGE + 1} - {Math.min(currentPage * MOVIES_PER_PAGE, total)} of {total}
                        </span>
                    )}
                </div>

                {isLoading ? (
                    <div className="movie-grid">
                        {[...Array(12)].map((_, i) => (
                            <MovieCardSkeleton key={i} />
                        ))}
                    </div>
                ) : error ? (
                    <ErrorState
                        title="Unable to load movies"
                        message="We ran into a problem loading the catalog. Please try again."
                        onRetry={() => refetch()}
                    />
                ) : movies.length === 0 ? (
                    <EmptyState
                        icon="đŸŽ¬"
                        title="No movies found"
                        message={debouncedSearch || selectedGenre
                            ? 'Try clearing filters or searching a different title.'
                            : 'Check back later for new releases.'}
                    />
                ) : (
                    <div className="movie-grid">
                        {movies.map((movie) => (
                            <MovieCard key={movie.id} movie={movie} />
                        ))}
                    </div>
                )}

                {moviesData?.meta && (
                    <Pagination
                        currentPage={currentPage}
                        totalPages={moviesData.meta.totalPages}
                        onPageChange={(page) => {
                            setCurrentPage(page);
                            window.scrollTo({ top: 240, behavior: 'smooth' });
                        }}
                    />
                )}
            </main>
        </div>
    );
}
