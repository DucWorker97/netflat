interface ErrorStateProps {
    title?: string;
    message?: string;
    onRetry?: () => void;
    showRetry?: boolean;
}

export function ErrorState({
    title = 'Đã xảy ra lỗi',
    message = 'Có lỗi khi tải nội dung này.',
    onRetry,
    showRetry = true
}: ErrorStateProps) {
    return (
        <div style={{
            textAlign: 'center',
            padding: '4rem 2rem',
            color: 'var(--text-secondary)'
        }}>
            <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>⚠️</div>
            <h3 style={{
                fontSize: '1.5rem',
                marginBottom: '0.5rem',
                color: 'var(--text-primary)'
            }}>
                {title}
            </h3>
            <p style={{ marginBottom: '2rem' }}>{message}</p>
            {showRetry && onRetry && (
                <button
                    onClick={onRetry}
                    className="btn btn-primary"
                    style={{ padding: '0.75rem 2rem' }}
                >
                    🔄 Thử lại
                </button>
            )}
        </div>
    );
}

export function EmptyState({
    icon = '📭',
    title = 'Không có nội dung',
    message = 'Hiện chưa có dữ liệu.'
}: {
    icon?: string;
    title?: string;
    message?: string;
}) {
    return (
        <div style={{
            textAlign: 'center',
            padding: '4rem 2rem',
            color: 'var(--text-secondary)'
        }}>
            <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>{icon}</div>
            <h3 style={{
                fontSize: '1.5rem',
                marginBottom: '0.5rem',
                color: 'var(--text-primary)'
            }}>
                {title}
            </h3>
            <p>{message}</p>
        </div>
    );
}
