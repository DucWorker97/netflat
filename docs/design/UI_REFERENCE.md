# NETFLAT Admin â€” Movie Upload UI Reference

> **Má»¤C ÄĂCH**: File nĂ y tá»•ng há»£p toĂ n bá»™ code giao diá»‡n liĂªn quan Ä‘áº¿n quáº£n lĂ½/upload phim trong Admin app.  
> DĂ¹ng Ä‘á»ƒ cho AI (Lovable) redesign láº¡i giao diá»‡n.  
> **CHá»ˆ Sá»¬A GIAO DIá»†N**, khĂ´ng thay Ä‘á»•i logic upload (presigned URL, XHR upload, mutation hooks...).

---

## Tech Stack

- **Framework**: Next.js 15 (App Router, `'use client'`)
- **Styling**: Tailwind CSS + DaisyUI (dark theme) + CSS Modules
- **State/Data**: React Hook Form + Zod, TanStack Query (React Query)
- **i18n**: next-intl (locales: `vi`, `en`)
- **Select**: `react-select/creatable` (dark themed)

---

## Cáº¥u trĂºc file

```
apps/admin/src/
â”œâ”€â”€ lib/
â”‚   â”œâ”€â”€ queries.ts              â† API hooks (DO NOT CHANGE logic)
â”‚   â””â”€â”€ use-locale-path.ts      â† Locale routing helper
â””â”€â”€ app/[locale]/(dashboard)/movies/
    â”œâ”€â”€ page.tsx                 â† Movie List page
    â”œâ”€â”€ movies.module.css        â† CSS cho movie list
    â”œâ”€â”€ movie-form.module.css    â† CSS cho metadata form
    â”œâ”€â”€ media-center.module.css  â† CSS cho standalone media center
    â”œâ”€â”€ new/
    â”‚   â””â”€â”€ page.tsx             â† Create New Movie page
    â””â”€â”€ [id]/
        â”œâ”€â”€ page.tsx             â† Edit Movie page (3 tabs)
        â”œâ”€â”€ edit.module.css      â† CSS cho edit page
        â”œâ”€â”€ media/
        â”‚   â””â”€â”€ page.tsx         â† Standalone Media Center (trĂ¹ng láº·p vá»›i MediaTab)
        â”œâ”€â”€ upload/
        â”‚   â”œâ”€â”€ page.tsx         â† Redirect â†’ ?tab=media
        â”‚   â””â”€â”€ upload.module.css
        â””â”€â”€ _components/
            â”œâ”€â”€ MediaTab.tsx     â† Tab upload video/poster/subtitle
            â”œâ”€â”€ MetadataTab.tsx  â† Tab chá»‰nh sá»­a metadata
            â”œâ”€â”€ SettingsTab.tsx  â† Tab settings + delete
            â””â”€â”€ StatusBadge.tsx  â† Badge component
```

---

## Flow ngÆ°á»i dĂ¹ng

1. **Movie List** (`/movies`) â†’ Xem danh sĂ¡ch, tĂ¬m kiáº¿m, publish/unpublish/delete
2. **Create Movie** (`/movies/new`) â†’ Nháº­p title, description, year â†’ redirect sang edit page tab Media
3. **Edit Movie** (`/movies/[id]`) â†’ 3 tabs:
   - **Metadata**: title, description, year, duration, genres (toggle buttons), actors (creatable tags)
   - **Media & Assets**: upload video, poster, subtitle (presigned URL â†’ S3)
   - **Settings**: status info, danger zone delete
4. **Media Center** (`/movies/[id]/media`) â†’ Standalone media upload page (logic trĂ¹ng vá»›i MediaTab)

---

## API Hooks Interface (KHĂ”NG THAY Äá»”I)

```typescript
// Queries
useGenres() â†’ Genre[]
useMovies({ page, limit, q, genreId }) â†’ { data: Movie[], meta: PaginationMeta }
useMovie(id) â†’ Movie
useMoviePolling(id, enabled) â†’ Movie (refetch má»—i 3s khi encoding)

// Mutations
useCreateMovie() â†’ mutateAsync({ title, description, releaseYear, genreIds?, actors? })
useUpdateMovie() â†’ mutateAsync({ id, input: { title, description, ... } })
useDeleteMovie() â†’ mutateAsync(id)
usePublishMovie() â†’ mutateAsync({ id, published })
usePresignedUrl() â†’ mutateAsync({ movieId, fileName, contentType, sizeBytes, fileType })
useUploadComplete() â†’ mutateAsync({ movieId, objectKey, fileType })
useSubtitlePresignedUrl() â†’ mutateAsync({ movieId, fileName })
useSubtitleComplete() â†’ mutateAsync({ movieId, objectKey })

// Types
Movie { id, title, description, posterUrl, durationSeconds, releaseYear, movieStatus, encodeStatus, genres[], actors[], videoUrl, subtitles[], playbackUrl }
Genre { id, name, slug }
```

---

## 1. Movie List Page â€” `movies/page.tsx`

