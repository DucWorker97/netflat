'use client';

import Link from 'next/link';
import { useMovies, useGenres } from '@/lib/queries';
import { normalizeMediaUrl } from '@/lib/media-url';
import { useLocalePath } from '@/lib/use-locale-path';

export default function DashboardPage() {
    const { localePath } = useLocalePath();
    const { data: moviesData, isLoading: moviesLoading } = useMovies({ limit: 100 });
    const { data: genres, isLoading: genresLoading } = useGenres();

    const movies = moviesData?.data || [];
    const stats = {
        total: movies.length,
        published: movies.filter(m => m.movieStatus === 'published').length,
        draft: movies.filter(m => m.movieStatus === 'draft').length,
        ready: movies.filter(m => m.encodeStatus === 'ready').length,
        pending: movies.filter(m => m.encodeStatus === 'pending').length,
        processing: movies.filter(m => m.encodeStatus === 'processing').length,
        failed: movies.filter(m => m.encodeStatus === 'failed').length,
    };

    const recentMovies = [...movies]
        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
        .slice(0, 5);

    if (moviesLoading || genresLoading) {
        return (
            <div>
                <h1 style={{ marginBottom: '2rem' }}>Bảng điều khiển</h1>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem' }}>
                    {[...Array(4)].map((_, i) => (
                        <div key={i} className="skeleton" style={{ height: 100, borderRadius: 8 }} />
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div>
            <h1 style={{ marginBottom: '2rem' }}>Bảng điều khiển</h1>

            {/* Stats Cards */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '1rem',
                marginBottom: '2rem'
            }}>
                <StatCard title="Tổng số phim" value={stats.total} icon="🎬" />
                <StatCard title="Đã xuất bản" value={stats.published} icon="✅" color="#22c55e" />
                <StatCard title="Bản nháp" value={stats.draft} icon="📝" color="#f59e0b" />
                <StatCard title="Tổng thể loại" value={genres?.length || 0} icon="🏷️" color="#8b5cf6" />
            </div>

            {/* Encode Status */}
            <div style={{ marginBottom: '2rem' }}>
                <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem' }}>Trạng thái mã hóa</h2>
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
                    gap: '1rem'
                }}>
                    <StatCard title="Sẵn sàng" value={stats.ready} icon="✅" color="#22c55e" small />
                    <StatCard title="Chờ xử lý" value={stats.pending} icon="⏳" color="#f59e0b" small />
                    <StatCard title="Đang xử lý" value={stats.processing} icon="⚙️" color="#3b82f6" small />
                    <StatCard title="Thất bại" value={stats.failed} icon="❌" color="#ef4444" small />
                </div>
            </div>

            {/* Quick Actions */}
            <div style={{ marginBottom: '2rem' }}>
                <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem' }}>Thao tác nhanh</h2>
                <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                    <Link href={localePath('/movies/new')} className="btn btn-primary">
                        + Tạo phim mới
                    </Link>
                    <Link href={localePath('/movies')} className="btn btn-secondary">
                        Quản lý phim
                    </Link>
                    <Link href={localePath('/genres')} className="btn btn-secondary">
                        Quản lý thể loại
                    </Link>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '2rem' }}>
                {/* Recent Movies */}
                <div>
                    <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem' }}>Cập nhật gần đây</h2>
                    <div style={{
                        background: 'var(--bg-card)',
                        borderRadius: 8,
                        overflow: 'hidden'
                    }}>
                        {recentMovies.map(movie => (
                        (() => {
                            const posterUrl = normalizeMediaUrl(movie.posterUrl);
                            return (
                            <Link
                                key={movie.id}
                                href={localePath(`/movies/${movie.id}`)}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '1rem',
                                    padding: '0.75rem 1rem',
                                    borderBottom: '1px solid var(--border)',
                                    textDecoration: 'none',
                                    color: 'inherit'
                                }}
                            >
                                <div style={{
                                    width: 40,
                                    height: 60,
                                    borderRadius: 4,
                                    background: posterUrl ? `url(${posterUrl}) center/cover` : 'var(--bg-secondary)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '1rem'
                                }}>
                                    {!posterUrl && '🎬'}
                                </div>
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontWeight: 500 }}>{movie.title}</div>
                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                                        {new Date(movie.updatedAt).toLocaleDateString()}
                                    </div>
                                </div>
                                <span className={`badge badge-${movie.encodeStatus}`}>
                                    {movie.encodeStatus}
                                </span>
                            </Link>
                            );
                        })()
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}

function StatCard({
    title,
    value,
    icon,
    color = '#fff',
    small = false
}: {
    title: string;
    value: number;
    icon: string;
    color?: string;
    small?: boolean;
}) {
    return (
        <div style={{
            background: 'var(--bg-card)',
            borderRadius: 8,
            padding: small ? '1rem' : '1.5rem',
            display: 'flex',
            alignItems: 'center',
            gap: '1rem'
        }}>
            <div style={{ fontSize: small ? '1.5rem' : '2rem' }}>{icon}</div>
            <div>
                <div style={{
                    fontSize: small ? '1.5rem' : '2rem',
                    fontWeight: 'bold',
                    color
                }}>
                    {value}
                </div>
                <div style={{
                    fontSize: small ? '0.75rem' : '0.875rem',
                    color: 'var(--text-secondary)'
                }}>
                    {title}
                </div>
            </div>
        </div>
    );
}
