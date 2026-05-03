'use client';

import Link from 'next/link';

interface FeatureDisabledProps {
    title?: string;
    message?: string;
}

export function FeatureDisabled({
    title = 'Tính năng đang tạm dừng',
    message = 'Màn hình này đang tạm dừng trong lúc chúng tôi tập trung vào các tính năng phát phim cốt lõi.',
}: FeatureDisabledProps) {
    return (
        <div style={{
            minHeight: '60vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '1rem',
            textAlign: 'center',
            padding: '2rem',
            color: 'var(--text-secondary)',
        }}>
            <h2 style={{ color: 'var(--text-primary)', fontSize: '1.75rem', margin: 0 }}>
                {title}
            </h2>
            <p style={{ maxWidth: 480, margin: 0 }}>
                {message}
            </p>
            <Link href="/" className="btn btn-primary" style={{ marginTop: '0.5rem' }}>
                Về trang chủ
            </Link>
        </div>
    );
}
