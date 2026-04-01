'use client';

import { useState } from 'react';
import { useGenres, useCreateGenre, useUpdateGenre, useDeleteGenre, type Genre } from '@/lib/queries';

export default function GenresPage() {
    const { data: genres, isLoading, error } = useGenres();
    const createGenre = useCreateGenre();
    const updateGenre = useUpdateGenre();
    const deleteGenre = useDeleteGenre();

    const [newGenreName, setNewGenreName] = useState('');
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editingName, setEditingName] = useState('');
    const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newGenreName.trim()) return;

        try {
            await createGenre.mutateAsync({ name: newGenreName.trim() });
            setNewGenreName('');
        } catch (err) {
            console.error('Không thể tạo thể loại:', err);
        }
    };

    const handleUpdate = async (id: string) => {
        if (!editingName.trim()) return;

        try {
            await updateGenre.mutateAsync({ id, input: { name: editingName.trim() } });
            setEditingId(null);
            setEditingName('');
        } catch (err) {
            console.error('Không thể cập nhật thể loại:', err);
        }
    };

    const handleDelete = async (id: string) => {
        try {
            await deleteGenre.mutateAsync(id);
            setShowDeleteConfirm(null);
        } catch (err) {
            console.error('Không thể xóa thể loại:', err);
        }
    };

    const startEditing = (genre: Genre) => {
        setEditingId(genre.id);
        setEditingName(genre.name);
    };

    if (isLoading) {
        return (
            <div>
                <h1 style={{ marginBottom: '2rem' }}>Thể loại</h1>
                <div className="skeleton" style={{ height: 300 }} />
            </div>
        );
    }

    if (error) {
        return (
            <div>
                <h1 style={{ marginBottom: '2rem' }}>Thể loại</h1>
                <div style={{ color: 'var(--danger)' }}>Không thể tải danh sách thể loại</div>
            </div>
        );
    }

    return (
        <div>
            <h1 style={{ marginBottom: '2rem' }}>Thể loại</h1>

            {/* Add New Genre Form */}
            <form onSubmit={handleCreate} style={{
                display: 'flex',
                gap: '1rem',
                marginBottom: '2rem',
                background: 'var(--bg-card)',
                padding: '1.5rem',
                borderRadius: 8
            }}>
                <input
                    type="text"
                    value={newGenreName}
                    onChange={(e) => setNewGenreName(e.target.value)}
                    placeholder="Tên thể loại mới..."
                    className="input"
                    style={{ flex: 1 }}
                />
                <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={!newGenreName.trim() || createGenre.isPending}
                >
                    {createGenre.isPending ? 'Đang thêm...' : '+ Thêm thể loại'}
                </button>
            </form>

            {/* Genres List */}
            <div style={{
                background: 'var(--bg-card)',
                borderRadius: 8,
                overflow: 'hidden'
            }}>
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 100px 150px',
                    gap: '1rem',
                    padding: '1rem',
                    borderBottom: '1px solid var(--border)',
                    fontWeight: 600,
                    color: 'var(--text-secondary)',
                    fontSize: '0.875rem'
                }}>
                    <div>TÊN</div>
                    <div>SỐ PHIM</div>
                    <div>THAO TÁC</div>
                </div>

                {genres?.map((genre) => (
                    <div
                        key={genre.id}
                        style={{
                            display: 'grid',
                            gridTemplateColumns: '1fr 100px 150px',
                            gap: '1rem',
                            padding: '1rem',
                            borderBottom: '1px solid var(--border)',
                            alignItems: 'center'
                        }}
                    >
                        {editingId === genre.id ? (
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                <input
                                    type="text"
                                    value={editingName}
                                    onChange={(e) => setEditingName(e.target.value)}
                                    className="input"
                                    style={{ flex: 1 }}
                                    autoFocus
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') handleUpdate(genre.id);
                                        if (e.key === 'Escape') setEditingId(null);
                                    }}
                                />
                                <button
                                    onClick={() => handleUpdate(genre.id)}
                                    className="btn btn-primary"
                                    style={{ padding: '0.5rem 1rem' }}
                                    disabled={updateGenre.isPending}
                                >
                                    Lưu
                                </button>
                                <button
                                    onClick={() => setEditingId(null)}
                                    className="btn btn-secondary"
                                    style={{ padding: '0.5rem 1rem' }}
                                >
                                    Hủy
                                </button>
                            </div>
                        ) : (
                            <div>
                                <div style={{ fontWeight: 500 }}>{genre.name}</div>
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                    {genre.slug}
                                </div>
                            </div>
                        )}

                        <div style={{ color: 'var(--text-secondary)' }}>
                            {genre.movieCount || 0}
                        </div>

                        {editingId !== genre.id && (
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                <button
                                    onClick={() => startEditing(genre)}
                                    className="btn btn-secondary"
                                    style={{ padding: '0.5rem 0.75rem', fontSize: '0.875rem' }}
                                >
                                    Sửa
                                </button>
                                {showDeleteConfirm === genre.id ? (
                                    <>
                                        <button
                                            onClick={() => handleDelete(genre.id)}
                                            className="btn"
                                            style={{
                                                padding: '0.5rem 0.75rem',
                                                fontSize: '0.875rem',
                                                background: 'var(--danger)',
                                                color: 'white'
                                            }}
                                            disabled={deleteGenre.isPending}
                                        >
                                            Xác nhận
                                        </button>
                                        <button
                                            onClick={() => setShowDeleteConfirm(null)}
                                            className="btn btn-secondary"
                                            style={{ padding: '0.5rem 0.75rem', fontSize: '0.875rem' }}
                                        >
                                            Hủy
                                        </button>
                                    </>
                                ) : (
                                    <button
                                        onClick={() => setShowDeleteConfirm(genre.id)}
                                        className="btn"
                                        style={{
                                            padding: '0.5rem 0.75rem',
                                            fontSize: '0.875rem',
                                            background: 'transparent',
                                            color: 'var(--danger)',
                                            border: '1px solid var(--danger)'
                                        }}
                                    >
                                        Xóa
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                ))}

                {genres?.length === 0 && (
                    <div style={{
                        padding: '3rem',
                        textAlign: 'center',
                        color: 'var(--text-secondary)'
                    }}>
                        Chưa có thể loại nào. Hãy tạo một thể loại ở trên!
                    </div>
                )}
            </div>
        </div>
    );
}
