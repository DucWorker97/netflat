'use client';

import { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import CreatableSelect from 'react-select/creatable';
import { useGenres, useUpdateMovie, useActorSuggest } from '@/lib/queries';

const schema = z.object({
    title: z.string().min(1, 'Tiêu đề là bắt buộc').max(500),
    description: z.string().optional(),
    releaseYear: z.number().int().min(1900).max(2100).optional().nullable(),
    duration: z.number().int().min(1).optional().nullable(),
    genreIds: z.array(z.string()).optional(),
    actors: z.array(z.string()).optional(),
});

type FormData = z.infer<typeof schema>;

interface MetadataTabProps {
    movie: any;
}

const maxDescLength = 500;

function normalizeActors(input: unknown): string[] {
    if (!Array.isArray(input)) {
        return [];
    }

    const seen = new Set<string>();
    const result: string[] = [];

    for (const item of input) {
        const raw = typeof item === 'string'
            ? item
            : item && typeof item === 'object' && 'name' in item
            ? String((item as { name?: unknown }).name ?? '')
            : '';

        const value = raw.trim();
        if (!value) {
            continue;
        }

        const key = value.toLowerCase();
        if (seen.has(key)) {
            continue;
        }

        seen.add(key);
        result.push(value);
    }

    return result;
}

function formatTmdbNumber(value: number | null | undefined, digits = 1): string {
    if (typeof value !== 'number' || Number.isNaN(value)) {
        return '—';
    }

    return new Intl.NumberFormat('vi-VN', {
        maximumFractionDigits: digits,
        minimumFractionDigits: digits,
    }).format(value);
}

function formatInteger(value: number | null | undefined): string {
    if (typeof value !== 'number' || Number.isNaN(value)) {
        return '—';
    }

    return new Intl.NumberFormat('vi-VN').format(value);
}

export default function MetadataTab({ movie }: MetadataTabProps) {
    const { data: genres } = useGenres();
    const updateMutation = useUpdateMovie();
    const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
    const [actorInput, setActorInput] = useState('');
    const { data: actorSuggestions = [] } = useActorSuggest(actorInput);

    const {
        register,
        handleSubmit,
        reset,
        control,
        watch,
        formState: { errors, isSubmitting, isDirty },
    } = useForm<FormData>({
        resolver: zodResolver(schema),
        defaultValues: {
            title: '',
            description: '',
            releaseYear: undefined,
            duration: undefined,
            genreIds: [],
            actors: [],
        },
    });

    const descriptionValue = watch('description') || '';

    useEffect(() => {
        if (movie) {
            const normalizedActors = normalizeActors(movie.actors);

            reset({
                title: movie.title,
                description: movie.description || '',
                releaseYear: movie.releaseYear || undefined,
                duration: movie.durationSeconds ? Math.floor(movie.durationSeconds / 60) : undefined,
                genreIds: movie.genres.map((g: any) => g.id),
                actors: normalizedActors,
            });
        }
    }, [movie, reset]);

    useEffect(() => {
        if (saveStatus === 'saved') {
            const timer = setTimeout(() => setSaveStatus('idle'), 3000);
            return () => clearTimeout(timer);
        }
    }, [saveStatus]);

    const onSubmit = async (data: FormData) => {
        try {
            setSaveStatus('saving');
            await updateMutation.mutateAsync({
                id: movie.id,
                input: {
                    title: data.title,
                    description: data.description || undefined,
                    releaseYear: data.releaseYear || undefined,
                    durationSeconds: data.duration ? data.duration * 60 : undefined,
                    genreIds: data.genreIds,
                    actors: data.actors,
                },
            });
            setSaveStatus('saved');
        } catch {
            setSaveStatus('error');
        }
    };

    const hasTmdbMetadata = Boolean(
        movie.tmdbId
        || movie.originalLanguage
        || movie.trailerUrl
        || typeof movie.voteAverage === 'number'
        || typeof movie.voteCount === 'number'
        || typeof movie.popularity === 'number'
    );

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', paddingBottom: '6rem' }}>
            <div className="glass-card p-6" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <h3 className="section-title">Thông tin cơ bản</h3>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label className="form-label">Tiêu đề</label>
                    <input
                        type="text"
                        className="form-input"
                        placeholder="Nhập tiêu đề phim"
                        {...register('title')}
                    />
                    {errors.title && <p className="text-xs text-error">{errors.title.message}</p>}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <div className="flex justify-between items-center">
                        <label className="form-label" style={{ margin: 0 }}>Mô tả</label>
                        <span className="text-xs font-mono" style={{ color: descriptionValue.length > maxDescLength ? 'var(--error)' : 'var(--text-muted)' }}>
                            {descriptionValue.length}/{maxDescLength}
                        </span>
                    </div>
                    <textarea
                        className="form-input form-textarea"
                        placeholder="Nhập tóm tắt phim..."
                        maxLength={maxDescLength}
                        {...register('description')}
                    />
                </div>

                <div className="grid-2">
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <label className="form-label">Năm phát hành</label>
                        <input
                            type="number"
                            className="form-input"
                            placeholder="2024"
                            {...register('releaseYear', { valueAsNumber: true })}
                        />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <label className="form-label">Thời lượng (phút)</label>
                        <input
                            type="number"
                            className="form-input"
                            placeholder="120"
                            {...register('duration', { valueAsNumber: true })}
                        />
                    </div>
                </div>
            </div>

            <div className="glass-card p-6" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <h3 className="section-title">Thể loại</h3>
                <Controller
                    name="genreIds"
                    control={control}
                    render={({ field: { value = [], onChange } }) => (
                        <div className="flex flex-wrap gap-2">
                            {genres?.map((genre) => (
                                <button
                                    key={genre.id}
                                    type="button"
                                    className={`genre-pill ${value.includes(genre.id) ? 'active' : ''}`}
                                    onClick={() => {
                                        const newValue = value.includes(genre.id)
                                            ? value.filter((id) => id !== genre.id)
                                            : [...value, genre.id];
                                        onChange(newValue);
                                    }}
                                >
                                    {genre.name}
                                </button>
                            ))}
                        </div>
                    )}
                />
            </div>

            <div className="glass-card p-6" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <h3 className="section-title">Diễn viên</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label className="form-label">Danh sách diễn viên</label>
                    <Controller
                        name="actors"
                        control={control}
                        render={({ field: { onChange, value, ref } }) => (
                            <CreatableSelect
                                ref={ref}
                                isMulti
                                placeholder="Nhập tên diễn viên và nhấn Enter..."
                                options={normalizeActors(actorSuggestions).map((name) => ({ label: name, value: name }))}
                                onInputChange={(val) => setActorInput(val)}
                                onChange={(val) => onChange(normalizeActors(val ? val.map((v: any) => v?.value) : []))}
                                value={normalizeActors(value).map((v) => ({ label: v, value: v }))}
                                className="react-select-container"
                                classNamePrefix="react-select"
                                styles={{
                                    control: (base) => ({
                                        ...base,
                                        backgroundColor: 'rgba(26, 26, 37, 0.5)',
                                        borderColor: 'rgba(255,255,255,0.06)',
                                        borderRadius: '8px',
                                        color: 'var(--text-primary)',
                                        minHeight: '42px',
                                    }),
                                    menu: (base) => ({
                                        ...base,
                                        backgroundColor: '#111119',
                                        border: '1px solid rgba(255,255,255,0.06)',
                                        borderRadius: '8px',
                                        color: 'var(--text-primary)',
                                    }),
                                    option: (base, state) => ({
                                        ...base,
                                        backgroundColor: state.isFocused ? 'rgba(124,58,237,0.15)' : 'transparent',
                                        color: 'var(--text-primary)',
                                        cursor: 'pointer',
                                    }),
                                    multiValue: (base) => ({
                                        ...base,
                                        backgroundColor: 'var(--bg-tertiary)',
                                        borderRadius: '16px',
                                        border: '1px solid rgba(255,255,255,0.06)',
                                    }),
                                    multiValueLabel: (base) => ({
                                        ...base,
                                        color: 'var(--text-primary)',
                                        padding: '2px 8px',
                                    }),
                                    multiValueRemove: (base) => ({
                                        ...base,
                                        color: 'var(--text-secondary)',
                                        borderRadius: '0 16px 16px 0',
                                        ':hover': {
                                            backgroundColor: 'rgba(239,68,68,0.2)',
                                            color: 'var(--error)',
                                        },
                                    }),
                                    input: (base) => ({
                                        ...base,
                                        color: 'var(--text-primary)',
                                    }),
                                    placeholder: (base) => ({
                                        ...base,
                                        color: 'var(--text-muted)',
                                    }),
                                }}
                            />
                        )}
                    />
                    <p className="text-xs text-muted mt-1">Nhập tên mới để thêm hoặc chọn diễn viên đã có.</p>
                </div>
            </div>

            {hasTmdbMetadata ? (
                <div className="glass-card p-6" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                        <h3 className="section-title" style={{ margin: 0 }}>Dữ liệu TMDB</h3>
                        {movie.tmdbId ? (
                            <a
                                href={`https://www.themoviedb.org/movie/${movie.tmdbId}`}
                                target="_blank"
                                rel="noreferrer"
                                className="text-xs font-semibold"
                                style={{ color: 'var(--accent-secondary)' }}
                            >
                                Mở trên TMDB
                            </a>
                        ) : null}
                    </div>

                    <div className="grid-2">
                        <div className="glass-card" style={{ padding: '14px 16px' }}>
                            <p className="text-xs text-muted" style={{ marginBottom: '6px' }}>TMDB ID</p>
                            <p className="text-sm font-semibold">{movie.tmdbId ?? '—'}</p>
                        </div>
                        <div className="glass-card" style={{ padding: '14px 16px' }}>
                            <p className="text-xs text-muted" style={{ marginBottom: '6px' }}>Ngôn ngữ gốc</p>
                            <p className="text-sm font-semibold" style={{ textTransform: 'uppercase' }}>{movie.originalLanguage ?? '—'}</p>
                        </div>
                        <div className="glass-card" style={{ padding: '14px 16px' }}>
                            <p className="text-xs text-muted" style={{ marginBottom: '6px' }}>Điểm đánh giá</p>
                            <p className="text-sm font-semibold">{formatTmdbNumber(movie.voteAverage, 1)}</p>
                        </div>
                        <div className="glass-card" style={{ padding: '14px 16px' }}>
                            <p className="text-xs text-muted" style={{ marginBottom: '6px' }}>Lượt bình chọn</p>
                            <p className="text-sm font-semibold">{formatInteger(movie.voteCount)}</p>
                        </div>
                        <div className="glass-card" style={{ padding: '14px 16px' }}>
                            <p className="text-xs text-muted" style={{ marginBottom: '6px' }}>Độ phổ biến</p>
                            <p className="text-sm font-semibold">{formatTmdbNumber(movie.popularity, 1)}</p>
                        </div>
                        <div className="glass-card" style={{ padding: '14px 16px' }}>
                            <p className="text-xs text-muted" style={{ marginBottom: '6px' }}>Trailer</p>
                            {movie.trailerUrl ? (
                                <a
                                    href={movie.trailerUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-sm font-semibold"
                                    style={{ color: 'var(--accent-secondary)' }}
                                >
                                    Xem trailer
                                </a>
                            ) : (
                                <p className="text-sm font-semibold">—</p>
                            )}
                        </div>
                    </div>
                </div>
            ) : null}

            <div className="sticky-save-bar">
                <div style={{ maxWidth: '56rem', margin: '0 auto' }}>
                    <button
                        type="submit"
                        className="gradient-btn w-full"
                        style={{ padding: '12px', borderRadius: '12px', fontWeight: 600, fontSize: '0.875rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                        disabled={isSubmitting || !isDirty}
                    >
                        {isSubmitting ? (
                            <><span className="spinner spinner-sm"></span> Đang lưu...</>
                        ) : saveStatus === 'saved' ? (
                            <><svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg> Đã lưu!</>
                        ) : saveStatus === 'error' ? (
                            'Lưu thất bại - Thử lại'
                        ) : (
                            'Lưu thay đổi'
                        )}
                    </button>
                </div>
            </div>
        </form>
    );
}


