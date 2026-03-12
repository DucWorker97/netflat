'use client';

import { useState, useRef, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { useDebounce } from '@/lib/hooks/use-debounce';
import { api } from '@/lib/api';
import { useGenres } from '@/lib/queries';
import styles from './search.module.css';
import { FeatureDisabled } from '@/components/FeatureDisabled';
import { FEATURE_FLAGS } from '@/lib/feature-flags';

interface Movie {
    id: string;
    title: string;
    posterUrl: string | null;
    releaseYear: number | null;
    durationSeconds: number | null;
    rating?: number;
}

const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: 30 }, (_, i) => CURRENT_YEAR - i);

export default function AdvancedSearchPage() {
    const [searchTerm, setSearchTerm] = useState('');
    const [showFilters, setShowFilters] = useState(false);
    const [filters, setFilters] = useState({
        genreId: '',
        yearFrom: '',
        yearTo: '',
        minRating: '',
        sortBy: 'relevance' as 'relevance' | 'newest' | 'oldest' | 'rating',
    });
    const [suggestions, setSuggestions] = useState<string[]>([]);
    const [showSuggestions, setShowSuggestions] = useState(false);

    const debouncedSearch = useDebounce(searchTerm, 300);
    const searchRef = useRef<HTMLDivElement>(null);

    const { data: genres } = useGenres();

    // Fetch movies
    const { data, isLoading } = useQuery({
        queryKey: ['movies', 'search', debouncedSearch, filters],
        queryFn: async () => {
            const params = new URLSearchParams();
            if (debouncedSearch) params.set('q', debouncedSearch);
            if (filters.genreId) params.set('genreId', filters.genreId);
            if (filters.yearFrom) params.set('yearFrom', filters.yearFrom);
            if (filters.yearTo) params.set('yearTo', filters.yearTo);
            if (filters.minRating) params.set('minRating', filters.minRating);
            params.set('limit', '24');

            const result = await api.get<{ data: Movie[]; meta: { total: number } }>(
                `/api/movies?${params.toString()}`
            );
            return result;
        },
        enabled: debouncedSearch.length > 0 || Object.values(filters).some(v => v !== '' && v !== 'relevance'),
    });

    // Generate suggestions from genres + search term
    useEffect(() => {
        if (searchTerm.length > 0 && genres) {
            const matchingGenres = genres
                .filter(g => g.name.toLowerCase().includes(searchTerm.toLowerCase()))
                .map(g => g.name)
                .slice(0, 3);
            setSuggestions(matchingGenres.length > 0 ? matchingGenres : []);
        } else {
            setSuggestions([]);
        }
    }, [searchTerm, genres]);

    // Close suggestions when clicking outside
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
                setShowSuggestions(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    if (!FEATURE_FLAGS.search) {
        return <FeatureDisabled title="Search is paused" message="Use the Movies page to browse while we focus on core streaming." />;
    }

    const movies = data?.data || [];
    const hasActiveFilters = Object.values(filters).some(v => v !== '' && v !== 'relevance');
    const showEmpty = (debouncedSearch || hasActiveFilters) && !isLoading && movies.length === 0;

    const clearFilters = () => {
        setFilters({
            genreId: '',
            yearFrom: '',
            yearTo: '',
            minRating: '',
            sortBy: 'relevance',
        });
    };

    const formatDuration = (seconds: number) => {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        return h > 0 ? `${h}h ${m}m` : `${m}m`;
    };

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <Link href="/" className={styles.backLink}>← Back</Link>
                <h1 className={styles.title}>Search</h1>
            </div>

            {/* Search Input */}
            <div className={styles.searchSection} ref={searchRef}>
                <div className={styles.searchInputWrapper}>
                    <span className={styles.searchIcon}>🔍</span>
                    <input
                        type="text"
                        placeholder="Search movies, genres, actors..."
                        value={searchTerm}
                        onChange={(e) => {
                            setSearchTerm(e.target.value);
                            setShowSuggestions(true);
                        }}
                        onFocus={() => setShowSuggestions(true)}
                        className={styles.searchInput}
                        autoFocus
                    />
                    {searchTerm && (
                        <button
                            className={styles.clearBtn}
                            onClick={() => setSearchTerm('')}
                        >
                            ×
                        </button>
                    )}
                    <button
                        className={`${styles.filterToggle} ${showFilters ? styles.filterActive : ''}`}
                        onClick={() => setShowFilters(!showFilters)}
                    >
                        ⚙️ Filters {hasActiveFilters && <span className={styles.filterBadge}>•</span>}
                    </button>
                </div>

                {/* Suggestions Dropdown */}
                {showSuggestions && suggestions.length > 0 && (
                    <div className={styles.suggestions}>
                        {suggestions.map((suggestion, i) => (
                            <button
                                key={i}
                                className={styles.suggestionItem}
                                onClick={() => {
                                    setSearchTerm(suggestion);
                                    setShowSuggestions(false);
                                }}
                            >
                                🔍 {suggestion}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* Filters Panel */}
            {showFilters && (
                <div className={styles.filtersPanel}>
                    <div className={styles.filterGroup}>
                        <label>Genre</label>
                        <select
                            value={filters.genreId}
                            onChange={(e) => setFilters({ ...filters, genreId: e.target.value })}
                        >
                            <option value="">All Genres</option>
                            {genres?.map(genre => (
                                <option key={genre.id} value={genre.id}>{genre.name}</option>
                            ))}
                        </select>
                    </div>

                    <div className={styles.filterGroup}>
                        <label>Year</label>
                        <div className={styles.yearRange}>
                            <select
                                value={filters.yearFrom}
                                onChange={(e) => setFilters({ ...filters, yearFrom: e.target.value })}
                            >
                                <option value="">From</option>
                                {YEARS.map(year => (
                                    <option key={year} value={year}>{year}</option>
                                ))}
                            </select>
                            <span>-</span>
                            <select
                                value={filters.yearTo}
                                onChange={(e) => setFilters({ ...filters, yearTo: e.target.value })}
                            >
                                <option value="">To</option>
                                {YEARS.map(year => (
                                    <option key={year} value={year}>{year}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className={styles.filterGroup}>
                        <label>Min Rating</label>
                        <select
                            value={filters.minRating}
                            onChange={(e) => setFilters({ ...filters, minRating: e.target.value })}
                        >
                            <option value="">Any</option>
                            <option value="9">9+ ⭐</option>
                            <option value="8">8+ ⭐</option>
                            <option value="7">7+ ⭐</option>
                            <option value="6">6+ ⭐</option>
                        </select>
                    </div>

                    <div className={styles.filterGroup}>
                        <label>Sort By</label>
                        <select
                            value={filters.sortBy}
                            onChange={(e) => setFilters({ ...filters, sortBy: e.target.value as typeof filters.sortBy })}
                        >
                            <option value="relevance">Relevance</option>
                            <option value="newest">Newest First</option>
                            <option value="oldest">Oldest First</option>
                            <option value="rating">Highest Rated</option>
                        </select>
                    </div>

                    {hasActiveFilters && (
                        <button className={styles.clearFilters} onClick={clearFilters}>
                            Clear Filters
                        </button>
                    )}
                </div>
            )}

            {/* Results */}
            <div className={styles.results}>
                {/* Loading */}
                {isLoading && (
                    <div className={styles.grid}>
                        {[...Array(12)].map((_, i) => (
                            <div key={i} className={styles.skeleton}>
                                <div className={styles.skeletonPoster} />
                                <div className={styles.skeletonText} />
                            </div>
                        ))}
                    </div>
                )}

                {/* Empty */}
                {showEmpty && (
                    <div className={styles.empty}>
                        <span className={styles.emptyIcon}>🎬</span>
                        <h2>No movies found</h2>
                        <p>Try different keywords or adjust your filters</p>
                        {hasActiveFilters && (
                            <button className={styles.clearFiltersBtn} onClick={clearFilters}>
                                Clear Filters
                            </button>
                        )}
                    </div>
                )}

                {/* Results Grid */}
                {movies.length > 0 && (
                    <>
                        <p className={styles.resultCount}>
                            Found {data?.meta?.total || movies.length} results
                        </p>
                        <div className={styles.grid}>
                            {movies.map((movie) => (
                                <Link key={movie.id} href={`/movies/${movie.id}`} className={styles.card}>
                                    <div className={styles.poster}>
                                        {movie.posterUrl ? (
                                            <img src={movie.posterUrl} alt={movie.title} />
                                        ) : (
                                            <span className={styles.posterFallback}>🎬</span>
                                        )}
                                        {movie.rating && (
                                            <div className={styles.ratingBadge}>
                                                ★ {movie.rating.toFixed(1)}
                                            </div>
                                        )}
                                    </div>
                                    <div className={styles.cardInfo}>
                                        <h3>{movie.title}</h3>
                                        <div className={styles.cardMeta}>
                                            {movie.releaseYear && <span>{movie.releaseYear}</span>}
                                            {movie.durationSeconds && (
                                                <span>{formatDuration(movie.durationSeconds)}</span>
                                            )}
                                        </div>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    </>
                )}

                {/* Initial State */}
                {!debouncedSearch && !hasActiveFilters && !isLoading && (
                    <div className={styles.initial}>
                        <span className={styles.initialIcon}>🔍</span>
                        <h2>Discover Movies</h2>
                        <p>Search by title or use filters to explore</p>
                        <div className={styles.quickFilters}>
                            <button onClick={() => setFilters({ ...filters, genreId: 'action' })}>
                                🎬 Action
                            </button>
                            <button onClick={() => setFilters({ ...filters, genreId: 'comedy' })}>
                                😂 Comedy
                            </button>
                            <button onClick={() => setFilters({ ...filters, minRating: '8' })}>
                                ⭐ Top Rated
                            </button>
                            <button onClick={() => setFilters({ ...filters, yearFrom: String(CURRENT_YEAR) })}>
                                🆕 This Year
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
