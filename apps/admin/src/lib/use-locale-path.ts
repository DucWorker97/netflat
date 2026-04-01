'use client';

import { usePathname } from 'next/navigation';
import { useCallback, useMemo } from 'react';

/**
 * Returns the current locale extracted from pathname and a helper to build locale-prefixed paths.
 */
export function useLocalePath() {
    const pathname = usePathname();

    const locale = useMemo(() => {
        const match = pathname.match(/^\/(vi)(\/|$)/);
        return match ? match[1] : 'vi';
    }, [pathname]);

    const localePath = useCallback(
        (path: string) => {
            // Already has locale prefix
            if (path.match(/^\/(vi)(\/|$)/)) return path;
            // Ensure path starts with /
            const cleanPath = path.startsWith('/') ? path : `/${path}`;
            return `/${locale}${cleanPath}`;
        },
        [locale]
    );

    return { locale, localePath };
}
