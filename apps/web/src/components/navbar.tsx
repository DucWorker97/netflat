'use client';

import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { usePathname } from 'next/navigation';
import { FEATURE_FLAGS } from '@/lib/feature-flags';

export function Navbar() {
    const { user, isAuthenticated, logout } = useAuth();


    const pathname = usePathname();

    const isActive = (path: string) => pathname === path;

    return (
        <nav className="navbar">
            <div className="navbar-content">
                <Link href="/" className="navbar-brand">netflat</Link>
                <div className="navbar-links">
                    <Link
                        href="/"
                        style={{ color: isActive('/') ? 'var(--text-primary)' : undefined }}
                    >
                        Home
                    </Link>
                    {FEATURE_FLAGS.search && (
                        <Link
                            href="/search"
                            style={{ color: isActive('/search') ? 'var(--text-primary)' : undefined }}
                        >
                            Search
                        </Link>
                    )}

                    <Link
                        href="/movies"
                        className="text-sm font-medium text-gray-300 transition-colors hover:text-white"
                    >
                        Movies
                    </Link>
                    {isAuthenticated && (
                        <Link
                            href="/favorites"
                            style={{ color: isActive('/favorites') ? 'var(--text-primary)' : undefined }}
                        >
                            Favorites
                        </Link>
                    )}
                    {isAuthenticated && (
                        <Link
                            href="/history"
                            style={{ color: isActive('/history') ? 'var(--text-primary)' : undefined }}
                        >
                            History
                        </Link>
                    )}
                </div>
                <div className="navbar-user">
                    {isAuthenticated ? (
                        <>
                            <Link
                                href="/profile"
                                style={{
                                    color: isActive('/profile') ? 'var(--text-primary)' : 'var(--text-secondary)',
                                    fontSize: '0.875rem',
                                }}
                            >
                                {user?.displayName || user?.email}
                            </Link>
                            <button onClick={logout} className="btn btn-secondary" style={{ padding: '0.5rem 1rem', fontSize: '0.875rem' }}>
                                Logout
                            </button>
                        </>
                    ) : (
                        <Link href="/login" className="btn btn-primary" style={{ padding: '0.5rem 1rem', fontSize: '0.875rem' }}>
                            Sign In
                        </Link>
                    )}
                </div>
            </div>
        </nav>
    );
}
