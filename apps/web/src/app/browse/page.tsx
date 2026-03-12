'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import styles from './browse.module.css';
import { api } from '@/lib/api';

interface Genre {
    id: string;
    name: string;
    slug: string;
}

interface Movie {
    id: string;
    title: string;
    posterUrl: string | null;
    releaseYear: number | null;
    voteAverage: number | null;
}

interface GenresResponse {
    data: Genre[];
}

interface MoviesResponse {
    data: Movie[];
}

const GENRE_COLORS: Record<string, string> = {
    action: '#dc2626',
    comedy: '#f5c518',
    drama: '#6366f1',
    horror: '#7c3aed',
    'sci-fi': '#06b6d4',
    romance: '#ec4899',
    thriller: '#ef4444',
    animation: '#22c55e',
    documentary: '#84cc16',
    fantasy: '#a855f7',
    mystery: '#64748b',
    adventure: '#f97316',
};

function getGenreColor(slug: string): string {
    return GENRE_COLORS[slug] || '#6366f1';
}

export default function BrowsePage() {
    const [genres, setGenres] = useState<Genre[]>([]);
    const [movies, setMovies] = useState<Movie[]>([]);
    const [selectedGenre, setSelectedGenre] = useState<Genre | null>(null);
    const [sortBy, setSortBy] = useState<'popular' | 'recent' | 'rating'>('popular');
    const [loadingGenres, setLoadingGenres] = useState(true);
    const [loadingMovies, setLoadingMovies] = useState(false);

    useEffect(() => {
        async function fetchGenres() {
            try {
                const res = await api.get<GenresResponse>('/api/genres');
                setGenres(res.data || []);
            } catch {
                setGenres([]);
            } finally {
                setLoadingGenres(false);
            }
        }
        fetchGenres();
    }, []);

    useEffect(() => {
        if (!selectedGenre) {
            setMovies([]);
            return;
        }
        async function fetchMovies() {
            setLoadingMovies(true);
            try {
                const res = await api.get<MoviesResponse>(`/api/movies?genreId=${selectedGenre!.id}&status=published&limit=12`);
                setMovies(res.data || []);
            } catch {
                setMovies([]);
            } finally {
                setLoadingMovies(false);
            }
        }
        fetchMovies();
    }, [selectedGenre]);

    return (
        <div className={styles.container}>
            {/* Navbar */}
            <nav className={styles.navbar}>
                <Link href="/" className={styles.logo}>NETFLAT</Link>
                <Link href="/" className={styles.backLink}>← Home</Link>
            </nav>

            <main className={styles.main}>
                {/* Header */}
                <div className={styles.header}>
                    <h1 className={styles.title}>Browse by Genre</h1>
                    <p className={styles.subtitle}>
                        {loadingGenres ? 'Loading genres...' : `Explore movies across ${genres.length} genres`}
                    </p>
                </div>

                {/* Genre Grid */}
                <div className={styles.genreGrid}>
                    {genres.map((genre) => (
                        <button
                            key={genre.id}
                            className={`${styles.genreCard} ${selectedGenre?.id === genre.id ? styles.genreCardActive : ''}`}
                            style={{ '--genre-color': getGenreColor(genre.slug) } as React.CSSProperties}
                            onClick={() => setSelectedGenre(selectedGenre?.id === genre.id ? null : genre)}
                        >
                            <span className={styles.genreName}>{genre.name}</span>
                        </button>
                    ))}
                </div>

                {/* Selected Genre Movies */}
                {selectedGenre && (
                    <div className={styles.moviesSection}>
                        <div className={styles.sectionHeader}>
                            <h2>{selectedGenre.name} Movies</h2>
                            <div className={styles.sortOptions}>
                                <button
                                    className={`${styles.sortBtn} ${sortBy === 'popular' ? styles.sortActive : ''}`}
                                    onClick={() => setSortBy('popular')}
                                >
                                    Popular
                                </button>
                                <button
                                    className={`${styles.sortBtn} ${sortBy === 'recent' ? styles.sortActive : ''}`}
                                    onClick={() => setSortBy('recent')}
                                >
                                    Recent
                                </button>
                                <button
                                    className={`${styles.sortBtn} ${sortBy === 'rating' ? styles.sortActive : ''}`}
                                    onClick={() => setSortBy('rating')}
                                >
                                    Top Rated
                                </button>
                            </div>
                        </div>

                        {loadingMovies ? (
                            <p style={{ color: '#888', textAlign: 'center', padding: '2rem' }}>Loading movies...</p>
                        ) : movies.length === 0 ? (
                            <p style={{ color: '#888', textAlign: 'center', padding: '2rem' }}>No movies in this genre yet.</p>
                        ) : (
                            <div className={styles.moviesGrid}>
                                {movies.map((movie) => (
                                    <Link key={movie.id} href={`/movies/${movie.id}`} className={styles.movieCard}>
                                        <div className={styles.poster}>
                                            <span className={styles.posterLetter}>{movie.title.charAt(0)}</span>
                                        </div>
                                        <div className={styles.movieInfo}>
                                            <h3>{movie.title}</h3>
                                            <div className={styles.movieMeta}>
                                                <span>{movie.releaseYear ?? '--'}</span>
                                                <span className={styles.rating}>★ {movie.voteAverage?.toFixed(1) ?? '--'}</span>
                                            </div>
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* Featured Genres (when nothing selected) */}
                {!selectedGenre && genres.length > 0 && (
                    <div className={styles.featuredSection}>
                        <h2>🔥 Trending Genres</h2>
                        <div className={styles.trendingGenres}>
                            {genres.slice(0, 4).map((genre) => (
                                <div
                                    key={genre.id}
                                    className={styles.trendingCard}
                                    style={{ '--genre-color': getGenreColor(genre.slug) } as React.CSSProperties}
                                >
                                    <h3>{genre.name}</h3>
                                    <button
                                        className={styles.exploreBtn}
                                        onClick={() => setSelectedGenre(genre)}
                                    >
                                        Explore →
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}
