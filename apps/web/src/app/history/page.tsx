'use client';

import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { useWatchHistory, useRemoveHistory, type Movie } from '@/lib/queries';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { MovieCard } from '@/components/movie-card';

function formatDuration(seconds: number) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

export default function HistoryPage() {
    const router = useRouter();
    const { isAuthenticated, isLoading: authLoading } = useAuth();
    const [currentPage, setCurrentPage] = useState(1);
    const { data, isLoading } = useWatchHistory(currentPage, 20);
    const removeHistory = useRemoveHistory();

    useEffect(() => {
        if (!authLoading && !isAuthenticated) {
            router.push('/login');
        }
    }, [authLoading, isAuthenticated, router]);

    if (authLoading || !isAuthenticated) {
        return <div className="loading-spinner"><div className="spinner" /></div>;
    }

    const items = data?.data;
    const meta = data?.meta;

    return (
        <main className="container" style={{ paddingTop: '2rem', paddingBottom: '4rem' }}>
            <div className="section-header">
                <h1 className="section-title">Watch History</h1>
            </div>

            {isLoading ? (
                <div className="loading-spinner"><div className="spinner" /></div>
            ) : !items || items.length === 0 ? (
                <div className="empty-state">
                    <h3>No watch history</h3>
                    <p>Movies you watch will appear here.</p>
                    <Link href="/" className="btn btn-primary" style={{ marginTop: '1rem' }}>
                        Browse Movies
                    </Link>
                </div>
            ) : (
                <>
                    <div className="movie-grid">
                        {items.map((item) => {
                            const progress = item.durationSeconds > 0
                                ? Math.round((item.progressSeconds / item.durationSeconds) * 100)
                                : 0;

                            return (
                                <MovieCard
                                    key={item.id}
                                    movie={item.movie}
                                    progress={progress}
                                    onRemove={() => removeHistory.mutate(item.movieId)}
                                />
                            );
                        })}
                    </div>

                    {meta && meta.totalPages > 1 && (
                        <div style={{
                            display: 'flex',
                            justifyContent: 'center',
                            gap: '1rem',
                            marginTop: '2rem',
                        }}>
                            <button
                                className="btn btn-secondary"
                                disabled={currentPage === 1}
                                onClick={() => setCurrentPage(p => p - 1)}
                            >
                                Previous
                            </button>
                            <span style={{ alignSelf: 'center', color: 'var(--text-secondary)' }}>
                                Page {currentPage} of {meta.totalPages}
                            </span>
                            <button
                                className="btn btn-secondary"
                                disabled={currentPage >= meta.totalPages}
                                onClick={() => setCurrentPage(p => p + 1)}
                            >
                                Next
                            </button>
                        </div>
                    )}
                </>
            )}
        </main>
    );
}
