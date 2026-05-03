'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useMovies, useDeleteMovie, usePublishMovie, type Movie } from '@/lib/queries';
import { useLocalePath } from '@/lib/use-locale-path';
import { normalizeMediaUrl } from '@/lib/media-url';
import styles from './movies.module.css';

function StatusBadge({ status }: { status: string }) {
    const isGreen = status === 'published' || status === 'ready';
    const isRed = status === 'failed';
    const isCyan = status === 'processing' || status === 'pending';

    const badgeStyle: React.CSSProperties = isGreen
        ? { background: 'rgba(34,197,94,0.15)', color: 'var(--neon-green)', border: '1px solid rgba(34,197,94,0.3)' }
        : isRed
        ? { background: 'rgba(239,68,68,0.15)', color: 'var(--error)', border: '1px solid rgba(239,68,68,0.3)' }
        : isCyan
        ? { background: 'rgba(6,182,212,0.15)', color: 'var(--neon-cyan)', border: '1px solid rgba(6,182,212,0.3)' }
        : { background: 'var(--bg-tertiary)', color: 'var(--text-secondary)', border: '1px solid rgba(255,255,255,0.06)' };

    return (
        <span className="badge" style={{ fontSize: '0.6875rem', textTransform: 'uppercase', letterSpacing: '0.03em', ...badgeStyle }}>
            {status === 'published'
                ? 'ĐÃ XUẤT BẢN'
                : status === 'draft'
                ? 'BẢN NHÁP'
                : status === 'ready'
                ? 'SẴN SÀNG'
                : status === 'processing'
                ? 'ĐANG XỬ LÝ'
                : status === 'pending'
                ? 'CHỜ XỬ LÝ'
                : status === 'failed'
                ? 'THẤT BẠI'
                : status}
        </span>
    );
}

function MovieRow({ movie, onDelete, onPublish }: {
    movie: Movie;
    onDelete: (id: string) => void;
    onPublish: (id: string, published: boolean) => void;
}) {
    const { localePath } = useLocalePath();
    const isPublished = movie.movieStatus === 'published';
    const normalizedPosterUrl = normalizeMediaUrl(movie.posterUrl);

    return (
        <tr>
            <td>
                <div className={styles.movieInfo}>
                    {normalizedPosterUrl ? (
                        <Image
                            src={normalizedPosterUrl}
                            alt=""
                            className={styles.poster}
                            width={44}
                            height={62}
                        />
                    ) : (
                        <div className={styles.posterPlaceholder}>
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M18 4l2 4h-3l-2-4h-2l2 4h-3l-2-4H8l2 4H7L5 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V4h-4z" />
                            </svg>
                        </div>
                    )}
                    <span className={styles.title}>{movie.title}</span>
                </div>
            </td>
            <td><StatusBadge status={movie.movieStatus} /></td>
            <td><StatusBadge status={movie.encodeStatus} /></td>
            <td className={styles.textMuted}>
                {new Date(movie.updatedAt).toLocaleDateString('vi-VN', { month: 'short', day: 'numeric', year: 'numeric' })}
            </td>
            <td>
                <div className={styles.actions}>
                    <Link href={localePath(`/movies/${movie.id}`)} className="btn btn-ghost" style={{ borderRadius: '8px' }}>
                        Sửa
                    </Link>

                    <button
                        onClick={() => onPublish(movie.id, !isPublished)}
                        className={`btn ${isPublished ? 'btn-secondary' : 'btn-success'}`}
                        style={{ borderRadius: '8px' }}
                        disabled={movie.encodeStatus !== 'ready'}
                        title={movie.encodeStatus !== 'ready' ? 'Mã hóa phải ở trạng thái sẵn sàng trước khi xuất bản' : ''}
                    >
                        {isPublished ? 'Gỡ xuất bản' : 'Xuất bản'}
                    </button>
                    <button
                        onClick={() => onDelete(movie.id)}
                        className="btn btn-danger"
                        style={{ borderRadius: '8px' }}
                    >
                        Xóa
                    </button>
                </div>
            </td>
        </tr>
    );
}