```tsx
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useMovies, useDeleteMovie, usePublishMovie, type Movie } from '@/lib/queries';
import { useLocalePath } from '@/lib/use-locale-path';
import styles from './movies.module.css';

function StatusBadge({ status }: { status: string }) {
    return (
        <span className={`badge badge-${status}`}>
            {status}
        </span>
    );
}

function MovieRow({ movie, onDelete, onPublish }: {
    movie: Movie;
    onDelete: (id: string) => void;
    onPublish: (id: string, published: boolean) => void;
}) {
    const { localePath } = useLocalePath();
    const isPublished = movie.movieStatus === 'published';

    return (
        <tr>
            <td>
                <div className={styles.movieInfo}>
                    {movie.posterUrl ? (
                        <img src={movie.posterUrl} alt="" className={styles.poster} />
                    ) : (
                        <div className={styles.posterPlaceholder}>
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M18 4l2 4h-3l-2-4h-2l2 4h-3l-2-4H8l2 4H7L5 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V4h-4z" />
                            </svg>
                        </div>
                    )}
                    <span className={styles.title}>{movie.title}</span>
                </div>
            </td>
            <td><StatusBadge status={movie.movieStatus} /></td>
            <td><StatusBadge status={movie.encodeStatus} /></td>
            <td className={styles.textMuted}>
                {new Date(movie.updatedAt).toLocaleDateString()}
            </td>
            <td>
                <div className={styles.actions}>
                    <Link href={localePath(`/movies/${movie.id}`)} className="btn btn-ghost">
                        Edit
                    </Link>
                    <button
                        onClick={() => onPublish(movie.id, !isPublished)}
                        className={`btn ${isPublished ? 'btn-secondary' : 'btn-success'}`}
                        disabled={movie.encodeStatus !== 'ready'}
                        title={movie.encodeStatus !== 'ready' ? 'Encode must be ready to publish' : ''}
                    >
                        {isPublished ? 'Unpublish' : 'Publish'}
                    </button>
                    <button
                        onClick={() => onDelete(movie.id)}
                        className="btn btn-danger"
                    >
                        Delete
                    </button>
                </div>
            </td>
        </tr>
    );
}

export default function MoviesPage() {
    const { localePath } = useLocalePath();
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState('');
    const [searchInput, setSearchInput] = useState('');

    const { data, isLoading, error } = useMovies({ page, limit: 20, q: search || undefined });
    const deleteMutation = useDeleteMovie();
    const publishMutation = usePublishMovie();

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        setSearch(searchInput);
        setPage(1);
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this movie?')) return;
        try {
            await deleteMutation.mutateAsync(id);
        } catch (err) {
            alert(err instanceof Error ? err.message : 'Delete failed');
        }
    };

    const handlePublish = async (id: string, published: boolean) => {
        try {
            await publishMutation.mutateAsync({ id, published });
        } catch (err) {
            alert(err instanceof Error ? err.message : 'Publish failed');
        }
    };

    return (
        <div>
            <div className={styles.header}>
                <h1 className={styles.pageTitle}>Movies</h1>
                <Link href={localePath('/movies/new')} className="btn btn-primary">
                    + New Movie
                </Link>
            </div>

            <form onSubmit={handleSearch} className={styles.searchForm}>
                <input
                    type="text"
                    className="input"
                    placeholder="Search movies..."
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    style={{ maxWidth: 300 }}
                />
                <button type="submit" className="btn btn-secondary">Search</button>
                {search && (
                    <button type="button" className="btn btn-ghost" onClick={() => { setSearch(''); setSearchInput(''); }}>
                        Clear
                    </button>
                )}
            </form>

            {error && (
                <div className={styles.error}>
                    {error instanceof Error ? error.message : 'Failed to load movies'}
                </div>
            )}

            {isLoading && (
                <div className={styles.loading}>
                    {[1, 2, 3, 4, 5].map((i) => (
                        <div key={i} className={`${styles.skeletonRow} skeleton`} />
                    ))}
                </div>
            )}

            {!isLoading && data && (
                <>
                    {data.data.length === 0 ? (
                        <div className={styles.empty}>
                            <p>No movies found</p>
                            <Link href={localePath('/movies/new')} className="btn btn-primary">
                                Create your first movie
                            </Link>
                        </div>
                    ) : (
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>Movie</th>
                                    <th>Status</th>
                                    <th>Encode</th>
                                    <th>Updated</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.data.map((movie) => (
                                    <MovieRow
                                        key={movie.id}
                                        movie={movie}
                                        onDelete={handleDelete}
                                        onPublish={handlePublish}
                                    />
                                ))}
                            </tbody>
                        </table>
                    )}

                    {data.meta.totalPages > 1 && (
                        <div className={styles.pagination}>
                            <button onClick={() => setPage(page - 1)} disabled={!data.meta.hasPrev} className="btn btn-secondary">Previous</button>
                            <span className={styles.pageInfo}>Page {data.meta.page} of {data.meta.totalPages}</span>
                            <button onClick={() => setPage(page + 1)} disabled={!data.meta.hasNext} className="btn btn-secondary">Next</button>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
```

---

## 2. Create New Movie â€” `movies/new/page.tsx`

```tsx
'use client';

import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useCreateMovie } from '@/lib/queries';
import { useLocalePath } from '@/lib/use-locale-path';

const schema = z.object({
    title: z.string().min(1, 'Title is required').max(500),
    description: z.string().max(2000).optional(),
    releaseYear: z.number().int().min(1900).max(2100).optional().nullable(),
});

type FormData = z.infer<typeof schema>;

export default function NewMoviePage() {
    const t = useTranslations('Movies');
    const tCommon = useTranslations('Common');
    const router = useRouter();
    const { localePath } = useLocalePath();
    const createMutation = useCreateMovie();

    const {
        register,
        handleSubmit,
        watch,
        formState: { errors, isSubmitting },
    } = useForm<FormData>({
        resolver: zodResolver(schema),
        defaultValues: {
            title: '',
            description: '',
            releaseYear: new Date().getFullYear(),
        },
    });

    const descriptionValue = watch('description') || '';

    const onSubmit = async (data: FormData) => {
        try {
            const movie = await createMutation.mutateAsync({
                title: data.title,
                description: data.description || undefined,
                releaseYear: data.releaseYear || undefined,
            });
            router.push(localePath(`/movies/${movie.id}?tab=media`));
        } catch (err: any) {
            const msg = err?.response?.data?.message || err.message || tCommon('error');
            alert(msg);
        }
    };

    return (
        <div className="container mx-auto px-4 py-8 max-w-2xl animate-fade-in">
            <div className="flex items-center gap-2 text-sm text-gray-400 mb-6">
                <button onClick={() => router.push(localePath('/movies'))} className="hover:text-white transition-colors">
                    Movies
                </button>
                <span className="text-gray-600">/</span>
                <span className="text-white">New</span>
            </div>

            <div className="bg-base-200 rounded-xl border border-white/5 overflow-hidden">
                <div className="px-6 py-5 border-b border-white/5">
                    <h1 className="text-xl font-semibold text-white">Create New Movie</h1>
                    <p className="text-sm text-gray-400 mt-1">Enter basic information. You can add genres, actors, and upload media on the next page.</p>
                </div>

                <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-5">
                    <div className="space-y-1.5">
                        <label className="text-sm font-medium text-gray-300" htmlFor="title">Title <span className="text-error">*</span></label>
                        <input
                            id="title"
                            type="text"
                            className={`input input-bordered w-full ${errors.title ? 'input-error' : ''}`}
                            placeholder="e.g. Inception"
                            autoFocus
                            {...register('title')}
                        />
                        {errors.title && <p className="text-error text-xs">{errors.title.message}</p>}
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-sm font-medium text-gray-300" htmlFor="description">Description</label>
                        <textarea
                            id="description"
                            className="textarea textarea-bordered w-full"
                            rows={3}
                            placeholder="Enter movie synopsis..."
                            {...register('description')}
                        />
                        <p className="text-xs text-gray-500 text-right">{descriptionValue.length}/2000</p>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-sm font-medium text-gray-300" htmlFor="releaseYear">Release Year</label>
                        <input
                            id="releaseYear"
                            type="number"
                            className="input input-bordered w-full max-w-[180px]"
                            placeholder="2024"
                            {...register('releaseYear', { valueAsNumber: true })}
                        />
                    </div>

                    <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/5">
                        <button type="button" className="btn btn-ghost btn-sm" onClick={() => router.push(localePath('/movies'))}>
                            Cancel
                        </button>
                        <button type="submit" className="btn btn-primary btn-sm px-6" disabled={isSubmitting}>
                            {isSubmitting ? (
                                <><span className="loading loading-spinner loading-xs"></span> Creating...</>
                            ) : (
                                'Create & Continue'
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
```

---

## 3. Edit Movie Page (3 tabs) â€” `movies/[id]/page.tsx`

