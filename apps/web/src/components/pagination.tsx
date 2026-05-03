'use client';

interface PaginationProps {
    currentPage: number;
    totalPages: number;
    onPageChange: (page: number) => void;
}

export function Pagination({ currentPage, totalPages, onPageChange }: PaginationProps) {
    if (totalPages <= 1) return null;

    const getPageNumbers = () => {
        const pages: (number | string)[] = [];
        const showEllipsisStart = currentPage > 3;
        const showEllipsisEnd = currentPage < totalPages - 2;

        // Always show first page
        pages.push(1);

        if (showEllipsisStart) {
            pages.push('...');
        }

        // Pages around current
        for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) {
            if (!pages.includes(i)) {
                pages.push(i);
            }
        }

        if (showEllipsisEnd) {
            pages.push('...');
        }

        // Always show last page
        if (totalPages > 1 && !pages.includes(totalPages)) {
            pages.push(totalPages);
        }

        return pages;
    };

    return (
        <div className="pagination" style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            gap: '0.5rem',
            marginTop: '2rem',
            padding: '1rem 0'
        }}>
            <button
                onClick={() => onPageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="pagination-btn"
                style={{
                    padding: '0.5rem 1rem',
                    background: currentPage === 1 ? 'var(--bg-card)' : 'var(--bg-secondary)',
                    border: '1px solid var(--border)',
                    borderRadius: '4px',
                    color: currentPage === 1 ? 'var(--text-muted)' : 'var(--text-primary)',
                    cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                    transition: 'all 0.2s'
                }}
            >
                ← Trước
            </button>

            {getPageNumbers().map((page, index) => (
                typeof page === 'number' ? (
                    <button
                        key={index}
                        onClick={() => onPageChange(page)}
                        className="pagination-btn"
                        style={{
                            padding: '0.5rem 0.75rem',
                            background: page === currentPage ? 'var(--accent)' : 'var(--bg-secondary)',
                            border: page === currentPage ? '1px solid var(--accent)' : '1px solid var(--border)',
                            borderRadius: '4px',
                            color: page === currentPage ? 'white' : 'var(--text-primary)',
                            cursor: 'pointer',
                            fontWeight: page === currentPage ? 600 : 400,
                            minWidth: '40px',
                            transition: 'all 0.2s'
                        }}
                    >
                        {page}
                    </button>
                ) : (
                    <span key={index} style={{ color: 'var(--text-muted)', padding: '0 0.25rem' }}>
                        {page}
                    </span>
                )
            ))}

            <button
                onClick={() => onPageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="pagination-btn"
                style={{
                    padding: '0.5rem 1rem',
                    background: currentPage === totalPages ? 'var(--bg-card)' : 'var(--bg-secondary)',
                    border: '1px solid var(--border)',
                    borderRadius: '4px',
                    color: currentPage === totalPages ? 'var(--text-muted)' : 'var(--text-primary)',
                    cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                    transition: 'all 0.2s'
                }}
            >
                Tiếp →
            </button>
        </div>
    );
}
