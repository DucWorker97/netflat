const DEFAULT_S3_PUBLIC_BASE_URL = 'http://localhost:9002/netflat-media';

function trimTrailingSlash(value: string): string {
    return value.replace(/\/+$/, '');
}

function trimLeadingSlash(value: string): string {
    return value.replace(/^\/+/, '');
}

function getConfiguredPublicBaseUrl(): string {
    return trimTrailingSlash(
        process.env.NEXT_PUBLIC_S3_PUBLIC_BASE_URL || DEFAULT_S3_PUBLIC_BASE_URL
    );
}

export function normalizeMediaUrl(rawUrl: string | null | undefined): string | null {
    if (!rawUrl) return null;

    const value = rawUrl.trim();
    if (!value) return null;

    const targetBase = getConfiguredPublicBaseUrl();
    if (value === targetBase || value.startsWith(`${targetBase}/`)) {
        return value;
    }

    // Keep external CDN links (TMDB, Unsplash, etc.) untouched.
    if (/^https?:\/\//i.test(value) && !/\/netflat-media\//i.test(value)) {
        return value;
    }

    const marker = '/netflat-media/';
    const markerIndex = value.indexOf(marker);
    if (markerIndex >= 0) {
        const objectKey = trimLeadingSlash(value.slice(markerIndex + marker.length));
        return `${targetBase}/${objectKey}`;
    }

    if (value.startsWith('netflat-media/')) {
        const objectKey = trimLeadingSlash(value.slice('netflat-media/'.length));
        return `${targetBase}/${objectKey}`;
    }

    if (/^(posters|thumbnails|hls|originals)\//i.test(value)) {
        return `${targetBase}/${trimLeadingSlash(value)}`;
    }

    return value;
}