```tsx
'use client';

import { useState, use } from 'react';
import { notFound } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { useMovie } from '@/lib/queries';
import Link from 'next/link';
import { useLocalePath } from '@/lib/use-locale-path';

import MetadataTab from './_components/MetadataTab';
import MediaTab from './_components/MediaTab';
import SettingsTab from './_components/SettingsTab';
import StatusBadge from './_components/StatusBadge';

interface EditMoviePageProps {
    params: Promise<{ id: string }>;
}

const tabIcons: Record<string, React.ReactNode> = {
    metadata: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>,
    media: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>,
    settings: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>,
};

const tabs = [
    { key: 'metadata' as const, label: 'Metadata' },
    { key: 'media' as const, label: 'Media & Assets' },
    { key: 'settings' as const, label: 'Settings' },
];

export default function EditMoviePage({ params }: EditMoviePageProps) {
    const { id } = use(params);
    const { localePath } = useLocalePath();
    const { data: movie, isLoading, error } = useMovie(id);
    const queryClient = useQueryClient();
    const [activeTab, setActiveTab] = useState<'metadata' | 'media' | 'settings'>('metadata');

    if (isLoading) {
        return (
            <div className="flex justify-center items-center min-h-[50vh]">
                <span className="loading loading-spinner loading-lg text-primary"></span>
            </div>
        );
    }

    if (error || !movie) return notFound();

    return (
        <div className="container mx-auto px-4 py-6 max-w-7xl animate-fade-in">
            <div className="mb-6">
                <div className="flex items-center gap-2 text-sm text-gray-400 mb-2">
                    <Link href={localePath('/movies')} className="hover:text-white transition-colors">Movies</Link>
                    <span className="text-gray-600">/</span>
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                        <h1 className="text-2xl font-bold text-white tracking-tight">{movie.title}</h1>
                        <div className="flex items-center gap-2 mt-1.5">
                            <StatusBadge status={movie.movieStatus} type="publish" />
                            <StatusBadge status={movie.encodeStatus} type="encode" />
                            <span className="text-xs text-gray-600 font-mono ml-1">ID: {movie.id}</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="border-b border-white/5 mb-6">
                <div className="flex gap-0 -mb-px">
                    {tabs.map((tab) => (
                        <button
                            key={tab.key}
                            onClick={() => setActiveTab(tab.key)}
                            className={`px-5 py-3 text-sm font-medium border-b-2 transition-colors ${
                                activeTab === tab.key
                                    ? 'border-primary text-primary'
                                    : 'border-transparent text-gray-400 hover:text-white hover:border-white/20'
                            }`}
                        >
                            <span className="mr-1.5 inline-flex">{tabIcons[tab.key]}</span>
                            {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            <div>
                {activeTab === 'metadata' && <MetadataTab movie={movie} />}
                {activeTab === 'media' && <MediaTab movie={movie} />}
                {activeTab === 'settings' && <SettingsTab movie={movie} />}
            </div>
        </div>
    );
}
```

---

## 4. MediaTab Component â€” `_components/MediaTab.tsx`

