'use client';

import { useState, useRef, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import Image from 'next/image';
import { useLocalePath } from '@/lib/use-locale-path';
import { normalizeMediaUrl } from '@/lib/media-url';
import {
    useMovie,
    usePresignedUrl,
    useUploadComplete,
    useMoviePolling,
} from '@/lib/queries';
import styles from '../../media-center.module.css';

export default function MediaCenterPage() {
    const params = useParams();
    const router = useRouter();
    const { localePath } = useLocalePath();
    const movieId = params.id as string;
    const queryClient = useQueryClient();

    const { data: movie, isLoading } = useMovie(movieId);

    // Polling for encode status
    useMoviePolling(movieId, movie?.encodeStatus === 'processing');

    // -- Video Upload State --
    const [videoFile, setVideoFile] = useState<File | null>(null);
    const [videoProgress, setVideoProgress] = useState(0);
    const [videoStatus, setVideoStatus] = useState<'idle' | 'uploading' | 'processing' | 'ready' | 'failed'>('idle');
    const [videoError, setVideoError] = useState<string | null>(null);
    const videoInputRef = useRef<HTMLInputElement>(null);

    // -- Poster Upload State --
    const [posterFile, setPosterFile] = useState<File | null>(null);
    const [posterProgress, setPosterProgress] = useState(0);
    const [posterStatus, setPosterStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
    const posterInputRef = useRef<HTMLInputElement>(null);

    // Mutations
    const getPresignedUrl = usePresignedUrl();
    const uploadComplete = useUploadComplete();

    // Sync status from DB
    useEffect(() => {
        if (movie?.encodeStatus) {
            // Map DB status to local status if we are not currently uploading
            if (videoStatus !== 'uploading') {
                setVideoStatus(movie.encodeStatus as any);
            }
        }
    }, [movie?.encodeStatus, videoStatus]);

    // -- Handlers --

    const handleVideoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files?.[0]) {
            setVideoFile(e.target.files[0]);
            setVideoStatus('idle');
            setVideoError(null);
        }
    };

    const handlePosterSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files?.[0]) {
            const file = e.target.files[0];
            setPosterFile(file);
            uploadPoster(file);
        }
    };

    const uploadPoster = async (file: File) => {
        try {
            setPosterStatus('uploading');
            setPosterProgress(0);

            const presigned = await getPresignedUrl.mutateAsync({
                movieId,
                fileName: file.name,
                contentType: file.type,
                sizeBytes: file.size,
                fileType: 'thumbnail'
            });

            await performUpload(file, presigned.uploadUrl, setPosterProgress);

            await uploadComplete.mutateAsync({
                movieId,
                objectKey: presigned.objectKey,
                fileType: 'thumbnail'
            });

            setPosterStatus('success');
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
                const percent = (e.loaded / e.total) * 100;
                onProgress(Math.round(percent));
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
                        <div className={styles.cardHeader}>
                            <div className={styles.cardTitle}>
                                <span className="text-2xl mr-2">🎥</span> Main Video
                            </div>
                            <div className={`badge ${videoStatus === 'ready' ? 'badge-success' :
                                videoStatus === 'processing' ? 'badge-warning' :
                                    videoStatus === 'failed' ? 'badge-error' : 'badge-neutral'}`}>
                                {videoStatus.toUpperCase()}
                            </div>
                        </div>

                        {/* Custom CSS Stepper */}
                        <div className={styles.stepper}>
                            <div className={`${styles.stepItem} ${['uploading', 'processing', 'ready'].includes(videoStatus) || (videoStatus === 'idle' && videoProgress > 0) ? styles.completed : styles.active}`}>
                                <div className={styles.stepCircle}>1</div>
                                <div className={styles.stepLabel}>Upload</div>
                            </div>
                            <div className={`${styles.stepItem} ${['processing', 'ready'].includes(videoStatus) ? styles.completed : (videoStatus === 'uploading' ? styles.active : '')}`}>
                                <div className={styles.stepCircle}>2</div>
                                <div className={styles.stepLabel}>Processing</div>
                            </div>
                            <div className={`${styles.stepItem} ${videoStatus === 'ready' ? styles.completed : (videoStatus === 'processing' ? styles.active : '')}`}>
                                <div className={styles.stepCircle}>3</div>
                                <div className={styles.stepLabel}>Ready</div>
                            </div>
                        </div>

                        {videoStatus === 'ready' && (movie as any)?.videoUrl ? (
                            <div className="bg-black rounded-xl overflow-hidden aspect-video relative flex flex-col items-center justify-center border border-gray-800">
                                <span className="text-4xl mb-4">✅</span>
                                <h3 className="text-white font-bold text-xl mb-2">Video Encoded & Ready</h3>
                                <p className="text-gray-400 text-sm mb-6">HLS Streaming is available for all devices</p>
                                <button
                                    onClick={() => setVideoStatus('idle')}
                                    className="btn btn-outline btn-sm"
                                >
                                    Replace Video
                                </button>
                            </div>
                        ) : (
                            <div className="flex-1 flex flex-col justify-center min-h-[300px]">
                                {videoStatus === 'uploading' ? (
                                    <div className="flex flex-col items-center py-10 animation-fade-in w-full max-w-lg mx-auto">
                                        <h3 className="text-2xl font-bold mb-6">Uploading Video...</h3>

                                        <div className={styles.progressContainer}>
                                            <div className={styles.progressLabel}>
                                                <span>Uploading to secure storage</span>
                                                <span>{videoProgress}%</span>
                                            </div>
                                            <div className={styles.progressTrack}>
                                                <div
                                                    className={styles.progressBar}
                                                    style={{ width: `${videoProgress}%` }}
                                                ></div>
                                            </div>
                                            <p className={styles.statusText}>Please keep this tab open until upload completes.</p>
                                        </div>
                                    </div>
                                ) : videoStatus === 'processing' ? (
                                    <div className="text-center py-10 animation-fade-in">
                                        <span className="loading loading-spinner loading-lg text-warning mb-4"></span>
                                        <h3 className="text-xl font-bold mb-2">Processing Video</h3>
                                        <div className="max-w-md mx-auto bg-base-200 p-4 rounded-lg mt-4 text-left font-mono text-sm max-h-32 overflow-y-auto">
                                            <p className="text-success">&gt; Upload complete</p>
                                            <p className="text-warning animate-pulse">&gt; Transcoding to HLS (480p, 720p)...</p>
                                            <p className="text-muted-foreground mt-2">This process runs on the worker server.</p>
                                            <p className="text-muted-foreground">You can safely leave this page now.</p>
                                        </div>
                                    </div>
                                ) : (
                                    <>
                                        {/* HIDDEN INPUT */}
                                        <input
                                            ref={videoInputRef}
                                            type="file"
                                            accept="video/*"
                                            onChange={handleVideoSelect}
                                            style={{ display: 'none' }}
                                        />

                                        <div
                                            className={styles.uploadZone}
                                            onClick={() => videoInputRef.current?.click()}
                                        >
                                            {/* Custom Icon */}
                                            <svg className={styles.uploadIcon} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                                            </svg>
                                            <div>
                                                <p className="text-lg font-bold mb-1 text-white">
                                                    {videoFile ? videoFile.name : 'Click to Upload Video'}
                                                </p>
                                                <p className="text-sm text-gray-500">
                                                    MP4, MKV, MOV (Max 10GB)
                                                </p>
                                            </div>
                                        </div>

                                        {videoFile && (
                                            <div className="mt-6 flex justify-center">
                                                <button
                                                    onClick={startVideoUpload}
                                                    className="btn btn-primary px-8 btn-lg"
                                                >
                                                    Start Upload 🚀
                                                </button>
                                            </div>
                                        )}
                                        {videoError && (
                                            <div role="alert" className="alert alert-error mt-4">
                                                <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                                <span>{videoError}</span>
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* Side Column: Poster & Subtitles */}
                <div className={styles.sideColumn}>
                    {/* Poster Card */}
                    <div className={styles.card}>
                        <div className={styles.cardHeader}>
                            <div className={styles.cardTitle}>🖼️ Poster</div>
                        </div>
                        <div className="flex flex-col items-center gap-4">
                            {/* HIDDEN INPUT */}
                            <input
                                ref={posterInputRef}
                                type="file"
                                accept="image/*"
                                style={{ display: 'none' }}
                                onChange={handlePosterSelect}
                            />

                            <div className="relative w-full aspect-[2/3] bg-base-200 rounded-lg overflow-hidden group border border-dashed border-gray-600 hover:border-primary transition-colors cursor-pointer"
                                onClick={() => posterInputRef.current?.click()}>
                                {normalizeMediaUrl(movie?.posterUrl) || posterProgress > 0 ? (
                                    <Image
                                        src={posterFile ? URL.createObjectURL(posterFile) : (normalizeMediaUrl(movie?.posterUrl) || '')}
                                        alt="Poster"
                                        fill
                                        className="object-cover"
                                    />
                                ) : (
                                    <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                                        <span className="text-2xl mb-2">🖼️</span>
                                        <span>Select Image</span>
                                    </div>
                                )}

                                {/* Overlay */}
                                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                    <span className="btn btn-sm btn-ghost text-white border-white">Change Poster</span>
                                </div>
                            </div>

                            {posterStatus === 'uploading' && (
                                <div className="w-full">
                                    <progress className="progress progress-primary w-full" value={posterProgress} max="100"></progress>
                                    <p className="text-xs text-center mt-1 text-gray-500">Uploading {posterProgress}%</p>
                                </div>
                            )}
                        </div>
                    </div>

                </div>
            </div>

            <div className={styles.actions}>
                <button className="btn btn-ghost" onClick={() => router.push(localePath(`/movies/${movieId}`))}>
                    Cancel
                </button>
                <button className="btn btn-primary px-8" onClick={() => router.push(localePath('/movies'))}>
                    Finish & Return to List
                </button>
            </div>
        </div>
    );
}
