'use client';

import { useState, use } from 'react';
import { notFound } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { useMovie } from '@/lib/queries';
import Link from 'next/link';
import { useLocalePath } from '@/lib/use-locale-path';

// Components
import MetadataTab from './_components/MetadataTab';
import MediaTab from './_components/MediaTab';
import SettingsTab from './_components/SettingsTab';
import StatusBadge from './_components/StatusBadge';

interface EditMoviePageProps {
    params: Promise<{ id: string }>;
}

const FileTextIcon = () => (
    <svg className="tab-icon" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
);

const FilmIcon = () => (
    <svg className="tab-icon" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
);

const SettingsIcon = () => (
    <svg className="tab-icon" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
);

const tabs = [
    { key: 'metadata' as const, label: 'Thông tin', Icon: FileTextIcon },
    { key: 'media' as const, label: 'Media & Tài nguyên', Icon: FilmIcon },
    { key: 'settings' as const, label: 'Cài đặt', Icon: SettingsIcon },
];

export default function EditMoviePage({ params }: EditMoviePageProps) {
    const { id } = use(params);
    const { localePath } = useLocalePath();
    const { data: movie, isLoading, error } = useMovie(id);
    const queryClient = useQueryClient();
    const [activeTab, setActiveTab] = useState<'metadata' | 'media' | 'settings'>('metadata');

    if (isLoading) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
                <span className="spinner spinner-lg"></span>
            </div>
        );
    }

    if (error || !movie) {
        return notFound();
    }

    return (
        <div className="animate-fade-in" style={{ maxWidth: '56rem', margin: '0 auto', padding: '2rem 1rem' }}>
            {/* Breadcrumb */}
            <div className="breadcrumb">
                <Link href={localePath('/movies')}>Phim</Link>
                <span className="separator">/</span>
                <span className="current">{movie.title}</span>
            </div>

            {/* Header */}
            <div className="mb-8">
                <div className="flex flex-wrap items-start gap-3 mb-2">
                    <h1 className="gradient-text" style={{ fontSize: '2rem', fontWeight: 700, lineHeight: 1.2 }}>
                        {movie.title}
                    </h1>
                    <div className="flex gap-2 mt-1">
                        <StatusBadge status={movie.movieStatus} type="publish" />
                        <StatusBadge status={movie.encodeStatus} type="encode" />
                    </div>
                </div>
                <span className="text-xs font-mono text-muted-dim ml-1">ID: {movie.id}</span>
            </div>

            {/* Tab Navigation */}
            <div className="tab-nav mb-6">
                {tabs.map((tab) => (
                    <button
                        key={tab.key}
                        onClick={() => setActiveTab(tab.key)}
                        className={`tab-btn ${activeTab === tab.key ? 'active' : ''}`}
                    >
                        <tab.Icon />
                        {tab.label}
                        {activeTab === tab.key && <span className="tab-indicator" />}
                    </button>
                ))}
            </div>

            {/* Tab Content */}
            <div>
                {activeTab === 'metadata' && <MetadataTab movie={movie} />}
                {activeTab === 'media' && <MediaTab movie={movie} />}
                {activeTab === 'settings' && <SettingsTab movie={movie} />}
            </div>
        </div>
    );
}
