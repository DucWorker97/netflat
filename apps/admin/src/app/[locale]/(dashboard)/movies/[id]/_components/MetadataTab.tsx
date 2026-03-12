'use client';

import { useState, useEffect, useCallback } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import CreatableSelect from 'react-select/creatable';
import { useGenres, useUpdateMovie, useActorSuggest } from '@/lib/queries';

const schema = z.object({
    title: z.string().min(1, 'Title is required').max(500),
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
            reset({
                title: movie.title,
                description: movie.description || '',
                releaseYear: movie.releaseYear || undefined,
                duration: movie.durationSeconds ? Math.floor(movie.durationSeconds / 60) : undefined,
                genreIds: movie.genres.map((g: any) => g.id),
                actors: movie.actors.map((a: any) => a.name),
            });
        }
    }, [movie, reset]);

    // Auto-hide saved status
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
        } catch (err) {
            setSaveStatus('error');
        }
    };

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', paddingBottom: '6rem' }}>
            {/* Basic Information */}
            <div className="glass-card p-6" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <h3 className="section-title">Basic Information</h3>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label className="form-label">Title</label>
                    <input
                        type="text"
                        className="form-input"
                        placeholder="Enter movie title"
                        {...register('title')}
                    />
                    {errors.title && <p className="text-xs text-error">{errors.title.message}</p>}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <div className="flex justify-between items-center">
                        <label className="form-label" style={{ margin: 0 }}>Description</label>
                        <span className="text-xs font-mono" style={{ color: descriptionValue.length > maxDescLength ? 'var(--error)' : 'var(--text-muted)' }}>
                            {descriptionValue.length}/{maxDescLength}
                        </span>
                    </div>
                    <textarea
                        className="form-input form-textarea"
                        placeholder="Enter movie synopsis..."
                        maxLength={maxDescLength}
                        {...register('description')}
                    />
                </div>

                <div className="grid-2">
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <label className="form-label">Release Year</label>
                        <input
                            type="number"
                            className="form-input"
                            placeholder="2024"
                            {...register('releaseYear', { valueAsNumber: true })}
                        />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <label className="form-label">Duration (minutes)</label>
                        <input
                            type="number"
                            className="form-input"
                            placeholder="120"
                            {...register('duration', { valueAsNumber: true })}
                        />
                    </div>
                </div>
            </div>

            {/* Genres */}
            <div className="glass-card p-6" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <h3 className="section-title">Genres</h3>
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

            {/* Cast & Crew */}
            <div className="glass-card p-6" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <h3 className="section-title">Cast & Crew</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label className="form-label">Actors</label>
                    <Controller
                        name="actors"
                        control={control}
                        render={({ field: { onChange, value, ref } }) => (
                            <CreatableSelect
                                ref={ref}
                                isMulti
                                placeholder="Type actor name and press Enter..."
                                options={actorSuggestions.map((name) => ({ label: name, value: name }))}
                                onInputChange={(val) => setActorInput(val)}
                                onChange={(val) => onChange(val ? val.map((v: any) => v.value) : [])}
                                value={value?.map((v) => ({ label: v, value: v }))}
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
                    <p className="text-xs text-muted mt-1">Type a new name to create or select an actor.</p>
                </div>
            </div>

            {/* Sticky Save Bar */}
            <div className="sticky-save-bar">
                <div style={{ maxWidth: '56rem', margin: '0 auto' }}>
                    <button
                        type="submit"
                        className="gradient-btn w-full"
                        style={{ padding: '12px', borderRadius: '12px', fontWeight: 600, fontSize: '0.875rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                        disabled={isSubmitting || !isDirty}
                    >
                        {isSubmitting ? (
                            <><span className="spinner spinner-sm"></span> Saving...</>
                        ) : saveStatus === 'saved' ? (
                            <><svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg> Saved!</>
                        ) : saveStatus === 'error' ? (
                            'Failed — Try Again'
                        ) : (
                            'Save Changes'
                        )}
                    </button>
                </div>
            </div>
        </form>
    );
}
