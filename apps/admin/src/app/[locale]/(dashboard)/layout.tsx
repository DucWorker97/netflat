'use client';

import { useEffect, useMemo } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import styles from './dashboard.module.css';

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const { user, isLoading, isAuthenticated, logout } = useAuth();
    const router = useRouter();
    const pathname = usePathname();

    // Extract locale from pathname (e.g., /vi/movies -> vi)
    const locale = useMemo(() => {
        const match = pathname.match(/^\/(vi|en)(\/|$)/);
        return match ? match[1] : 'vi';
    }, [pathname]);

    // Strip locale prefix for active state comparison
    const pathWithoutLocale = useMemo(() => {
        return pathname.replace(/^\/(vi|en)/, '') || '/';
    }, [pathname]);

    useEffect(() => {
        if (!isLoading && !isAuthenticated) {
            router.push(`/${locale}/login`);
        }
    }, [isLoading, isAuthenticated, router, locale]);

    if (isLoading) {
        return (
            <div className={styles.loadingContainer}>
                <div className={styles.spinner} />
            </div>
        );
    }

    if (!isAuthenticated) {
        return null;
    }

    return (
        <div className={styles.layout}>
            {/* Sidebar */}
            <aside className={styles.sidebar}>
                <div className={styles.logo}>
                    <span className={styles.logoText}>netflat</span>
                    <span className={styles.logoSubtext}>Admin</span>
                </div>

                <nav className={styles.nav}>
                    <Link
                        href={`/${locale}`}
                        className={`${styles.navItem} ${pathWithoutLocale === '/' ? styles.navItemActive : ''}`}
                    >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z" />
                        </svg>
                        Dashboard
                    </Link>
                    <Link
                        href={`/${locale}/movies`}
                        className={`${styles.navItem} ${pathWithoutLocale.startsWith('/movies') ? styles.navItemActive : ''}`}
                    >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M18 4l2 4h-3l-2-4h-2l2 4h-3l-2-4H8l2 4H7L5 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V4h-4z" />
                        </svg>
                        Movies
                    </Link>
                    <Link
                        href={`/${locale}/genres`}
                        className={`${styles.navItem} ${pathWithoutLocale.startsWith('/genres') ? styles.navItemActive : ''}`}
                    >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M21.41 11.58l-9-9C12.05 2.22 11.55 2 11 2H4c-1.1 0-2 .9-2 2v7c0 .55.22 1.05.59 1.42l9 9c.36.36.86.58 1.41.58.55 0 1.05-.22 1.41-.59l7-7c.37-.36.59-.86.59-1.41 0-.55-.23-1.06-.59-1.42zM5.5 7C4.67 7 4 6.33 4 5.5S4.67 4 5.5 4 7 4.67 7 5.5 6.33 7 5.5 7z" />
                        </svg>
                        Genres
                    </Link>
                    <Link
                        href={`/${locale}/users`}
                        className={`${styles.navItem} ${pathWithoutLocale.startsWith('/users') ? styles.navItemActive : ''}`}
                    >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z" />
                        </svg>
                        Users
                    </Link>

                </nav>

                <div className={styles.sidebarFooter}>
                    <div className={styles.userInfo}>
                        <span className={styles.userEmail}>{user?.email}</span>
                        <span className={styles.userRole}>{user?.role}</span>
                    </div>
                    <button onClick={logout} className={styles.logoutBtn}>
                        Logout
                    </button>
                </div>
            </aside>

            {/* Main content */}
            <main className={styles.main}>
                {children}
            </main>
        </div>
    );
}
