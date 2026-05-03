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
                        <h3>Đăng nhập để xem phim này</h3>
                        <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                            Vui lòng đăng nhập để xem chi tiết và phát phim.
                        </p>
                        <Link href="/login" className="btn btn-primary" style={{ marginTop: '1rem' }}>
                            Đăng nhập
                        </Link>
                        <Link href="/" className="btn btn-secondary" style={{ marginTop: '0.5rem', marginLeft: '0.5rem' }}>
                            Về trang chủ
                        </Link>
                    </div>
                </div>
            );
        }

        return (
            <div className={styles.container}>
                <div className="empty-state">
                    <h3>Không tìm thấy phim</h3>
                    <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                        Phim bạn đang tìm không tồn tại hoặc đã bị gỡ.
                    </p>
                    <Link href="/" className="btn btn-primary" style={{ marginTop: '1rem' }}>
                        Về trang chủ
                    </Link>
                </div>
            </div>
        );
    }

    const canPlay = movie.encodeStatus === 'ready' && streamData?.playbackUrl;

    const tmdbVoteAverage = typeof movie.voteAverage === 'number' && movie.voteAverage > 0
        ? movie.voteAverage
        : null;
    const averageRating = typeof ratingStats?.avgRating === 'number' && Number.isFinite(ratingStats.avgRating)
        ? ratingStats.avgRating
        : null;
    const ratingsCount = ratingStats?.ratingsCount ?? 0;

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
                                    <p>Video đang được xử lý...</p>
                                </>
                            ) : movie.encodeStatus === 'failed' ? (
                                <p>❌ Mã hóa video thất bại</p>
                            ) : (
                                <p>🎬 Video chưa sẵn sàng</p>
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
                                {averageRating !== null && (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <Stars rating={averageRating} readOnly size="medium" />
                                        <span style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
                                            ({ratingsCount} {ratingsCount === 1 ? 'đánh giá' : 'đánh giá'})
                                        </span>
                                    </div>
                                )}
                                {/* User Rating */}
                                {isAuthenticated && (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                                        <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Đánh giá của bạn:</span>
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
                                Chia sẻ
                            </button>
                            <button
                                onClick={toggleFavorite}
                                className={`btn ${isFavorite ? 'btn-primary' : 'btn-secondary'}`}
                                style={{ padding: '0.5rem 1rem', fontSize: '0.875rem' }}
                            >
                                {isFavorite ? '❤️ Đã yêu thích' : '🤍 Thêm vào yêu thích'}
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
                            <span className={styles.tmdbRating} title={`${movie.voteCount?.toLocaleString() || 0} lượt bình chọn trên TMDb`}>
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
                                ▶️ Xem trailer
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
                    ← Quay lại danh sách phim
                </Link>

                <ReviewsModal
                    movieId={movie.id}
                    movieTitle={movie.title}
                    variant="inline"
                />

                <ShareModal
                    movieId={movie.id}
                    movieTitle={movie.title}
                    posterUrl={movie.posterUrl || movie.backdropUrl}
                    isOpen={showShare}
                    onClose={() => setShowShare(false)}
                />
            </main>
        </div>
    );
}
