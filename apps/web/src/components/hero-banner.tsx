'use client';

import Link from 'next/link';
import { type Movie } from '@/lib/queries';

interface HeroBannerProps {
    movie?: Movie;
    isLoading?: boolean;
}

export function HeroBanner({ movie, isLoading }: HeroBannerProps) {
    if (isLoading) {
        return (
            <div style={{
                height: '70vh',
                minHeight: '400px',
                background: '#1a1a1a',
                color: 'var(--text-on-dark)',
                animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite'
            }} />
        );
    }

    if (!movie) return null;

    return (
        <div style={{
            position: 'relative',
            height: '70vh',
            minHeight: '400px',
            background: '#000',
            color: 'var(--text-on-dark)',
            overflow: 'hidden'
        }}>
            {/* Backdrop Image or Gradient Fallback */}
            <div style={{
                position: 'absolute',
                inset: 0,
                backgroundImage: movie.backdropUrl || movie.posterUrl
                    ? `url(${movie.backdropUrl || movie.posterUrl})`
                    : 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                opacity: movie.backdropUrl || movie.posterUrl ? 0.5 : 0.8
            }} />

            {/* Gradient Overlay */}
            <div style={{
                position: 'absolute',
                inset: 0,
                background: 'linear-gradient(to top, rgba(13,13,13,1) 0%, rgba(13,13,13,0.7) 50%, rgba(13,13,13,0.3) 100%)'
            }} />

            {/* Content */}
            <div style={{
                position: 'relative',
                height: '100%',
                maxWidth: 'var(--container-width)',
                margin: '0 auto',
                padding: '0 2rem',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'flex-end',
                paddingBottom: '4rem'
            }}>
                <h1 style={{
                    fontSize: 'clamp(2rem, 5vw, 4rem)',
                    fontWeight: 700,
                    marginBottom: '1rem',
                    textShadow: '2px 2px 8px rgba(0,0,0,0.8)'
                }}>
                    {movie.title}
                </h1>

                {movie.description && (
                    <p style={{
                        fontSize: 'clamp(1rem, 2vw, 1.25rem)',
                        maxWidth: '600px',
                        marginBottom: '2rem',
                        lineHeight: 1.6,
                        color: 'var(--text-on-dark-secondary)',
                        textShadow: '1px 1px 4px rgba(0,0,0,0.8)',
                        display: '-webkit-box',
                        WebkitLineClamp: 3,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden'
                    }}>
                        {movie.description}
                    </p>
                )}

                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    <Link
                        href={`/movies/${movie.id}`}
                        className="btn btn-primary"
                        style={{
                            padding: '0.75rem 2rem',
                            fontSize: '1.125rem',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.5rem'
                        }}
                    >
                        ▶ Xem ngay
                    </Link>
                    {movie.releaseYear && (
                        <span style={{
                            fontSize: '1rem',
                            color: 'var(--text-on-dark-secondary)'
                        }}>
                            {movie.releaseYear}
                        </span>
                    )}
                </div>
            </div>
        </div>
    );
}
