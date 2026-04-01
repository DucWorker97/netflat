'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useDeleteMovie } from '@/lib/queries';
import { useLocalePath } from '@/lib/use-locale-path';

interface SettingsTabProps {
    movie: any;
}

/* Icons */
const ShieldIcon = () => (
    <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
);
const ZapIcon = () => (
    <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
);
const CalendarIcon = () => (
    <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
);
const ClockIcon = () => (
    <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
);
const AlertIcon = () => (
    <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ color: 'var(--error)' }}><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
);
const TrashIcon = () => (
    <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
);

function getStatusColor(status: string): string {
    if (status === 'published' || status === 'ready') {
        return 'color: var(--neon-green); background: rgba(34,197,94,0.1); border-color: rgba(34,197,94,0.2);';
    }
    if (status === 'failed') {
        return 'color: var(--error); background: rgba(239,68,68,0.1); border-color: rgba(239,68,68,0.2);';
    }
    if (status === 'processing' || status === 'pending') {
        return 'color: var(--neon-cyan); background: rgba(6,182,212,0.1); border-color: rgba(6,182,212,0.2);';
    }
    return 'color: var(--text-primary); background: rgba(26,26,37,0.5); border-color: rgba(255,255,255,0.06);';
}

export default function SettingsTab({ movie }: SettingsTabProps) {
    const router = useRouter();
    const { localePath } = useLocalePath();
    const deleteMovie = useDeleteMovie();
    const [isDeleting, setIsDeleting] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);

    const handleDelete = async () => {
        try {
            setIsDeleting(true);
            await deleteMovie.mutateAsync(movie.id);
            router.push(localePath('/movies'));
        } catch (error) {
            console.error('Không thể xóa phim:', error);
            setIsDeleting(false);
        }
    };

    const infoItems = [
        { Icon: ShieldIcon, label: 'Trạng thái phát hành', value: movie.movieStatus === 'published' ? 'Đã xuất bản' : 'Bản nháp', style: getStatusColor(movie.movieStatus) },
        { Icon: ZapIcon, label: 'Trạng thái mã hóa', value: movie.encodeStatus === 'ready' ? 'Sẵn sàng' : movie.encodeStatus === 'processing' ? 'Đang xử lý' : movie.encodeStatus === 'failed' ? 'Thất bại' : 'Chờ xử lý', style: getStatusColor(movie.encodeStatus) },
        { Icon: CalendarIcon, label: 'Ngày tạo', value: movie.createdAt ? new Date(movie.createdAt).toLocaleDateString('vi-VN', { year: 'numeric', month: 'short', day: 'numeric' }) : '—', style: getStatusColor('') },
        { Icon: ClockIcon, label: 'Cập nhật lần cuối', value: movie.updatedAt ? new Date(movie.updatedAt).toLocaleDateString('vi-VN', { year: 'numeric', month: 'short', day: 'numeric' }) : '—', style: getStatusColor('') },
    ];

    return (
        <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {/* General Settings */}
            <div className="glass-card p-6" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <h3 className="section-title">Cài đặt chung</h3>
                <div className="grid-2">
                    {infoItems.map(item => (
                        <div key={item.label} className="status-chip" style={Object.fromEntries(item.style.split(';').filter(Boolean).map(s => { const [k, v] = s.split(':').map(x => x.trim()); return [k.replace(/-([a-z])/g, (_, c) => c.toUpperCase()), v]; }))}>
                            <item.Icon />
                            <div>
                                <p className="chip-label">{item.label}</p>
                                <p className="chip-value">{item.value}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Danger Zone */}
            <div className="glass-card danger-card p-6" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div className="flex items-center gap-2">
                    <AlertIcon />
                    <h3 className="danger-title">Khu vực nguy hiểm</h3>
                </div>
                <p className="text-sm text-muted">
                    Khi xóa phim này, bạn sẽ không thể hoàn tác. Toàn bộ tệp media, phụ đề và metadata sẽ bị xóa vĩnh viễn.
                </p>
                {!showConfirm ? (
                    <button
                        onClick={() => setShowConfirm(true)}
                        className="flex items-center gap-2"
                        style={{ padding: '10px 20px', borderRadius: '8px', border: '1px solid rgba(239,68,68,0.4)', color: 'var(--error)', background: 'transparent', fontSize: '0.875rem', fontWeight: 500, cursor: 'pointer', transition: 'all 0.2s', width: 'fit-content' }}
                        onMouseOver={e => (e.currentTarget.style.background = 'rgba(239,68,68,0.1)')}
                        onMouseOut={e => (e.currentTarget.style.background = 'transparent')}
                    >
                        <TrashIcon /> Xóa phim
                    </button>
                ) : (
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => setShowConfirm(false)}
                            disabled={isDeleting}
                            className="btn btn-ghost"
                            style={{ borderRadius: '8px' }}
                        >
                            Hủy
                        </button>
                        <button
                            onClick={handleDelete}
                            disabled={isDeleting}
                            className="flex items-center gap-2"
                            style={{ padding: '10px 20px', borderRadius: '8px', background: 'var(--error)', color: '#fff', border: 'none', fontSize: '0.875rem', fontWeight: 500, cursor: isDeleting ? 'not-allowed' : 'pointer', opacity: isDeleting ? 0.6 : 1, transition: 'all 0.2s' }}
                        >
                            {isDeleting ? (
                                <><span className="spinner spinner-sm" style={{ borderTopColor: '#fff' }}></span> Đang xóa...</>
                            ) : (
                                <><TrashIcon /> Xác nhận xóa vĩnh viễn</>
                            )}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
