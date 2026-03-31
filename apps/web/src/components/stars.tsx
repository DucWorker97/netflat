'use client';

import { useState } from 'react';

interface StarsProps {
    rating?: number | null; // 0-5, can be decimal for average
    onRate?: (rating: number) => void;
    readOnly?: boolean;
    size?: 'small' | 'medium' | 'large';
}

export function Stars({ rating, onRate, readOnly = false, size = 'medium' }: StarsProps) {
    const [hoverRating, setHoverRating] = useState(0);
    const safeRating = typeof rating === 'number' && Number.isFinite(rating) ? rating : 0;

    const sizeMap = {
        small: '16px',
        medium: '24px',
        large: '32px',
    };

    const iconSize = sizeMap[size];

    const handleClick = (star: number) => {
        if (!readOnly && onRate) {
            onRate(star);
        }
    };

    const getStarType = (index: number): 'full' | 'half' | 'empty' => {
        const displayRating = hoverRating || safeRating;
        if (displayRating >= index) return 'full';
        if (displayRating >= index - 0.5) return 'half';
        return 'empty';
    };

    return (
        <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
            {[1, 2, 3, 4, 5].map((star) => {
                const starType = getStarType(star);
                return (
                    <span
                        key={star}
                        onClick={() => handleClick(star)}
                        onMouseEnter={() => !readOnly && setHoverRating(star)}
                        onMouseLeave={() => !readOnly && setHoverRating(0)}
                        style={{
                            fontSize: iconSize,
                            cursor: readOnly ? 'default' : 'pointer',
                            color: starType === 'full' ? '#f59e0b' : starType === 'half' ? '#f59e0b' : '#4b5563',
                            transition: 'color 0.1s',
                            userSelect: 'none',
                        }}
                        title={readOnly ? `${safeRating.toFixed(1)} stars` : `Rate ${star} star${star > 1 ? 's' : ''}`}
                    >
                        {starType === 'full' ? '★' : starType === 'half' ? '⯨' : '☆'}
                    </span>
                );
            })}
            {readOnly && safeRating > 0 && (
                <span style={{ marginLeft: '8px', fontSize: '14px', color: '#9ca3af' }}>
                    {safeRating.toFixed(1)}
                </span>
            )}
        </div>
    );
}
