import Link from 'next/link';
import { FEATURE_FLAGS } from '@/lib/feature-flags';

export function Footer() {
    return (
        <footer style={{
            background: 'var(--bg-secondary)',
            padding: '3rem 0',
            marginTop: 'auto',
            borderTop: '1px solid var(--border)'
        }}>
            <div className="container">
                <div style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '2rem',
                    justifyContent: 'space-between',
                    marginBottom: '2rem'
                }}>
                    <div>
                        <Link href="/" className="navbar-brand" style={{ fontSize: '1.5rem', marginBottom: '1rem', display: 'block' }}>
                            netflat
                        </Link>
                        <p style={{ color: 'var(--text-secondary)', maxWidth: '300px' }}>
                            Nền tảng giải trí trực tuyến cao cấp của bạn. Xem mọi lúc, mọi nơi.
                        </p>
                    </div>

                    <div style={{ display: 'flex', gap: '3rem', flexWrap: 'wrap' }}>
                        <div>
                            <h4 style={{ marginBottom: '1rem', color: 'var(--text-primary)' }}>Liên kết</h4>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                <Link href="/" style={{ color: 'var(--text-secondary)', textDecoration: 'none' }}>Trang chủ</Link>
                                {FEATURE_FLAGS.search && (
                                    <Link href="/search" style={{ color: 'var(--text-secondary)', textDecoration: 'none' }}>Tìm kiếm</Link>
                                )}
                                <Link href="/favorites" style={{ color: 'var(--text-secondary)', textDecoration: 'none' }}>Danh sách của tôi</Link>
                            </div>
                        </div>

                        <div>
                            <h4 style={{ marginBottom: '1rem', color: 'var(--text-primary)' }}>Hỗ trợ</h4>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                <Link href="#" style={{ color: 'var(--text-secondary)', textDecoration: 'none' }}>Trung tâm trợ giúp</Link>
                                <Link href="/account" style={{ color: 'var(--text-secondary)', textDecoration: 'none' }}>Tài khoản</Link>
                                <Link href="#" style={{ color: 'var(--text-secondary)', textDecoration: 'none' }}>Trung tâm truyền thông</Link>
                                <Link href="/parental-controls" style={{ color: 'var(--text-secondary)', textDecoration: 'none' }}>Kiểm soát phụ huynh</Link>
                                <Link href="#" style={{ color: 'var(--text-secondary)', textDecoration: 'none' }}>Đổi thẻ quà tặng</Link>
                                <Link href="#" style={{ color: 'var(--text-secondary)', textDecoration: 'none' }}>Điều khoản sử dụng</Link>
                                <Link href="#" style={{ color: 'var(--text-secondary)', textDecoration: 'none' }}>Quyền riêng tư</Link>
                                <Link href="#" style={{ color: 'var(--text-secondary)', textDecoration: 'none' }}>Tùy chọn cookie</Link>
                            </div>
                        </div>
                    </div>
                </div>

                <div style={{
                    borderTop: '1px solid var(--border)',
                    paddingTop: '1.5rem',
                    textAlign: 'center',
                    color: 'var(--text-secondary)',
                    fontSize: '0.875rem'
                }}>
                    <p>&copy; {new Date().getFullYear()} Netflat. Bảo lưu mọi quyền.</p>
                </div>
            </div>
        </footer>
    );
}
