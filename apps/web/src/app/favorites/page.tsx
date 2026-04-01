'use client';

import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { useFavorites, useRemoveFavorite, type Movie } from '@/lib/queries';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

import { MovieCard } from '@/components/movie-card';

export default function FavoritesPage() {
    const router = useRouter();
    const { isAuthenticated, isLoading: authLoading } = useAuth();
    const { data: favorites, isLoading } = useFavorites();
    const removeFavorite = useRemoveFavorite();

    useEffect(() => {
        if (!authLoading && !isAuthenticated) {
            router.push('/login');
        }
    }, [authLoading, isAuthenticated, router]);

    if (authLoading || !isAuthenticated) {
        return <div className="loading-spinner"><div className="spinner" /></div>;
    }

    return (
        <>
            <main className="container" style={{ paddingTop: '2rem', paddingBottom: '4rem' }}>
                <div className="section-header">
                    <h1 className="section-title">Phim yêu thích</h1>
                </div>

                {isLoading ? (
                    <div className="loading-spinner"><div className="spinner" /></div>
                ) : favorites?.length === 0 ? (
                    <div className="empty-state">
                        <h3>Bạn chưa có phim yêu thích</h3>
                        <p>Hãy duyệt phim và thêm vào danh sách yêu thích!</p>
                        <Link href="/" className="btn btn-primary" style={{ marginTop: '1rem' }}>
                            Duyệt phim
                        </Link>
                    </div>
                ) : (
                    <div className="movie-grid">
                        {favorites?.map((fav) => (
                            <MovieCard
                                key={fav.id}
                                movie={fav.movie}
                                onRemove={() => removeFavorite.mutate(fav.movie.id)}
                            />
                        ))}
                    </div>
                )}
            </main>
        </>
    );
}
