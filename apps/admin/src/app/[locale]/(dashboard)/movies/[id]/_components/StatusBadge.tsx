
interface StatusBadgeProps {
    status: string;
    type: 'publish' | 'encode';
}

function getBadgeStyle(status: string, type: 'publish' | 'encode'): { className: string; label: string; style: React.CSSProperties } {
    if (type === 'publish') {
        if (status === 'published') {
            return {
                className: 'badge badge-neon-green',
                label: 'Đã xuất bản',
                style: {},
            };
        }
        return {
            className: 'badge badge-neon-cyan',
            label: 'Bản nháp',
            style: {},
        };
    }

    // encode type
    switch (status) {
        case 'ready':
            return { className: 'badge badge-neon-green glow-green', label: 'Sẵn sàng', style: {} };
        case 'processing':
        case 'pending':
            return { className: 'badge badge-neon-cyan', label: status === 'processing' ? 'Đang xử lý' : 'Chờ xử lý', style: {} };
        case 'failed':
            return { className: 'badge', label: 'Thất bại', style: { background: 'rgba(239,68,68,0.15)', color: 'var(--error)', border: '1px solid rgba(239,68,68,0.3)' } };
        default:
            return { className: 'badge badge-outline-mono', label: 'Chưa có', style: {} };
    }
}

export default function StatusBadge({ status, type }: StatusBadgeProps) {
    const { className, label, style } = getBadgeStyle(status, type);

    return (
        <span className={className} style={{ fontSize: '0.6875rem', textTransform: 'uppercase', letterSpacing: '0.03em', ...style }}>
            {type === 'encode' && (status === 'processing' || status === 'pending') && (
                <span className="spinner spinner-sm" style={{ width: 10, height: 10, marginRight: 4, borderTopColor: 'var(--neon-cyan)' }}></span>
            )}
            {label}
        </span>
    );
}