```tsx
'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
    usePresignedUrl,
    useUploadComplete,
    useMoviePolling,
    useSubtitlePresignedUrl,
    useSubtitleComplete
} from '@/lib/queries';

interface MediaTabProps {
    movie: any;
}

export default function MediaTab({ movie }: MediaTabProps) {
    const queryClient = useQueryClient();
    const movieId = movie.id;

    useMoviePolling(movieId, movie?.encodeStatus === 'processing' || movie?.encodeStatus === 'pending');

    // -- Video Upload State --
    const [videoFile, setVideoFile] = useState<File | null>(null);
    const [videoProgress, setVideoProgress] = useState(0);
    const [videoStatus, setVideoStatus] = useState<'idle' | 'uploading' | 'processing' | 'ready' | 'failed'>('idle');
    const [videoError, setVideoError] = useState<string | null>(null);
    const videoInputRef = useRef<HTMLInputElement>(null);

    // -- Poster Upload State --
    const [posterFile, setPosterFile] = useState<File | null>(null);
    const [posterPreviewUrl, setPosterPreviewUrl] = useState<string | null>(null);
    const [posterProgress, setPosterProgress] = useState(0);
    const [posterStatus, setPosterStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
    const posterInputRef = useRef<HTMLInputElement>(null);

    // -- Subtitle Upload State --
    const [subtitleFile, setSubtitleFile] = useState<File | null>(null);
    const [subtitleProgress, setSubtitleProgress] = useState(0);
    const [subtitleStatus, setSubtitleStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
    const subtitleInputRef = useRef<HTMLInputElement>(null);

    // Mutations
    const getPresignedUrl = usePresignedUrl();
    const uploadComplete = useUploadComplete();
    const getSubtitlePresigned = useSubtitlePresignedUrl();
    const subtitleComplete = useSubtitleComplete();

    const [showToast, setShowToast] = useState(false);

    useEffect(() => {
        return () => {
            if (posterPreviewUrl && posterPreviewUrl.startsWith('blob:')) {
                URL.revokeObjectURL(posterPreviewUrl);
            }
        };
    }, [posterPreviewUrl]);

    useEffect(() => {
        if (movie?.encodeStatus) {
            if (videoStatus !== 'uploading') {
                const newStatus = movie.encodeStatus as any;
                if (newStatus === 'ready' && videoStatus !== 'ready') {
                    setShowToast(true);
                    setTimeout(() => setShowToast(false), 10000);
                }
                setVideoStatus(newStatus);
            }
        }
    }, [movie?.encodeStatus, videoStatus]);

    useEffect(() => {
        const isUploading = videoStatus === 'uploading' || posterStatus === 'uploading' || subtitleStatus === 'uploading';
        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            if (isUploading) { e.preventDefault(); e.returnValue = ''; }
        };
        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [videoStatus, posterStatus, subtitleStatus]);

    // -- Handlers (KHĂ”NG THAY Äá»”I LOGIC) --
    const handleVideoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files?.[0]) { setVideoFile(e.target.files[0]); setVideoStatus('idle'); setVideoError(null); }
    };

    const handlePosterSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (posterPreviewUrl && posterPreviewUrl.startsWith('blob:')) URL.revokeObjectURL(posterPreviewUrl);
            setPosterFile(file);
            setPosterPreviewUrl(URL.createObjectURL(file));
            setPosterStatus('idle');
        }
        e.target.value = '';
    };

    const handlePosterRemove = () => {
        if (posterPreviewUrl && posterPreviewUrl.startsWith('blob:')) URL.revokeObjectURL(posterPreviewUrl);
        setPosterFile(null); setPosterPreviewUrl(null); setPosterStatus('idle');
    };

    const handleSubtitleSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files?.[0]) { setSubtitleFile(e.target.files[0]); setSubtitleStatus('idle'); }
        e.target.value = '';
    };

    const startPosterUpload = async () => {
        if (!posterFile) return;
        try {
            setPosterStatus('uploading'); setPosterProgress(0);
            const presigned = await getPresignedUrl.mutateAsync({ movieId, fileName: posterFile.name, contentType: posterFile.type, sizeBytes: posterFile.size, fileType: 'thumbnail' });
            await performUpload(posterFile, presigned.uploadUrl, setPosterProgress);
            await uploadComplete.mutateAsync({ movieId, objectKey: presigned.objectKey, fileType: 'thumbnail' });
            setPosterStatus('success'); setPosterFile(null); setPosterPreviewUrl(null);
            queryClient.invalidateQueries({ queryKey: ['movie', movieId] });
        } catch (err) { console.error(err); setPosterStatus('error'); }
    };

    const startSubtitleUpload = async () => {
        if (!subtitleFile) return;
        try {
            setSubtitleStatus('uploading'); setSubtitleProgress(0);
            const presigned = await getSubtitlePresigned.mutateAsync({ movieId, fileName: subtitleFile.name });
            await performUpload(subtitleFile, presigned.uploadUrl, setSubtitleProgress);
            await subtitleComplete.mutateAsync({ movieId, objectKey: presigned.objectKey });
            setSubtitleStatus('success'); setSubtitleFile(null);
            queryClient.invalidateQueries({ queryKey: ['movie', movieId] });
        } catch (err) { console.error(err); setSubtitleStatus('error'); }
    };

    const startVideoUpload = async () => {
        if (!videoFile) return;
        try {
            setVideoStatus('uploading'); setVideoProgress(0);
            const presigned = await getPresignedUrl.mutateAsync({ movieId, fileName: videoFile.name, contentType: videoFile.type, sizeBytes: videoFile.size, fileType: 'video' });
            await performUpload(videoFile, presigned.uploadUrl, setVideoProgress);
            await uploadComplete.mutateAsync({ movieId, objectKey: presigned.objectKey, fileType: 'video' });
            setVideoStatus('processing');
            queryClient.invalidateQueries({ queryKey: ['movie', movieId] });
        } catch (err) { console.error(err); setVideoStatus('failed'); setVideoError('Upload failed. Please try again.'); }
    };

    const performUpload = async (file: File, url: string, onProgress: (p: number) => void) => {
        const xhr = new XMLHttpRequest();
        xhr.open('PUT', url); xhr.setRequestHeader('Content-Type', file.type);
        xhr.upload.onprogress = (e) => { if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100)); };
        await new Promise<void>((resolve, reject) => {
            xhr.onload = () => { if (xhr.status >= 200 && xhr.status < 300) resolve(); else reject(new Error('Upload failed')); };
            xhr.onerror = () => reject(new Error('Network error'));
            xhr.send(file);
        });
    };

    const formatBytes = (bytes: number) => {
        if (bytes === 0) return '0 B';
        const k = 1024; const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    };

    const displayPosterUrl = posterPreviewUrl || movie.posterUrl || null;

    // ===== PHáº¦N GIAO DIá»†N BĂN DÆ¯á»I â€” Cáº¦N REDESIGN =====
    return (
        <div className="w-full max-w-none space-y-6 animate-fade-in">
            {showToast && (
                <div className="toast toast-end toast-bottom z-50">
                    <div className="alert alert-success shadow-lg">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                        <div>
                            <h3 className="font-bold text-sm">Encoding Complete!</h3>
                            <div className="text-xs">Video is ready for playback.</div>
                        </div>
                    </div>
                </div>
            )}

            {/* VIDEO SOURCE */}
            <div className="bg-base-200 rounded-xl border border-white/5 overflow-hidden">
                <div className="flex items-center justify-between px-5 py-3 border-b border-white/5">
                    <div className="flex items-center gap-2.5">
                        <svg className="w-4 h-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                        <h2 className="font-semibold text-sm">Video Source</h2>
                    </div>
                    <span className={`badge badge-xs ${
                        videoStatus === 'ready' ? 'badge-success' :
                        videoStatus === 'processing' ? 'badge-warning' :
                        videoStatus === 'failed' ? 'badge-error' : 'badge-ghost'
                    }`}>{videoStatus.toUpperCase()}</span>
                </div>

                <div className="p-5">
                    {/* Stepper */}
                    <div className="flex items-center gap-1.5 mb-5 text-xs">
                        {['Upload', 'Processing', 'Ready'].map((step, i) => {
                            const stepStates = [
                                ['uploading', 'processing', 'ready'].includes(videoStatus) || !!videoFile,
                                ['processing', 'ready'].includes(videoStatus),
                                videoStatus === 'ready',
                            ];
                            const active = stepStates[i];
                            return (
                                <div key={step} className="flex items-center gap-1.5 flex-1">
                                    <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${active ? 'bg-primary text-white' : 'bg-base-300 text-gray-500'}`}>
                                        {active ? 'âœ“' : i + 1}
                                    </div>
                                    <span className={`text-xs ${active ? 'text-white' : 'text-gray-500'}`}>{step}</span>
                                    {i < 2 && <div className={`flex-1 h-px ${active ? 'bg-primary' : 'bg-base-300'}`} />}
                                </div>
                            );
                        })}
                    </div>

                    {/* Video Content States */}
                    {videoStatus === 'ready' && (movie.playbackUrl || movie.videoUrl) ? (
                        <div className="flex items-center gap-3 p-3 bg-base-100 rounded-lg border border-white/5">
                            <div className="w-10 h-10 bg-success/10 rounded-lg flex items-center justify-center shrink-0">
                                <svg className="w-5 h-5 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-white">Video encoded & ready</p>
                                <p className="text-xs text-gray-500 font-mono truncate mt-0.5">{movie.playbackUrl}</p>
                            </div>
                            <div className="flex gap-2 shrink-0">
                                <button onClick={() => window.open(`/watch/${movie.id}`, '_blank')} className="btn btn-primary btn-xs">Preview</button>
                                <button onClick={() => { setVideoStatus('idle'); setVideoFile(null); }} className="btn btn-ghost btn-xs">Replace</button>
                            </div>
                        </div>
                    ) : videoStatus === 'uploading' ? (
                        <div className="text-center py-6">
                            <div className="inline-flex items-center gap-2 mb-3">
                                <span className="loading loading-spinner loading-sm text-primary"></span>
                                <span className="text-sm font-medium">Uploading... {videoProgress}%</span>
                            </div>
                            <progress className="progress progress-primary w-full max-w-sm mx-auto h-2" value={videoProgress} max="100"></progress>
                            <p className="text-xs text-gray-500 mt-2">Do not close this tab</p>
                        </div>
                    ) : videoStatus === 'processing' ? (
                        <div className="text-center py-6">
                            <span className="loading loading-dots loading-md text-warning mb-2"></span>
                            <p className="text-sm font-semibold">Encoding in progress...</p>
                            <p className="text-xs text-gray-500 mt-1">Transcoding into multi-quality HLS streams</p>
                        </div>
                    ) : videoFile ? (
                        <div className="flex items-center gap-3 p-3 bg-base-100 rounded-lg border border-white/5">
                            <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center shrink-0">
                                <svg className="w-5 h-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-white truncate">{videoFile.name}</p>
                                <p className="text-xs text-gray-400 mt-0.5">{formatBytes(videoFile.size)} Â· {videoFile.type || 'video/mp4'}</p>
                            </div>
                            <div className="flex gap-2 shrink-0">
                                <button onClick={startVideoUpload} className="btn btn-primary btn-xs">Upload</button>
                                <button onClick={() => setVideoFile(null)} className="btn btn-ghost btn-xs text-error">Remove</button>
                            </div>
                        </div>
                    ) : (
                        <>
                            <input ref={videoInputRef} type="file" accept="video/*" onChange={handleVideoSelect} className="hidden" />
                            <div onClick={() => videoInputRef.current?.click()} className="border-2 border-dashed border-base-content/10 hover:border-primary/30 rounded-lg py-10 flex flex-col items-center justify-center cursor-pointer transition-all group">
                                <svg className="w-6 h-6 text-gray-500 group-hover:text-primary transition-colors mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                                </svg>
                                <p className="text-sm text-gray-400 group-hover:text-primary transition-colors">Click to browse or drop video here</p>
                                <p className="text-xs text-gray-600 mt-1">MP4, MKV, MOV Â· Max 10 GB</p>
                            </div>
                        </>
                    )}
                    {videoError && <p className="text-error text-xs mt-2">{videoError}</p>}
                </div>
            </div>

            {/* POSTER & SUBTITLES */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Poster */}
                <div className="bg-base-200 rounded-xl border border-white/5 overflow-hidden">
                    <div className="flex items-center justify-between px-5 py-3 border-b border-white/5">
                        <div className="flex items-center gap-2.5">
                            <svg className="w-4 h-4 text-info" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                            <h3 className="font-semibold text-sm">Poster Image</h3>
                        </div>
                        {posterStatus === 'success' && <span className="badge badge-success badge-xs">Uploaded</span>}
                    </div>
                    <div className="p-5">
                        <input ref={posterInputRef} type="file" accept="image/*" onChange={handlePosterSelect} className="hidden" />
                        {displayPosterUrl ? (
                            <div className="flex gap-4 items-start">
                                <div className="relative w-[100px] h-[150px] rounded-lg overflow-hidden border border-white/10 bg-base-300 shrink-0">
                                    <img src={displayPosterUrl} alt="Poster preview" className="w-full h-full object-cover" />
                                </div>
                                <div className="flex flex-col gap-2 flex-1 min-w-0">
                                    {posterFile && (<div><p className="text-sm font-medium text-white truncate">{posterFile.name}</p><p className="text-xs text-gray-500">{formatBytes(posterFile.size)}</p></div>)}
                                    {!posterFile && movie.posterUrl && (<p className="text-xs text-gray-400">Current poster</p>)}
                                    {posterStatus === 'uploading' ? (
                                        <progress className="progress progress-info w-full h-2" value={posterProgress} max="100"></progress>
                                    ) : (
                                        <div className="flex flex-wrap gap-2">
                                            {posterFile && <button className="btn btn-primary btn-xs" onClick={startPosterUpload}>Upload</button>}
                                            <button className="btn btn-ghost btn-xs" onClick={() => posterInputRef.current?.click()}>{posterFile ? 'Change' : 'Replace'}</button>
                                            {posterFile && <button className="btn btn-ghost btn-xs text-error" onClick={handlePosterRemove}>Remove</button>}
                                        </div>
                                    )}
                                    {posterStatus === 'error' && <p className="text-error text-xs">Upload failed. Try again.</p>}
                                </div>
                            </div>
                        ) : (
                            <div onClick={() => posterInputRef.current?.click()} className="border-2 border-dashed border-base-content/10 hover:border-info/30 rounded-lg py-8 flex flex-col items-center justify-center cursor-pointer transition-all group">
                                <svg className="w-5 h-5 text-gray-500 group-hover:text-info transition-colors mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                <span className="text-sm text-gray-400 group-hover:text-white transition-colors">Click to upload poster</span>
                                <span className="text-xs text-gray-600 mt-0.5">JPG, PNG Â· 2:3 ratio</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Subtitles */}
                <div className="bg-base-200 rounded-xl border border-white/5 overflow-hidden">
                    <div className="flex items-center justify-between px-5 py-3 border-b border-white/5">
                        <div className="flex items-center gap-2.5">
                            <svg className="w-4 h-4 text-warning" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" /></svg>
                            <h3 className="font-semibold text-sm">Subtitles</h3>
                        </div>
                        {subtitleStatus === 'success' && <span className="badge badge-success badge-xs">Uploaded</span>}
                    </div>
                    <div className="p-5">
                        <input ref={subtitleInputRef} type="file" accept=".vtt,.srt" onChange={handleSubtitleSelect} className="hidden" />
                        {movie.subtitles && movie.subtitles.length > 0 && (
                            <div className="mb-3 space-y-1.5">
                                {movie.subtitles.map((sub: any, i: number) => (
                                    <div key={i} className="flex items-center gap-2 text-sm bg-base-100 px-3 py-2 rounded-lg border border-white/5">
                                        <svg className="w-3.5 h-3.5 text-gray-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                                        <span className="flex-1 font-mono text-xs">{sub.language || sub.fileName || `Subtitle ${i + 1}`}</span>
                                        <span className="badge badge-ghost badge-xs">VTT</span>
                                    </div>
                                ))}
                            </div>
                        )}
                        {subtitleFile && (
                            <div className="flex items-center gap-2 px-3 py-2 bg-base-100 rounded-lg border border-white/5 mb-3">
                                <svg className="w-3.5 h-3.5 text-warning shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs font-medium truncate">{subtitleFile.name}</p>
                                    <p className="text-[10px] text-gray-500">{formatBytes(subtitleFile.size)}</p>
                                </div>
                                {subtitleStatus === 'uploading' ? (
                                    <progress className="progress progress-warning w-20 h-1.5" value={subtitleProgress} max="100"></progress>
                                ) : (
                                    <div className="flex gap-1.5">
                                        <button className="btn btn-primary btn-xs" onClick={startSubtitleUpload}>Upload</button>
                                        <button className="btn btn-ghost btn-xs text-error" onClick={() => setSubtitleFile(null)}>âœ•</button>
                                    </div>
                                )}
                            </div>
                        )}
                        {subtitleStatus === 'error' && <p className="text-error text-xs mb-2">Upload failed.</p>}
                        <div onClick={() => subtitleInputRef.current?.click()} className="border-2 border-dashed border-base-content/10 hover:border-warning/30 rounded-lg py-5 flex flex-col items-center justify-center cursor-pointer transition-all group">
                            <svg className="w-4 h-4 text-gray-500 group-hover:text-warning transition-colors mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                            <span className="text-xs text-gray-400 group-hover:text-white transition-colors">Add subtitle file</span>
                            <span className="text-[10px] text-gray-600 mt-0.5">.vtt or .srt</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
```

---

## 5. MetadataTab Component â€” `_components/MetadataTab.tsx`

```tsx
'use client';

import { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import CreatableSelect from 'react-select/creatable';
import { useGenres, useUpdateMovie } from '@/lib/queries';
import styles from '../../movie-form.module.css';

const schema = z.object({
    title: z.string().min(1, 'Title is required').max(500),
    description: z.string().optional(),
    releaseYear: z.number().int().min(1900).max(2100).optional().nullable(),
    duration: z.number().int().min(1).optional().nullable(),
    genreIds: z.array(z.string()).optional(),
    actors: z.array(z.string()).optional(),
});

type FormData = z.infer<typeof schema>;

interface MetadataTabProps { movie: any; }

export default function MetadataTab({ movie }: MetadataTabProps) {
    const { data: genres } = useGenres();
    const updateMutation = useUpdateMovie();
    const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

    const { register, handleSubmit, reset, control, watch, formState: { errors, isSubmitting, isDirty } } = useForm<FormData>({
        resolver: zodResolver(schema),
        defaultValues: { title: '', description: '', releaseYear: undefined, duration: undefined, genreIds: [], actors: [] },
    });

    const descriptionValue = watch('description') || '';

    useEffect(() => {
        if (movie) {
            reset({
                title: movie.title, description: movie.description || '',
                releaseYear: movie.releaseYear || undefined,
                duration: movie.durationSeconds ? Math.floor(movie.durationSeconds / 60) : undefined,
                genreIds: movie.genres.map((g: any) => g.id),
                actors: movie.actors.map((a: any) => a.name),
            });
        }
    }, [movie, reset]);

    useEffect(() => {
        if (saveStatus === 'saved') { const timer = setTimeout(() => setSaveStatus('idle'), 3000); return () => clearTimeout(timer); }
    }, [saveStatus]);

    const onSubmit = async (data: FormData) => {
        try {
            setSaveStatus('saving');
            await updateMutation.mutateAsync({
                id: movie.id,
                input: {
                    title: data.title, description: data.description || undefined,
                    releaseYear: data.releaseYear || undefined,
                    durationSeconds: data.duration ? data.duration * 60 : undefined,
                    genreIds: data.genreIds, actors: data.actors,
                },
            });
            setSaveStatus('saved');
        } catch (err) { setSaveStatus('error'); }
    };

    return (
        <form onSubmit={handleSubmit(onSubmit)} className={styles.form}>
            {/* Basic Info */}
            <div className={styles.section}>
                <div className={styles.sectionHeader}>
                    <span className={styles.sectionIcon}>đŸ“</span>
                    <h2 className={styles.sectionTitle}>Basic Information</h2>
                </div>
                <div className={styles.sectionContent}>
                    <div className={styles.field}>
                        <label className={styles.fieldLabel} htmlFor="title">Title *</label>
                        <input id="title" type="text" className="input" placeholder="Enter movie title" {...register('title')} />
                        {errors.title && <p className={styles.fieldError}>{errors.title.message}</p>}
                    </div>
                    <div className={styles.field}>
                        <label className={styles.fieldLabel} htmlFor="description">Description</label>
                        <textarea id="description" className="input" rows={4} placeholder="Enter movie synopsis..." {...register('description')} />
                        <span className={styles.charCount}>{descriptionValue.length}/2000</span>
                    </div>
                    <div className={styles.formRow}>
                        <div className={styles.field}>
                            <label className={styles.fieldLabel} htmlFor="releaseYear">Release Year</label>
                            <input id="releaseYear" type="number" className="input" placeholder="2024" {...register('releaseYear', { valueAsNumber: true })} />
                        </div>
                        <div className={styles.field}>
                            <label className={styles.fieldLabel} htmlFor="duration">Duration (minutes)</label>
                            <input id="duration" type="number" className="input" placeholder="120" {...register('duration', { valueAsNumber: true })} />
                        </div>
                    </div>
                </div>
            </div>

            {/* Cast */}
            <div className={styles.section}>
                <div className={styles.sectionHeader}>
                    <span className={styles.sectionIcon}>đŸ‘¥</span>
                    <h2 className={styles.sectionTitle}>Cast & Crew</h2>
                </div>
                <div className={styles.sectionContent}>
                    <div className={styles.field}>
                        <label className={styles.fieldLabel}>Actors</label>
                        <Controller
                            name="actors" control={control}
                            render={({ field: { onChange, value, ref } }) => (
                                <CreatableSelect
                                    ref={ref} isMulti placeholder="Type actor name and press Enter..."
                                    onChange={(val) => onChange(val ? val.map((v: any) => v.value) : [])}
                                    value={value?.map((v) => ({ label: v, value: v }))}
                                    className="react-select-container" classNamePrefix="react-select"
                                    styles={{
                                        control: (base) => ({ ...base, backgroundColor: '#1f2937', borderColor: '#374151', color: 'white' }),
                                        menu: (base) => ({ ...base, backgroundColor: '#1f2937', color: 'white' }),
                                        option: (base, state) => ({ ...base, backgroundColor: state.isFocused ? '#374151' : '#1f2937', color: 'white', cursor: 'pointer' }),
                                        multiValue: (base) => ({ ...base, backgroundColor: '#374151' }),
                                        multiValueLabel: (base) => ({ ...base, color: 'white' }),
                                        multiValueRemove: (base) => ({ ...base, color: '#9ca3af', ':hover': { backgroundColor: '#ef4444', color: 'white' } }),
                                        input: (base) => ({ ...base, color: 'white' }),
                                    }}
                                />
                            )}
                        />
                    </div>
                </div>
            </div>

            {/* Genres */}
            <div className={styles.section}>
                <div className={styles.sectionHeader}>
                    <span className={styles.sectionIcon}>đŸ·ï¸</span>
                    <h2 className={styles.sectionTitle}>Genres</h2>
                </div>
                <div className={styles.sectionContent}>
                    <Controller
                        name="genreIds" control={control}
                        render={({ field: { value = [], onChange } }) => (
                            <div className={styles.genreList}>
                                {genres?.map((genre) => (
                                    <button key={genre.id} type="button"
                                        className={`${styles.genreTag} ${value.includes(genre.id) ? styles.genreTagActive : ''}`}
                                        onClick={() => {
                                            const newValue = value.includes(genre.id) ? value.filter((id) => id !== genre.id) : [...value, genre.id];
                                            onChange(newValue);
                                        }}
                                    >{genre.name}</button>
                                ))}
                            </div>
                        )}
                    />
                </div>
            </div>

            {/* Actions */}
            <div className={styles.actions}>
                <div className="flex items-center gap-3">
                    <button type="submit" className="btn btn-primary" disabled={isSubmitting || !isDirty}>
                        {isSubmitting ? (<><span className="loading loading-spinner loading-xs"></span> Saving...</>) : 'Save Changes'}
                    </button>
                    {saveStatus === 'saved' && (
                        <span className="text-success text-sm flex items-center gap-1 animate-fade-in">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                            Saved
                        </span>
                    )}
                    {saveStatus === 'error' && <span className="text-error text-sm">Failed to save. Try again.</span>}
                </div>
            </div>
        </form>
    );
}
```

---

## 6. SettingsTab Component â€” `_components/SettingsTab.tsx`

```tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useDeleteMovie } from '@/lib/queries';
import { useLocalePath } from '@/lib/use-locale-path';

interface SettingsTabProps { movie: any; }

export default function SettingsTab({ movie }: SettingsTabProps) {
    const router = useRouter();
    const { localePath } = useLocalePath();
    const deleteMovie = useDeleteMovie();
    const [isDeleting, setIsDeleting] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);

    const handleDelete = async () => {
        try {
            setIsDeleting(true);
            await deleteMovie.mutateAsync(movie.id);
            router.push(localePath('/movies'));
        } catch (error) {
            console.error('Failed to delete movie:', error);
            setIsDeleting(false);
        }
    };

    return (
        <div className="max-w-3xl mx-auto space-y-6 animate-fade-in">
            <div className="bg-base-200 rounded-xl border border-white/5 overflow-hidden">
                <div className="flex items-center gap-3 px-5 py-4 border-b border-white/5">
                    <div className="w-8 h-8 rounded-lg bg-base-300 flex items-center justify-center text-sm">â™ï¸</div>
                    <h2 className="font-semibold text-lg">General Settings</h2>
                </div>
                <div className="p-5">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="bg-base-100 rounded-lg border border-white/5 p-4">
                            <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Status</p>
                            <p className="font-medium text-white capitalize">{movie.movieStatus || 'Draft'}</p>
                        </div>
                        <div className="bg-base-100 rounded-lg border border-white/5 p-4">
                            <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Encode Status</p>
                            <p className="font-medium text-white capitalize">{movie.encodeStatus || 'Pending'}</p>
                        </div>
                        <div className="bg-base-100 rounded-lg border border-white/5 p-4">
                            <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Created</p>
                            <p className="font-medium text-white text-sm">{movie.createdAt ? new Date(movie.createdAt).toLocaleDateString() : 'â€”'}</p>
                        </div>
                        <div className="bg-base-100 rounded-lg border border-white/5 p-4">
                            <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Last Updated</p>
                            <p className="font-medium text-white text-sm">{movie.updatedAt ? new Date(movie.updatedAt).toLocaleDateString() : 'â€”'}</p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="bg-base-200 rounded-xl border border-error/20 overflow-hidden">
                <div className="flex items-center gap-3 px-5 py-4 border-b border-error/10">
                    <div className="w-8 h-8 rounded-lg bg-error/10 flex items-center justify-center text-sm">đŸ—‘ï¸</div>
                    <h2 className="font-semibold text-lg text-error">Danger Zone</h2>
                </div>
                <div className="p-5">
                    <div className="flex items-center justify-between gap-4">
                        <div className="min-w-0">
                            <p className="font-medium text-white">Delete this movie</p>
                            <p className="text-sm text-gray-500">Permanently remove this movie and all associated media. This cannot be undone.</p>
                        </div>
                        {!showConfirm ? (
                            <button className="btn btn-error btn-outline btn-sm shrink-0" onClick={() => setShowConfirm(true)}>Delete</button>
                        ) : (
                            <div className="flex items-center gap-2 shrink-0">
                                <button className="btn btn-ghost btn-sm" onClick={() => setShowConfirm(false)} disabled={isDeleting}>Cancel</button>
                                <button className="btn btn-error btn-sm" onClick={handleDelete} disabled={isDeleting}>
                                    {isDeleting ? (<><span className="loading loading-spinner loading-xs"></span> Deleting</>) : 'Confirm Delete'}
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
```

---

## 7. StatusBadge Component â€” `_components/StatusBadge.tsx`

```tsx
interface StatusBadgeProps {
    status: string;
    type: 'publish' | 'encode';
}

export default function StatusBadge({ status, type }: StatusBadgeProps) {
    let color = 'badge-neutral';
    let label = status;

    if (type === 'publish') {
        if (status === 'published') { color = 'badge-success'; label = 'Published'; }
        else { color = 'badge-ghost'; label = 'Draft'; }
    } else if (type === 'encode') {
        switch (status) {
            case 'ready': color = 'badge-success'; label = 'Ready'; break;
            case 'processing': color = 'badge-warning'; label = 'Processing'; break;
            case 'failed': color = 'badge-error'; label = 'Failed'; break;
            default: color = 'badge-ghost'; label = 'Pending';
        }
    }

    return (
        <div className={`badge ${color} gap-2`}>
            {type === 'encode' && status === 'processing' && <span className="loading loading-spinner loading-xs"></span>}
            {label?.toUpperCase()}
        </div>
    );
}
```

---

## 8. Standalone Media Center â€” `movies/[id]/media/page.tsx`

> **NOTE**: Trang nĂ y trĂ¹ng láº·p logic vá»›i MediaTab. CĂ³ thá»ƒ cĂ¢n nháº¯c bá» hoáº·c redirect sang edit page tab Media.

```tsx
'use client';

import { useState, useRef, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import Image from 'next/image';
import { useLocalePath } from '@/lib/use-locale-path';
import {
    useMovie, usePresignedUrl, useUploadComplete,
    useMoviePolling, useSubtitlePresignedUrl, useSubtitleComplete
} from '@/lib/queries';
import styles from '../../media-center.module.css';

export default function MediaCenterPage() {
    const params = useParams();
    const router = useRouter();
    const { localePath } = useLocalePath();
    const movieId = params.id as string;
    const queryClient = useQueryClient();
    const { data: movie, isLoading } = useMovie(movieId);

    useMoviePolling(movieId, movie?.encodeStatus === 'processing');

    // States & handlers giá»‘ng há»‡t MediaTab â€” xem MediaTab á»Ÿ trĂªn
    // ... (logic upload video/poster/subtitle giá»‘ng 100%)

    if (isLoading) return <div className="p-8">Loading...</div>;

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <h1 className={styles.title}>Media Center: {movie?.title}</h1>
                <p className={styles.subtitle}>Upload and monitor media processing status.</p>
            </div>

            <div className={styles.grid}>
                {/* Main Column: Video */}
                <div className={styles.mainColumn}>
                    <div className={styles.card}>
                        {/* Video upload UI â€“ dĂ¹ng CSS Module styles.uploadZone, styles.stepper... */}
                        {/* Stepper 3 bÆ°á»›c: Upload â†’ Processing â†’ Ready */}
                        {/* Drop zone vá»›i icon cloud 64x64 */}
                        {/* Progress bar vá»›i striped animation */}
                    </div>
                </div>

                {/* Side Column */}
                <div className={styles.sideColumn}>
                    {/* Poster Card â€“ dĂ¹ng next/image Image fill (BUG: phĂ³ng to full screen) */}
                    {/* Subtitle Card â€“ danh sĂ¡ch + nĂºt add */}
                </div>
            </div>

            <div className={styles.actions}>
                <button className="btn btn-ghost" onClick={() => router.push(localePath(`/movies/${movieId}`))}>Cancel</button>
                <button className="btn btn-primary px-8" onClick={() => router.push(localePath('/movies'))}>Finish & Return to List</button>
            </div>
        </div>
    );
}
```

---

## 9. CSS Modules

### `movies.module.css` (Movie List)

```css
.header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 1.5rem; }
.pageTitle { font-size: 1.5rem; font-weight: 600; }
.searchForm { display: flex; gap: 0.5rem; margin-bottom: 1.5rem; }
.movieInfo { display: flex; align-items: center; gap: 0.75rem; }
.poster { width: 40px; height: 56px; object-fit: cover; border-radius: 4px; background: var(--bg-tertiary); }
.posterPlaceholder { width: 40px; height: 56px; display: flex; align-items: center; justify-content: center; background: var(--bg-tertiary); border-radius: 4px; color: var(--text-muted); }
.title { font-weight: 500; }
.textMuted { color: var(--text-secondary); font-size: 0.875rem; }
.actions { display: flex; gap: 0.5rem; }
.loading { display: flex; flex-direction: column; gap: 0.5rem; }
.skeletonRow { height: 64px; border-radius: 4px; }
.empty { text-align: center; padding: 4rem 2rem; color: var(--text-secondary); }
.empty p { margin-bottom: 1rem; }
.error { padding: 1rem; background: rgba(229, 9, 20, 0.1); border: 1px solid var(--error); border-radius: 4px; color: var(--error); margin-bottom: 1rem; }
.pagination { display: flex; align-items: center; justify-content: center; gap: 1rem; margin-top: 1.5rem; }
.pageInfo { color: var(--text-secondary); font-size: 0.875rem; }
```

### `movie-form.module.css` (Metadata Form)

```css
.pageTitle { font-size: 1.75rem; font-weight: 600; margin-bottom: 2rem; color: var(--text-primary); }
.container { max-width: 900px; }
.form { display: flex; flex-direction: column; gap: 2rem; }
.section { background: var(--bg-secondary); border: 1px solid var(--border); border-radius: 12px; padding: 1.5rem; }
.sectionHeader { display: flex; align-items: center; gap: 0.75rem; margin-bottom: 1.25rem; padding-bottom: 0.75rem; border-bottom: 1px solid var(--border); }
.sectionIcon { font-size: 1.25rem; }
.sectionTitle { font-size: 1rem; font-weight: 600; color: var(--text-primary); }
.sectionContent { display: flex; flex-direction: column; gap: 1.25rem; }
.formRow { display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; }
@media (max-width: 640px) { .formRow { grid-template-columns: 1fr; } }
.field { display: flex; flex-direction: column; gap: 0.5rem; }
.fieldLabel { font-size: 0.875rem; color: var(--text-secondary); font-weight: 500; }
.genreList { display: flex; flex-wrap: wrap; gap: 0.5rem; }
.genreTag { padding: 0.5rem 1rem; background: var(--bg-tertiary); border: 1px solid var(--border); border-radius: 20px; color: var(--text-secondary); font-size: 0.875rem; cursor: pointer; transition: all 0.2s; }
.genreTag:hover { border-color: var(--accent); color: var(--text-primary); }
.genreTagActive { background: var(--accent); border-color: var(--accent); color: white; }
.actions { display: flex; gap: 1rem; padding-top: 1.5rem; border-top: 1px solid var(--border); justify-content: flex-end; }
.charCount { font-size: 0.75rem; color: var(--text-muted); text-align: right; margin-top: 0.25rem; }
.fieldError { color: var(--error); font-size: 0.75rem; margin-top: 0.25rem; }
```

### `media-center.module.css` (Standalone Media Center)

```css
.container { padding: 2rem; max-width: 1200px; margin: 0 auto; }
.header { margin-bottom: 2rem; }
.title { font-size: 2rem; font-weight: 700; margin-bottom: 0.5rem; }
.subtitle { color: var(--muted-foreground); font-size: 1rem; }
.grid { display: grid; grid-template-columns: 1fr; gap: 1.5rem; }
@media (min-width: 1024px) { .grid { grid-template-columns: 2fr 1fr; } }
.card { background: var(--card); border: 1px solid var(--border); border-radius: var(--radius); padding: 1.5rem; height: 100%; display: flex; flex-direction: column; }
.cardHeader { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; }
.cardTitle { font-size: 1.25rem; font-weight: 600; display: flex; align-items: center; gap: 0.5rem; }
.mainColumn { display: flex; flex-direction: column; gap: 1.5rem; }
.sideColumn { display: flex; flex-direction: column; gap: 1.5rem; }
.uploadZone { border: 2px dashed #444; border-radius: 12px; padding: 3rem 1.5rem; text-align: center; cursor: pointer; transition: all 0.3s; background: rgba(255,255,255,0.02); display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 1rem; }
.uploadZone:hover { border-color: #e50914; background: rgba(229,9,20,0.05); transform: translateY(-2px); }
.uploadIcon { width: 64px; height: 64px; color: #666; transition: color 0.3s; }
.uploadZone:hover .uploadIcon { color: #e50914; }
/* Stepper, Progress bar styles... (xem file gá»‘c) */
.actions { display: flex; justify-content: flex-end; gap: 1rem; margin-top: 2rem; padding-top: 2rem; border-top: 1px solid #333; }
```

---

## Ghi chĂº cho Lovable

### Váº¥n Ä‘á» hiá»‡n táº¡i cáº§n fix:
1. **Movie List** (`movies/page.tsx`): Giao diá»‡n báº£ng cÆ¡ báº£n, chÆ°a Ä‘áº¹p, thiáº¿u poster thumbnail rĂµ rĂ ng
2. **New Movie** (`movies/new/page.tsx`): Form Ä‘Æ¡n giáº£n, cháº¥p nháº­n Ä‘Æ°á»£c nhÆ°ng cĂ³ thá»ƒ Ä‘áº¹p hÆ¡n
3. **Edit Movie tabs** (`[id]/page.tsx`): Tab navigation ok, nhÆ°ng layout tá»•ng thá»ƒ cĂ³ thá»ƒ cáº£i thiá»‡n
4. **MediaTab**: Giao diá»‡n upload hiá»‡n táº¡i Ä‘Ă£ dĂ¹ng SVG icons thay emoji, nhÆ°ng váº«n chÆ°a thá»±c sá»± Ä‘áº¹p
5. **Media Center standalone** (`[id]/media/page.tsx`): TrĂ¹ng láº·p vá»›i MediaTab, dĂ¹ng `next/image fill` gĂ¢y bug poster phĂ³ng to full screen, icon upload 64x64 quĂ¡ to
6. **MetadataTab**: DĂ¹ng CSS Module + emoji section icons, cáº§n thá»‘ng nháº¥t style
7. **SettingsTab**: TÆ°Æ¡ng Ä‘á»‘i ok nhÆ°ng váº«n dĂ¹ng emoji icon

### Quy táº¯c:
- **CHá»ˆ Sá»¬A GIAO DIá»†N** â€” giá»¯ nguyĂªn táº¥t cáº£ hooks, mutations, handlers, state logic
- Giá»¯ nguyĂªn cáº¥u trĂºc file vĂ  component props
- Styling: Tailwind CSS + DaisyUI (dark theme). CĂ³ thá»ƒ dĂ¹ng CSS Module hoáº·c inline Tailwind
- Poster pháº£i cĂ³ kĂ­ch thÆ°á»›c cá»‘ Ä‘á»‹nh (khĂ´ng dĂ¹ng `Image fill`), vĂ­ dá»¥: `w-[100px] h-[150px]`
- Icons nĂªn dĂ¹ng SVG inline (w-4 h-4 hoáº·c w-5 h-5), KHĂ”NG dĂ¹ng emoji
- Responsive: mobile-first, grid layouts cho desktop
