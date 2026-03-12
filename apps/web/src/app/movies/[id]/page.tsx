'use client';

import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { useMovie, useStreamUrl, useFavorites, useAddFavorite, useRemoveFavorite, useMovieRatingStats, useUserRating, useRateMovie } from '@/lib/queries';
import { useState } from 'react';
import { Stars } from '@/components/stars';
import { VideoPlayer } from './VideoPlayer';
import { ShareModal } from '@/components/ShareModal';
import { ReviewsModal } from '@/components/ReviewsModal';
import styles from './movie.module.css';

export default function MovieDetailPage() {
    const params = useParams();
    const router = useRouter();
    const movieId = params.id as string;

    const { isAuthenticated } = useAuth();
    const { data: movie, isLoading } = useMovie(movieId);
    const { data: streamData } = useStreamUrl(movieId);
    const { data: favorites } = useFavorites();
    const addFavorite = useAddFavorite();
    const removeFavorite = useRemoveFavorite();
    const { data: ratingStats } = useMovieRatingStats(movieId);
    const { data: userRating } = useUserRating(movieId, isAuthenticated);
    const rateMovie = useRateMovie();
    const [showShare, setShowShare] = useState(false);
    const [showReviews, setShowReviews] = useState(false);

    const isFavorite = favorites?.some(f => f.movie.id === movieId);

    const toggleFavorite = () => {
        if (!isAuthenticated) {
            router.push('/login');
            return;
        }
        if (isFavorite) {
            removeFavorite.mutate(movieId);
        } else {
            addFavorite.mutate(movieId);
        }
    };

    if (isLoading) {
        return (
            <div className={styles.container}>
                <div className="loading-spinner"><div className="spinner" /></div>
            </div>
        );
    }

    if (!movie) {
        // If user is not authenticated, API may return 401 which results in no movie data
        // Suggest logging in first
        if (!isAuthenticated) {
            return (
                <div className={styles.container}>
                    <div className="empty-state">
                        <h3>Sign in to watch this movie</h3>
                        <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                            Please log in to access movie details and streaming.
                        </p>
                        <Link href="/login" className="btn btn-primary" style={{ marginTop: '1rem' }}>
                            Sign In
                        </Link>
                        <Link href="/" className="btn btn-secondary" style={{ marginTop: '0.5rem', marginLeft: '0.5rem' }}>
                            Back to Home
                        </Link>
                    </div>
                </div>
            );
        }

        return (
            <div className={styles.container}>
                <div className="empty-state">
                    <h3>Movie not found</h3>
                    <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                        The movie you&apos;re looking for doesn&apos;t exist or has been removed.
                    </p>
                    <Link href="/" className="btn btn-primary" style={{ marginTop: '1rem' }}>
                        Back to Home
                    </Link>
                </div>
            </div>
        );
    }

    const canPlay = movie.encodeStatus === 'ready' && streamData?.playbackUrl;

    const tmdbVoteAverage = typeof movie.voteAverage === 'number' && movie.voteAverage > 0
        ? movie.voteAverage
        : null;

    return (
        <div className={styles.container}>


            <main className={styles.content}>
                {/* Video Player */}
                <div className={styles.playerWrapper}>
                    {canPlay ? (
                        <VideoPlayer
                            src={streamData.playbackUrl}
                            movieId={movieId}
                            poster={movie.backdropUrl || movie.posterUrl || undefined}
                            qualityOptions={streamData?.qualityOptions}
                        />
                    ) : (
                        <div className={styles.playerPlaceholder}>
                            {movie.encodeStatus === 'processing' ? (
                                <>
                                    <div className="spinner" />
                                    <p>Video is being processed...</p>
                                </>
                            ) : movie.encodeStatus === 'failed' ? (
                                <p>❌ Video encoding failed</p>
                            ) : (
                                <p>🎬 Video not available yet</p>
                            )}
                        </div>
                    )}
                </div>

                {/* Movie Info */}
                <div className={styles.info}>
                    <div className={styles.header}>
                        <div>
                            <h1 className={styles.title}>{movie.title}</h1>
                            {/* Rating Section */}
                            <div style={{ marginTop: '1rem', display: 'flex', alignItems: 'center', gap: '2rem' }}>
                                {/* Average Rating */}
                                {ratingStats && ratingStats.avgRating !== null && (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <Stars rating={ratingStats.avgRating} readOnly size="medium" />
                                        <span style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
                                            ({ratingStats.ratingsCount} {ratingStats.ratingsCount === 1 ? 'rating' : 'ratings'})
                                        </span>
                                    </div>
                                )}
                                {/* User Rating */}
                                {isAuthenticated && (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                                        <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Your rating:</span>
                                        <Stars
                                            rating={userRating?.rating || 0}
                                            onRate={(rating) => rateMovie.mutate({ movieId, rating })}
                                            size="medium"
                                        />
                                    </div>
                                )}
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                            <button
                                onClick={() => setShowShare(true)}
                                className="btn btn-secondary"
                                style={{ padding: '0.5rem 1rem', fontSize: '0.875rem' }}
                            >
                                Share
                            </button>
                            <button
                                onClick={() => setShowReviews(true)}
                                className="btn btn-secondary"
                                style={{ padding: '0.5rem 1rem', fontSize: '0.875rem' }}
                            >
                                Reviews
                            </button>
                            <button
                                onClick={toggleFavorite}
                                className={`btn ${isFavorite ? 'btn-primary' : 'btn-secondary'}`}
                                style={{ padding: '0.5rem 1rem', fontSize: '0.875rem' }}
                            >
                                {isFavorite ? '❤️ Favorited' : '🤍 Add to Favorites'}
                            </button>
                        </div>
                    </div>

                    <div className={styles.meta}>
                        {movie.releaseYear && <span>{movie.releaseYear}</span>}
                        {movie.durationSeconds && (
                            <span>{Math.floor(movie.durationSeconds / 60)} min</span>
                        )}
                        {movie.originalLanguage && (
                            <span style={{ textTransform: 'uppercase' }}>{movie.originalLanguage}</span>
                        )}
                        {/* TMDb Rating Badge */}
                        {tmdbVoteAverage !== null && (
                            <span className={styles.tmdbRating} title={`${movie.voteCount?.toLocaleString() || 0} votes on TMDb`}>
                                ⭐ {tmdbVoteAverage.toFixed(1)}/10
                            </span>
                        )}
                        {/* Trailer Button */}
                        {movie.trailerUrl && (
                            <a
                                href={movie.trailerUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="btn btn-secondary"
                                style={{
                                    padding: '0.4rem 0.8rem',
                                    fontSize: '0.85rem',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '0.4rem'
                                }}
                            >
                                ▶️ Watch Trailer
                            </a>
                        )}
                    </div>

                    {movie.genres.length > 0 && (
                        <div className="genre-pills">
                            {movie.genres.map((genre) => (
                                <Link
                                    key={genre.id}
                                    href={`/genre/${genre.id}`}
                                    className="genre-pill"
                                    style={{ textDecoration: 'none' }}
                                >
                                    {genre.name}
                                </Link>
                            ))}
                        </div>
                    )}

                    {movie.description && (
                        <p className={styles.description}>{movie.description}</p>
                    )}
                </div>

                <Link href="/" className={styles.backLink}>
                    ← Back to Movies
                </Link>

                <ShareModal
                    movieId={movie.id}
                    movieTitle={movie.title}
                    posterUrl={movie.posterUrl || movie.backdropUrl}
                    isOpen={showShare}
                    onClose={() => setShowShare(false)}
                />
                <ReviewsModal
                    movieId={movie.id}
                    movieTitle={movie.title}
                    isOpen={showReviews}
                    onClose={() => setShowReviews(false)}
                />
            </main>
        </div>
    );
}
