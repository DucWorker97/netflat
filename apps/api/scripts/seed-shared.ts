import { UserRole } from '@prisma/client';

export type TestUserSeed = {
    email: string;
    password: string;
    role: UserRole;
};

export type LocalMovieSeed = {
    title: string;
    description: string;
    releaseYear: number;
    durationSeconds: number;
    playbackUrl: string;
    posterUrl: string;
    backdropUrl: string;
    originalLanguage: string;
    genres: string[];
    actors: string[];
};

export const TEST_USERS: TestUserSeed[] = [
    { email: 'admin@netflat.local', password: 'admin123', role: UserRole.admin },
    { email: 'moderator@netflat.local', password: 'moderator123', role: UserRole.admin },
    { email: 'qa.admin@netflat.local', password: 'qaadmin123', role: UserRole.admin },
    { email: 'viewer@netflat.local', password: 'viewer123', role: UserRole.viewer },
    { email: 'viewer1@netflat.local', password: 'viewer123', role: UserRole.viewer },
    { email: 'viewer2@netflat.local', password: 'viewer123', role: UserRole.viewer },
    { email: 'viewer3@netflat.local', password: 'viewer123', role: UserRole.viewer },
    { email: 'viewer4@netflat.local', password: 'viewer123', role: UserRole.viewer },
    { email: 'qa.viewer@netflat.local', password: 'qaviewer123', role: UserRole.viewer },
    { email: 'loadtest.viewer@netflat.local', password: 'viewer123', role: UserRole.viewer },
];

export const LOCAL_GENRES = [
    { name: 'Action', slug: 'action' },
    { name: 'Drama', slug: 'drama' },
    { name: 'Sci-Fi', slug: 'sci-fi' },
    { name: 'Thriller', slug: 'thriller' },
    { name: 'Comedy', slug: 'comedy' },
    { name: 'Adventure', slug: 'adventure' },
];

export const LOCAL_MOVIES: LocalMovieSeed[] = [
    {
        title: 'Midnight Circuit',
        description: 'A suspended engineer tracks a sabotage ring inside a smart-city transit grid before dawn.',
        releaseYear: 2024,
        durationSeconds: 6420,
        playbackUrl: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
        posterUrl: 'https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?auto=format&fit=crop&w=600&q=80',
        backdropUrl: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=1400&q=80',
        originalLanguage: 'en',
        genres: ['action', 'thriller'],
        actors: ['Maya Chen', 'Elias Ward', 'Nina Sol'],
    },
    {
        title: 'Harbor of Glass',
        description: 'A family returns to a storm-beaten coastal town and uncovers the truth behind a decades-old disappearance.',
        releaseYear: 2023,
        durationSeconds: 7080,
        playbackUrl: 'https://test-streams.mux.dev/test_001/stream.m3u8',
        posterUrl: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=600&q=80',
        backdropUrl: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1400&q=80',
        originalLanguage: 'en',
        genres: ['drama', 'thriller'],
        actors: ['Leah Morgan', 'Owen Price', 'Sara Vale'],
    },
    {
        title: 'Atlas Run',
        description: 'A courier crew races across orbital colonies carrying a map that could reset control of the outer system.',
        releaseYear: 2025,
        durationSeconds: 7560,
        playbackUrl: 'https://bitdash-a.akamaihd.net/content/sintel/hls/playlist.m3u8',
        posterUrl: 'https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?auto=format&fit=crop&w=600&q=80',
        backdropUrl: 'https://images.unsplash.com/photo-1462331940025-496dfbfc7564?auto=format&fit=crop&w=1400&q=80',
        originalLanguage: 'en',
        genres: ['sci-fi', 'adventure', 'action'],
        actors: ['Jon Mercer', 'Ivy Laurent', 'Theo Kane'],
    },
    {
        title: 'Second Take Cafe',
        description: 'A washed-up director and a stubborn barista turn a neighborhood cafe into an accidental studio lot.',
        releaseYear: 2022,
        durationSeconds: 5940,
        playbackUrl: 'https://cph-p2p-msl.akamaized.net/hls/live/2000341/test/master.m3u8',
        posterUrl: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=600&q=80',
        backdropUrl: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1400&q=80',
        originalLanguage: 'en',
        genres: ['comedy', 'drama'],
        actors: ['Emma Hart', 'Lucas Reed', 'Piper Sloan'],
    },
];
