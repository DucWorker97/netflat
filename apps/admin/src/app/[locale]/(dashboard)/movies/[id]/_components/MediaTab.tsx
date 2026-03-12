'use client';

import { useState, useRef, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
    usePresignedUrl,
    useUploadComplete,
    useMoviePolling,
} from '@/lib/queries';

interface MediaTabProps {
    movie: any;
}

/* ── Icons ─────────────────────────────────── */
const FilmIcon = ({ className = '' }: { className?: string }) => (
    <svg className={className} width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
);
const ImageIcon = ({ className = '' }: { className?: string }) => (
    <svg className={className} width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
);

const CloudIcon = () => (
    <svg width="48" height="48" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ color: 'var(--text-muted)' }}><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
);
const CheckIcon = ({ className = '' }: { className?: string }) => (
    <svg className={className} width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
);
const UploadIcon = () => (
    <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
);
const PlayIcon = () => (
    <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
);
const RefreshIcon = () => (
    <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
);
const PlusIcon = () => (
    <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
);
const XIcon = () => (
    <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
);
const AlertIcon = () => (
    <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ color: 'var(--error)' }}><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
);

/* ── Stepper Steps ─────────────────────────── */
const stepperSteps = ['Upload', 'Processing', 'Ready'];

export default function MediaTab({ movie }: MediaTabProps) {
    const queryClient = useQueryClient();
    const movieId = movie.id;

    // Polling for encode status
    useMoviePolling(movieId, movie?.encodeStatus === 'processing' || movie?.encodeStatus === 'pending');

    // -- Video Upload State --
    const [videoFile, setVideoFile] = useState<File | null>(null);
    const [videoProgress, setVideoProgress] = useState(0);
    const [videoStatus, setVideoStatus] = useState<'idle' | 'uploading' | 'processing' | 'ready' | 'failed'>('idle');
    const [videoError, setVideoError] = useState<string | null>(null);
    const videoInputRef = useRef<HTMLInputElement>(null);
    const [dragOver, setDragOver] = useState(false);

    // -- Poster Upload State --
    const [posterFile, setPosterFile] = useState<File | null>(null);
    const [posterPreviewUrl, setPosterPreviewUrl] = useState<string | null>(null);
    const [posterProgress, setPosterProgress] = useState(0);
    const [posterStatus, setPosterStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
    const posterInputRef = useRef<HTMLInputElement>(null);

    // Mutations
    const getPresignedUrl = usePresignedUrl();
    const uploadComplete = useUploadComplete();

    const [showToast, setShowToast] = useState(false);

    // Clean up poster preview blob URL
    useEffect(() => {
        return () => {
            if (posterPreviewUrl && posterPreviewUrl.startsWith('blob:')) {
                URL.revokeObjectURL(posterPreviewUrl);
            }
        };
    }, [posterPreviewUrl]);

    // Sync status from DB
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

    // Prevent accidental tab close during upload
    useEffect(() => {
        const isUploading = videoStatus === 'uploading' || posterStatus === 'uploading';
        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            if (isUploading) {
                e.preventDefault();
                e.returnValue = '';
            }
        };
        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [videoStatus, posterStatus]);

    // -- Handlers --
    const handleVideoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files?.[0]) {
            setVideoFile(e.target.files[0]);
            setVideoStatus('idle');
            setVideoError(null);
        }
    };

    const handleVideoDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setDragOver(false);
        const file = e.dataTransfer.files?.[0];
        if (file) {
            setVideoFile(file);
            setVideoStatus('idle');
            setVideoError(null);
        }
    };

    const handlePosterSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (posterPreviewUrl && posterPreviewUrl.startsWith('blob:')) {
                URL.revokeObjectURL(posterPreviewUrl);
            }
            setPosterFile(file);
            setPosterPreviewUrl(URL.createObjectURL(file));
            setPosterStatus('idle');
        }
        e.target.value = '';
    };

    const handlePosterRemove = () => {
        if (posterPreviewUrl && posterPreviewUrl.startsWith('blob:')) {
            URL.revokeObjectURL(posterPreviewUrl);
        }
        setPosterFile(null);
        setPosterPreviewUrl(null);
        setPosterStatus('idle');
    };

    const startPosterUpload = async () => {
        if (!posterFile) return;
        try {
            setPosterStatus('uploading');
            setPosterProgress(0);
            const presigned = await getPresignedUrl.mutateAsync({
                movieId,
                fileName: posterFile.name,
                contentType: posterFile.type,
                sizeBytes: posterFile.size,
                fileType: 'thumbnail'
            });
            await performUpload(posterFile, presigned.uploadUrl, setPosterProgress);
            await uploadComplete.mutateAsync({
                movieId,
                objectKey: presigned.objectKey,
                fileType: 'thumbnail'
            });
            setPosterStatus('success');
            setPosterFile(null);
            setPosterPreviewUrl(null);
            queryClient.invalidateQueries({ queryKey: ['movie', movieId] });
        } catch (err) {
            console.error(err);
            setPosterStatus('error');
        }
    };

    const startVideoUpload = async () => {
        if (!videoFile) return;
        try {
            setVideoStatus('uploading');
            setVideoProgress(0);
            const presigned = await getPresignedUrl.mutateAsync({
                movieId,
                fileName: videoFile.name,
                contentType: videoFile.type,
                sizeBytes: videoFile.size,
                fileType: 'video'
            });
            await performUpload(videoFile, presigned.uploadUrl, setVideoProgress);
            await uploadComplete.mutateAsync({
                movieId,
                objectKey: presigned.objectKey,
                fileType: 'video'
            });
            setVideoStatus('processing');
            queryClient.invalidateQueries({ queryKey: ['movie', movieId] });
        } catch (err) {
            console.error(err);
            setVideoStatus('failed');
            setVideoError('Upload failed. Please try again.');
        }
    };

    const performUpload = async (file: File, url: string, onProgress: (p: number) => void) => {
        const xhr = new XMLHttpRequest();
        xhr.open('PUT', url);
        xhr.setRequestHeader('Content-Type', file.type);
        xhr.upload.onprogress = (e) => {
            if (e.lengthComputable) {
                onProgress(Math.round((e.loaded / e.total) * 100));
            }
        };
        await new Promise<void>((resolve, reject) => {
            xhr.onload = () => {
                if (xhr.status >= 200 && xhr.status < 300) resolve();
                else reject(new Error('Upload failed'));
            };
            xhr.onerror = () => reject(new Error('Network error'));
            xhr.send(file);
        });
    };

    const formatBytes = (bytes: number) => {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    };

    // Determine stepper progress
    const currentStep = videoStatus === 'idle' || videoStatus === 'failed' ? 0
        : videoStatus === 'uploading' ? 0
        : videoStatus === 'processing' ? 1
        : 2;

    const displayPosterUrl = posterPreviewUrl || movie.posterUrl || null;

    return (
        <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {/* Success Toast */}
            {showToast && (
                <div style={{ position: 'fixed', bottom: '1rem', right: '1rem', zIndex: 50, padding: '1rem 1.5rem', background: 'var(--bg-secondary)', border: '1px solid var(--success)', borderRadius: '12px', boxShadow: '0 0 15px rgba(34,197,94,0.2)' }}>
                    <div className="flex items-center gap-3">
                        <CheckIcon className="section-header-icon" />
                        <div>
                            <p className="font-semibold text-sm text-foreground">Encoding Complete!</p>
                            <p className="text-xs text-muted">Video is ready for playback.</p>
                        </div>
                    </div>
                </div>
            )}

            {/* ═══════ VIDEO SOURCE ═══════ */}
            <div className="glass-card p-6" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <div className="flex items-center gap-2">
                    <FilmIcon className="section-header-icon" />
                    <h3 className="section-title">Video Source</h3>
                </div>

                {/* Stepper */}
                <div className="stepper">
                    {stepperSteps.map((step, i) => {
                        const active = i <= currentStep;
                        return (
                            <div key={step} style={{ display: 'contents' }}>
                                <div className="stepper-step">
                                    <div className={`stepper-dot ${active ? 'active' : ''}`}>
                                        {i === 0 && <UploadIcon />}
                                        {i === 1 && (
                                            videoStatus === 'processing'
                                                ? <span className="spinner spinner-sm" style={{ borderTopColor: '#fff' }}></span>
                                                : <span className="spinner spinner-sm" style={{ border: 'none' }}>⚙</span>
                                        )}
                                        {i === 2 && <CheckIcon />}
                                    </div>
                                    <span className={`stepper-label ${active ? 'active' : ''}`}>{step}</span>
                                </div>
                                {i < stepperSteps.length - 1 && (
                                    <div className="stepper-line">
                                        <div className="stepper-line-fill" style={{ width: i < currentStep ? '100%' : '0%' }} />
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>

                {/* Video states */}
                {videoStatus === 'ready' && (movie.playbackUrl || movie.videoUrl) ? (
                    <div className="glass-card video-ready-card p-5" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <div className="flex items-center gap-3">
                            <CheckIcon className="text-success" />
                            <div>
                                <p className="font-medium text-foreground">Video ready to stream</p>
                                <p className="text-xs text-muted font-mono">{movie.playbackUrl}</p>
                            </div>
                        </div>
                        <div className="flex gap-3">
                            <button onClick={() => window.open(`/watch/${movie.id}`, '_blank')} className="btn btn-secondary" style={{ borderRadius: '8px', gap: '8px' }}>
                                <PlayIcon /> Preview
                            </button>
                            <button onClick={() => { setVideoStatus('idle'); setVideoFile(null); }} className="btn btn-ghost" style={{ borderRadius: '8px', gap: '8px' }}>
                                <RefreshIcon /> Replace
                            </button>
                        </div>
                    </div>
                ) : videoStatus === 'uploading' ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <div className="glass-card p-4 flex items-center gap-4" style={{ background: 'rgba(26,26,37,0.4)' }}>
                            <FilmIcon className="section-header-icon shrink-0" />
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-foreground truncate">{videoFile?.name}</p>
                                <p className="text-xs text-muted">{videoFile ? formatBytes(videoFile.size) : ''}</p>
                            </div>
                            <span className="text-sm font-mono font-semibold" style={{ color: 'var(--accent)' }}>{videoProgress}%</span>
                        </div>
                        <div className="progress-bar">
                            <div className="progress-bar-fill" style={{ width: `${videoProgress}%` }} />
                        </div>
                        <p className="text-xs text-muted text-center">Do not close this tab</p>
                    </div>
                ) : videoStatus === 'processing' ? (
                    <div className="text-center py-8" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
                        <div className="flex justify-center gap-1">
                            {[0, 1, 2].map(i => (
                                <div key={i} className="animate-bounce" style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--accent)', animationDelay: `${i * 0.15}s` }} />
                            ))}
                        </div>
                        <div>
                            <p className="font-medium text-foreground">Encoding in progress...</p>
                            <p className="text-sm text-muted mt-1">Transcoding to HLS adaptive streaming • This may take a few minutes</p>
                        </div>
                    </div>
                ) : videoStatus === 'failed' ? (
                    <div className="glass-card danger-card p-5" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <div className="flex items-center gap-3">
                            <AlertIcon />
                            <div>
                                <p className="font-medium text-foreground">Upload failed</p>
                                <p className="text-xs text-muted">{videoError || 'Network error. Please try again.'}</p>
                            </div>
                        </div>
                        <button onClick={() => setVideoStatus('idle')} className="gradient-btn" style={{ padding: '8px 16px', borderRadius: '8px', fontSize: '0.875rem', fontWeight: 500, width: 'fit-content' }}>
                            Try Again
                        </button>
                    </div>
                ) : videoFile ? (
                    <div className="glass-card p-4 flex items-center gap-3" style={{ background: 'rgba(26,26,37,0.4)' }}>
                        <div style={{ width: 40, height: 40, borderRadius: 8, background: 'rgba(124,58,237,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }} className="shrink-0">
                            <FilmIcon className="section-header-icon" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">{videoFile.name}</p>
                            <p className="text-xs text-muted mt-1">{formatBytes(videoFile.size)} · {videoFile.type || 'video/mp4'}</p>
                        </div>
                        <div className="flex gap-2 shrink-0">
                            <button onClick={startVideoUpload} className="gradient-btn" style={{ padding: '6px 14px', borderRadius: '8px', fontSize: '0.8125rem', fontWeight: 500 }}>Upload</button>
                            <button onClick={() => setVideoFile(null)} className="btn btn-ghost text-error" style={{ padding: '6px 14px', borderRadius: '8px', fontSize: '0.8125rem' }}>Remove</button>
                        </div>
                    </div>
                ) : (
                    <>
                        <input ref={videoInputRef} type="file" accept="video/*" onChange={handleVideoSelect} className="hidden" />
                        <div
                            onClick={() => videoInputRef.current?.click()}
                            onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                            onDragLeave={() => setDragOver(false)}
                            onDrop={handleVideoDrop}
                            className={`drop-zone ${dragOver ? 'dragover' : ''}`}
                        >
                            <CloudIcon />
                            <p className="font-medium text-foreground mb-1" style={{ marginTop: '1rem' }}>Drop your video file here</p>
                            <p className="text-sm text-muted">or click to browse • MP4, MKV, AVI up to 10GB</p>
                        </div>
                    </>
                )}
            </div>

            {/* ═══════ POSTER ═══════ */}
            <div className="glass-card p-6" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div className="flex items-center gap-2">
                    <ImageIcon className="section-header-icon" />
                    <h3 className="section-title">Poster</h3>
                </div>

                <input ref={posterInputRef} type="file" accept="image/*" onChange={handlePosterSelect} className="hidden" />

                {displayPosterUrl ? (
                    <div>
                        <div className="poster-container relative rounded-xl overflow-hidden aspect-poster" style={{ background: 'var(--bg-tertiary)' }}>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={displayPosterUrl} alt="Poster" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            <div className="poster-overlay">
                                <button onClick={() => posterInputRef.current?.click()} className="gradient-btn" style={{ padding: '8px 16px', borderRadius: '8px', fontSize: '0.875rem', fontWeight: 500 }}>
                                    Replace
                                </button>
                            </div>
                        </div>
                        {posterFile && (
                            <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                <p className="text-sm font-medium text-foreground truncate">{posterFile.name}</p>
                                <p className="text-xs text-muted">{formatBytes(posterFile.size)}</p>
                                {posterStatus === 'uploading' ? (
                                    <div className="progress-bar" style={{ height: 6 }}>
                                        <div className="progress-bar-fill" style={{ width: `${posterProgress}%` }} />
                                    </div>
                                ) : (
                                    <div className="flex gap-2">
                                        <button className="gradient-btn" style={{ padding: '6px 14px', borderRadius: '8px', fontSize: '0.8125rem', fontWeight: 500 }} onClick={startPosterUpload}>Upload</button>
                                        <button className="btn btn-ghost text-error" style={{ padding: '6px 14px', borderRadius: '8px', fontSize: '0.8125rem' }} onClick={handlePosterRemove}>Remove</button>
                                    </div>
                                )}
                                {posterStatus === 'error' && <p className="text-xs text-error">Upload failed. Try again.</p>}
                            </div>
                        )}
                    </div>
                ) : (
                    <div onClick={() => posterInputRef.current?.click()} className="drop-zone drop-zone-sm" style={{ aspectRatio: '2/3', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                        <ImageIcon className="text-muted-dim" />
                        <p className="text-sm text-muted" style={{ marginTop: '8px' }}>Click to upload poster</p>
                        <p className="text-xs text-muted-dim mt-1">JPG, PNG · 2:3 ratio</p>
                    </div>
                )}
            </div>
        </div>
    );
}
