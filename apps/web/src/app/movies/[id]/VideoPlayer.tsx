'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import Hls from 'hls.js';
import { SkipIntro } from '@/components/SkipIntro';
import { SpeedControls } from '@/components/SpeedControls';
import { QualitySelector, type QualityOption, type QualityValue } from '@/components/QualitySelector';
import { useUpdateProgress } from '@/lib/queries';
import styles from './movie.module.css';

interface VideoPlayerProps {
    src: string;
    movieId: string;
    poster?: string;
    qualityOptions?: { name: string; url: string }[];
}

export function VideoPlayer({ src, movieId, poster, qualityOptions }: VideoPlayerProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const videoRef = useRef<HTMLVideoElement>(null);
    const hlsRef = useRef<Hls | null>(null);

    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [volume, setVolume] = useState(1);
    const [isMuted, setIsMuted] = useState(false);
    const [screenState, setScreenState] = useState<'normal' | 'fullscreen'>('normal');
    const [showControls, setShowControls] = useState(true);
    const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    const [speed, setSpeed] = useState(1);
    const [qualityMenu, setQualityMenu] = useState<QualityOption[]>([
        { label: 'Auto', value: 'auto', hint: 'Adaptive' },
    ]);
    const [selectedQuality, setSelectedQuality] = useState<QualityValue>('auto');
    const [isHlsSupported, setIsHlsSupported] = useState(false);

    // Watch progress saving
    const updateProgress = useUpdateProgress();
    const lastSavedRef = useRef(0);

    const saveProgress = useCallback(() => {
        const video = videoRef.current;
        if (!video || !movieId || video.duration < 1) return;
        const now = Date.now();
        // Throttle to once every 10 seconds
        if (now - lastSavedRef.current < 10_000) return;
        lastSavedRef.current = now;
        updateProgress.mutate({
            movieId,
            progressSeconds: Math.floor(video.currentTime),
            durationSeconds: Math.floor(video.duration),
        });
    }, [movieId, updateProgress]);

    // HLS & Video Setup
    useEffect(() => {
        const video = videoRef.current;
        if (!video || !src) return;

        if (Hls.isSupported()) {
            const hls = new Hls({
                enableWorker: true,
                lowLatencyMode: false,
                startLevel: -1,
                autoStartLoad: true,
                capLevelToPlayerSize: false,
            });
            hlsRef.current = hls;
            hls.loadSource(src);
            hls.attachMedia(video);
            setIsHlsSupported(true);

            hls.on(Hls.Events.MANIFEST_PARSED, () => {
                const levels = hls.levels || [];
                if (levels.length === 0) return;

                // Sort levels by height (ascending) for a clean quality menu
                const sortedLevels = levels
                    .map((level, originalIndex) => ({ level, originalIndex }))
                    .sort((a, b) => (a.level.height || 0) - (b.level.height || 0));

                const options: QualityOption[] = sortedLevels.map(({ level, originalIndex }) => {
                    const height = level.height;
                    const bitrateKbps = Math.round(level.bitrate / 1000);
                    let label: string;
                    if (height) {
                        label = `${height}p`;
                    } else {
                        label = `${bitrateKbps} kbps`;
                    }
                    return {
                        label,
                        value: originalIndex,
                        hint: height ? `${bitrateKbps} kbps` : undefined,
                    };
                });

                setQualityMenu([
                    { label: 'Auto', value: 'auto', hint: 'Adaptive' },
                    ...options,
                ]);
            });

            // Listen for actual level switches to update UI
            hls.on(Hls.Events.LEVEL_SWITCHED, (_event, data) => {
                const level = hls.levels[data.level];
                if (level && selectedQuality === 'auto') {
                    // Could update a "current quality" indicator here
                }
            });

            hls.on(Hls.Events.ERROR, (_event, data) => {
                if (data.fatal) {
                    switch (data.type) {
                        case Hls.ErrorTypes.NETWORK_ERROR:
                            console.warn('[HLS] Network error, attempting recovery...');
                            hls.startLoad();
                            break;
                        case Hls.ErrorTypes.MEDIA_ERROR:
                            console.warn('[HLS] Media error, attempting recovery...');
                            hls.recoverMediaError();
                            break;
                        default:
                            console.error('[HLS] Fatal error, destroying...');
                            hls.destroy();
                            break;
                    }
                }
            });
        } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
            video.src = src;
            setIsHlsSupported(false);
        }

        video.playbackRate = speed;

        return () => {
            if (hlsRef.current) {
                hlsRef.current.destroy();
            }
        };
    }, [src]);

    // Cleanup quality options if HLS not supported
    useEffect(() => {
        if (!isHlsSupported) {
            const options: QualityOption[] = [
                { label: 'Auto', value: 'auto', hint: 'Adaptive' },
                ...(qualityOptions || []).map((option) => ({
                    label: option.name,
                    value: option.url,
                    hint: 'Fixed',
                })),
            ];
            setQualityMenu(options);
        }
    }, [qualityOptions, isHlsSupported]);

    // Progress Tracking
    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;

        const handleTimeUpdate = () => {
            setCurrentTime(video.currentTime);
            setDuration(video.duration || 0);
            saveProgress();
        };

        const handlePause = () => { setIsPlaying(false); saveProgress(); };
        const handlePlay = () => setIsPlaying(true);
        const handleEnded = () => {
            setIsPlaying(false);
            // Force save on end
            lastSavedRef.current = 0;
            saveProgress();
        };

        video.addEventListener('timeupdate', handleTimeUpdate);
        video.addEventListener('pause', handlePause);
        video.addEventListener('play', handlePlay);
        video.addEventListener('ended', handleEnded);

        return () => {
            video.removeEventListener('timeupdate', handleTimeUpdate);
            video.removeEventListener('pause', handlePause);
            video.removeEventListener('play', handlePlay);
            video.removeEventListener('ended', handleEnded);
        };
    }, []);

    // Fullscreen Change Listener
    useEffect(() => {
        const handleFullscreenChange = () => {
            setScreenState(document.fullscreenElement ? 'fullscreen' : 'normal');
        };
        document.addEventListener('fullscreenchange', handleFullscreenChange);
        return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
    }, []);

    // Controls Visibility
    const handleMouseMove = () => {
        setShowControls(true);
        if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
        controlsTimeoutRef.current = setTimeout(() => {
            if (isPlaying) setShowControls(false);
        }, 3000);
    };

    const togglePlay = () => {
        const video = videoRef.current;
        if (!video) return;
        if (video.paused) {
            video.play();
        } else {
            video.pause();
        }
    };

    const toggleMute = () => {
        const video = videoRef.current;
        if (!video) return;
        video.muted = !isMuted;
        setIsMuted(!isMuted);
        if (!isMuted) setVolume(0);
        else setVolume(1);
    };

    const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newVolume = parseFloat(e.target.value);
        setVolume(newVolume);
        if (videoRef.current) {
            videoRef.current.volume = newVolume;
            videoRef.current.muted = newVolume === 0;
            setIsMuted(newVolume === 0);
        }
    };

    const toggleFullscreen = () => {
        if (!document.fullscreenElement) {
            containerRef.current?.requestFullscreen();
        } else {
            document.exitFullscreen();
        }
    };

    const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
        const time = parseFloat(e.target.value);
        if (videoRef.current) {
            videoRef.current.currentTime = time;
            setCurrentTime(time);
        }
    };

    // Helper functions
    const formatTime = (time: number) => {
        if (isNaN(time)) return '0:00';
        const minutes = Math.floor(time / 60);
        const seconds = Math.floor(time % 60);
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    };

    const handleSpeedChange = (newSpeed: number) => {
        setSpeed(newSpeed);
        if (videoRef.current) videoRef.current.playbackRate = newSpeed;
    };

    const switchSource = (nextSrc: string) => {
        const video = videoRef.current;
        if (!video || !nextSrc) return;
        const wasPlaying = !video.paused;
        const resumeTime = video.currentTime;
        video.src = nextSrc;
        video.load();
        video.addEventListener('loadedmetadata', () => {
            if (!Number.isNaN(resumeTime)) video.currentTime = resumeTime;
            video.playbackRate = speed;
            if (wasPlaying) video.play().catch(() => undefined);
        }, { once: true });
    };

    const handleQualityChange = (value: QualityValue) => {
        setSelectedQuality(value);
        if (hlsRef.current) {
            const hls = hlsRef.current;
            const video = videoRef.current;
            const newLevel = value === 'auto' ? -1 : Number(value);

            if (value === 'auto') {
                // Let ABR algorithm choose
                hls.currentLevel = -1;
            } else {
                // Use nextLevel for smooth transition (switches at next segment boundary)
                hls.nextLevel = newLevel;
            }

            // Safety: if video stalls after switch, recover automatically
            if (video) {
                const stallCheck = setTimeout(() => {
                    if (video.paused && !video.ended && video.readyState < 3) {
                        hls.recoverMediaError();
                    }
                }, 3000);

                const onPlaying = () => {
                    clearTimeout(stallCheck);
                    video.removeEventListener('playing', onPlaying);
                };
                video.addEventListener('playing', onPlaying, { once: true });
            }
            return;
        }
        const option = qualityMenu.find((item) => item.value === value);
        if (option && typeof option.value === 'string' && option.value !== 'auto') {
            switchSource(option.value);
        } else {
            switchSource(src);
        }
    };

    return (
        <div
            ref={containerRef}
            className={styles.videoContainer}
            onMouseMove={handleMouseMove}
            onMouseLeave={() => isPlaying && setShowControls(false)}
            style={{ position: 'relative', width: '100%', height: '100%', background: '#000', overflow: 'hidden' }}
        >
            <video
                ref={videoRef}
                className={styles.video}
                poster={poster}
                playsInline
                crossOrigin="anonymous"
                onClick={togglePlay}
                style={{ width: '100%', height: '100%', cursor: 'pointer' }}
            />

            {/* Skip Intro Button */}
            <SkipIntro
                currentTime={currentTime}
                onSkip={(t) => videoRef.current && (videoRef.current.currentTime = t)}
                introStart={30}
                introEnd={85}
                autoSkip={false}
            />

            {/* Bottom Control Bar */}
            <div
                style={{
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    background: 'linear-gradient(to top, rgba(0,0,0,0.8), transparent)',
                    padding: '20px',
                    opacity: showControls ? 1 : 0,
                    transition: 'opacity 0.3s ease',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px'
                }}
            >
                {/* Progress Bar */}
                <input
                    type="range"
                    min={0}
                    max={duration || 100}
                    value={currentTime}
                    onChange={handleSeek}
                    style={{
                        width: '100%',
                        cursor: 'pointer',
                        accentColor: '#3b82f6',
                        height: '4px'
                    }}
                />

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: 'white' }}>

                    {/* Left Controls: Play, Volume, Time */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                        <button onClick={togglePlay} className={styles.controlBtn} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer' }}>
                            {isPlaying ? (
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16" /><rect x="14" y="4" width="4" height="16" /></svg>
                            ) : (
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
                            )}
                        </button>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <button onClick={toggleMute} className={styles.controlBtn} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer' }}>
                                {isMuted ? (
                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><line x1="23" y1="9" x2="17" y2="15"></line><line x1="17" y1="9" x2="23" y2="15"></line></svg>
                                ) : (
                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" /></svg>
                                )}
                            </button>
                            <input
                                type="range"
                                min={0}
                                max={1}
                                step={0.1}
                                value={volume}
                                onChange={handleVolumeChange}
                                style={{ width: '80px', accentColor: 'white', cursor: 'pointer' }}
                            />
                        </div>

                        <span style={{ fontSize: '14px', fontWeight: 500 }}>
                            {formatTime(currentTime)} / {formatTime(duration)}
                        </span>
                    </div>

                    {/* Right Controls: Speed, Quality, Captions, Fullscreen */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                        <SpeedControls currentSpeed={speed} onSpeedChange={handleSpeedChange} />

                        <QualitySelector
                            options={qualityMenu}
                            selected={selectedQuality}
                            onChange={handleQualityChange}
                            disabled={qualityMenu.length <= 1}
                        />

                        <button onClick={toggleFullscreen} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer' }}>
                            {screenState === 'fullscreen' ? (
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3" /></svg>
                            ) : (
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" /></svg>
                            )}
                        </button>
                    </div>
                </div>
            </div>

        </div>
    );
}
