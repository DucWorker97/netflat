'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMovies, useGenres } from '@/lib/queries';
import styles from './SurpriseMe.module.css';

interface SurpriseMeProps {
    variant?: 'button' | 'card';
    genreId?: string;
}

export function SurpriseMe({ variant = 'button', genreId }: SurpriseMeProps) {
    const router = useRouter();
    const [isAnimating, setIsAnimating] = useState(false);
    const { data: movies } = useMovies({ limit: 50, genreId: genreId || undefined });

    const handleSurprise = () => {
        if (!movies?.data || movies.data.length === 0) return;

        setIsAnimating(true);

        // Shuffle animation
        setTimeout(() => {
            const randomIndex = Math.floor(Math.random() * movies.data.length);
            const randomMovie = movies.data[randomIndex];
            router.push(`/movies/${randomMovie.id}`);
        }, 800);
    };

    if (variant === 'card') {
        return (
            <button
                className={`${styles.card} ${isAnimating ? styles.animating : ''}`}
                onClick={handleSurprise}
                disabled={isAnimating || !movies?.data?.length}
            >
                <div className={styles.cardIcon}>
                    <span className={styles.dice}>🎲</span>
                </div>
                <div className={styles.cardContent}>
                    <h3>Gợi ý bất ngờ!</h3>
                    <p>Để chúng tôi chọn giúp bạn</p>
                </div>
                {isAnimating && <div className={styles.spinner} />}
            </button>
        );
    }

    return (
        <button
            className={`${styles.button} ${isAnimating ? styles.animating : ''}`}
            onClick={handleSurprise}
            disabled={isAnimating || !movies?.data?.length}
        >
            <span className={styles.icon}>🎲</span>
            {isAnimating ? 'Đang tìm...' : 'Gợi ý bất ngờ'}
        </button>
    );
}