export default function MoviesPage() {
    const { localePath } = useLocalePath();
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState('');
    const [searchInput, setSearchInput] = useState('');

    const { data, isLoading, error } = useMovies({ page, limit: 20, q: search || undefined });
    const deleteMutation = useDeleteMovie();
    const publishMutation = usePublishMovie();

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        setSearch(searchInput);
        setPage(1);
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Bạn có chắc muốn xóa phim này không?')) return;
        try {
            await deleteMutation.mutateAsync(id);
        } catch (err) {
            alert(err instanceof Error ? err.message : 'Xóa phim thất bại');
        }
    };

    const handlePublish = async (id: string, published: boolean) => {
        try {
            await publishMutation.mutateAsync({ id, published });
        } catch (err) {
            alert(err instanceof Error ? err.message : 'Cập nhật trạng thái xuất bản thất bại');
        }
    };

    return (
        <div className="animate-fade-in">
            {/* Header */}
            <div className={styles.header}>
                <h1 className="gradient-text" style={{ fontSize: '1.75rem', fontWeight: 700 }}>Phim</h1>
                <Link href={localePath('/movies/new')} className="gradient-btn" style={{ padding: '10px 20px', borderRadius: '10px', fontWeight: 600, fontSize: '0.875rem', display: 'inline-flex', alignItems: 'center', gap: '6px', textDecoration: 'none', color: '#fff' }}>
                    <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                    Thêm phim mới
                </Link>
            </div>

            {/* Search */}
            <form onSubmit={handleSearch} className={styles.searchForm}>
                <input
                    type="text"
                    className="form-input"
                    placeholder="Tìm phim..."
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    style={{ maxWidth: 300 }}
                />
                <button type="submit" className="btn btn-secondary" style={{ borderRadius: '8px' }}>
                    Tìm
                </button>
                {search && (
                    <button
                        type="button"
                        className="btn btn-ghost"
                        style={{ borderRadius: '8px' }}
                        onClick={() => { setSearch(''); setSearchInput(''); }}
                    >
                        Xóa lọc
                    </button>
                )}
            </form>

            {/* Error */}
            {error && (
                <div className={styles.error}>
                    {error instanceof Error ? error.message : 'Không thể tải danh sách phim'}
                </div>
            )}

            {/* Loading */}
            {isLoading && (
                <div className={styles.loading}>
                    {[1, 2, 3, 4, 5].map((i) => (
                        <div key={i} className={`${styles.skeletonRow} skeleton`} />
                    ))}
                </div>
            )}

            {/* Table */}
            {!isLoading && data && (
                <>
                    {data.data.length === 0 ? (
                        <div className={styles.empty}>
                            <p>Không tìm thấy phim</p>
                            <Link href={localePath('/movies/new')} className="gradient-btn" style={{ padding: '10px 20px', borderRadius: '10px', fontWeight: 600, fontSize: '0.875rem', display: 'inline-flex', color: '#fff', textDecoration: 'none' }}>
                                Tạo phim đầu tiên
                            </Link>
                        </div>
                    ) : (
                        <div className="glass-card overflow-hidden">
                            <table className="table">
                                <thead>
                                    <tr>
                                        <th>Phim</th>
                                        <th>Trạng thái</th>
                                        <th>Mã hóa</th>
                                        <th>Cập nhật</th>
                                        <th>Thao tác</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {data.data.map((movie) => (
                                        <MovieRow
                                            key={movie.id}
                                            movie={movie}
                                            onDelete={handleDelete}
                                            onPublish={handlePublish}
                                        />
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {/* Pagination */}
                    {data.meta.totalPages > 1 && (
                        <div className={styles.pagination}>
                            <button
                                onClick={() => setPage(page - 1)}
                                disabled={!data.meta.hasPrev}
                                className="btn btn-secondary"
                                style={{ borderRadius: '8px' }}
                            >
                                Trước
                            </button>
                            <span className={styles.pageInfo}>
                                Trang {data.meta.page} / {data.meta.totalPages}
                            </span>
                            <button
                                onClick={() => setPage(page + 1)}
                                disabled={!data.meta.hasNext}
                                className="btn btn-secondary"
                                style={{ borderRadius: '8px' }}
                            >
                                Sau
                            </button>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
