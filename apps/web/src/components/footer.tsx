import Link from 'next/link';
import { FEATURE_FLAGS } from '@/lib/feature-flags';

export function Footer() {
    return (
        <footer style={{
            background: 'var(--background-secondary)',
            padding: '3rem 0',
            marginTop: 'auto',
            borderTop: '1px solid rgba(255,255,255,0.1)'
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
                            Your premium destination for streaming entertainment. Watch anywhere, cancel anytime.
                        </p>
                    </div>

                    <div style={{ display: 'flex', gap: '3rem', flexWrap: 'wrap' }}>
                        <div>
                            <h4 style={{ marginBottom: '1rem', color: 'var(--text-primary)' }}>Links</h4>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                <Link href="/" style={{ color: 'var(--text-secondary)', textDecoration: 'none' }}>Home</Link>
                                {FEATURE_FLAGS.search && (
                                    <Link href="/search" style={{ color: 'var(--text-secondary)', textDecoration: 'none' }}>Search</Link>
                                )}
                                <Link href="/favorites" style={{ color: 'var(--text-secondary)', textDecoration: 'none' }}>My List</Link>
                            </div>
                        </div>

                        <div>
                            <h4 style={{ marginBottom: '1rem', color: 'var(--text-primary)' }}>Support</h4>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                <Link href="#" style={{ color: 'var(--text-secondary)', textDecoration: 'none' }}>Help Center</Link>
                                <Link href="/account" style={{ color: 'var(--text-secondary)', textDecoration: 'none' }}>Account</Link>
                                <Link href="#" style={{ color: 'var(--text-secondary)', textDecoration: 'none' }}>Media Center</Link>
                                <Link href="/parental-controls" style={{ color: 'var(--text-secondary)', textDecoration: 'none' }}>Parental Controls</Link>
                                <Link href="#" style={{ color: 'var(--text-secondary)', textDecoration: 'none' }}>Redeem Gift Cards</Link>
                                <Link href="#" style={{ color: 'var(--text-secondary)', textDecoration: 'none' }}>Terms of Use</Link>
                                <Link href="#" style={{ color: 'var(--text-secondary)', textDecoration: 'none' }}>Privacy</Link>
                                <Link href="#" style={{ color: 'var(--text-secondary)', textDecoration: 'none' }}>Cookie Preferences</Link>
                            </div>
                        </div>
                    </div>
                </div>

                <div style={{
                    borderTop: '1px solid rgba(255,255,255,0.05)',
                    paddingTop: '1.5rem',
                    textAlign: 'center',
                    color: 'var(--text-secondary)',
                    fontSize: '0.875rem'
                }}>
                    <p>&copy; {new Date().getFullYear()} Netflat. All rights reserved.</p>
                </div>
            </div>
        </footer>
    );
}
