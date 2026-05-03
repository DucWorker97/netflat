'use client';

import { useEffect, useState } from 'react';
import styles from './ShareModal.module.css';

interface ShareModalProps {
    movieId: string;
    movieTitle: string;
    posterUrl?: string | null;
    isOpen: boolean;
    onClose: () => void;
}

export function ShareModal({ movieId, movieTitle, posterUrl, isOpen, onClose }: ShareModalProps) {
    const [copied, setCopied] = useState(false);
    const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
    const [qrLoading, setQrLoading] = useState(false);

    const shareUrl = typeof window !== 'undefined'
        ? `${window.location.origin}/movies/${movieId}`
        : '';

    const shareText = `Xem ngay "${movieTitle}" trên Netflat!`;

    useEffect(() => {
        if (!isOpen || !shareUrl) return;
        let active = true;
        setQrLoading(true);
        (async () => {
            try {
                const qrModule = await import('qrcode');
                const toDataURL = qrModule.toDataURL || qrModule.default?.toDataURL;
                if (!toDataURL) {
                    throw new Error('QR generator not available');
                }
                const url = await toDataURL(shareUrl, {
                    width: 200,
                    margin: 1,
                    color: { dark: '#000000', light: '#ffffff' },
                });
                if (active) {
                    setQrDataUrl(url);
                }
            } catch {
                if (active) {
                    setQrDataUrl(null);
                }
            } finally {
                if (active) {
                    setQrLoading(false);
                }
            }
        })();

        return () => {
            active = false;
        };
    }, [shareUrl, isOpen]);

    if (!isOpen) return null;

    const handleCopyLink = async () => {
        try {
            await navigator.clipboard.writeText(shareUrl);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch {
            // Fallback for older browsers
            const input = document.createElement('input');
            input.value = shareUrl;
            document.body.appendChild(input);
            input.select();
            document.execCommand('copy');
            document.body.removeChild(input);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    const shareOptions = [
        {
            name: 'Sao chép liên kết',
            icon: '🔗',
            action: handleCopyLink,
        },
        {
            name: 'Twitter / X',
            icon: '𝕏',
            action: () => {
                window.open(
                    `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`,
                    '_blank'
                );
            },
        },
        {
            name: 'Facebook',
            icon: '📘',
            action: () => {
                window.open(
                    `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`,
                    '_blank'
                );
            },
        },
        {
            name: 'WhatsApp',
            icon: '💬',
            action: () => {
                window.open(
                    `https://wa.me/?text=${encodeURIComponent(shareText + ' ' + shareUrl)}`,
                    '_blank'
                );
            },
        },
        {
            name: 'Telegram',
            icon: '✈️',
            action: () => {
                window.open(
                    `https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareText)}`,
                    '_blank'
                );
            },
        },
        {
            name: 'Email',
            icon: '📧',
            action: () => {
                window.open(
                    `mailto:?subject=${encodeURIComponent(shareText)}&body=${encodeURIComponent(shareUrl)}`,
                    '_blank'
                );
            },
        },
    ];

    return (
        <div className={styles.overlay} onClick={onClose}>
            <div className={styles.modal} onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div className={styles.header}>
                    <h2>Chia sẻ</h2>
                    <button className={styles.closeBtn} onClick={onClose}>×</button>
                </div>

                {/* Movie Preview */}
                <div className={styles.preview}>
                    <div className={styles.poster}>
                        {posterUrl ? (
                            <img src={posterUrl} alt={movieTitle} />
                        ) : (
                            <span>🎬</span>
                        )}
                    </div>
                    <div className={styles.movieInfo}>
                        <h3>{movieTitle}</h3>
                        <p className={styles.url}>{shareUrl}</p>
                    </div>
                </div>

                {/* Share Options */}
                <div className={styles.options}>
                    {shareOptions.map((option, index) => (
                        <button
                            key={index}
                            className={styles.optionBtn}
                            onClick={option.action}
                        >
                            <span className={styles.optionIcon}>{option.icon}</span>
                            <span className={styles.optionName}>
                                {option.name === 'Sao chép liên kết' && copied ? 'Đã sao chép!' : option.name}
                            </span>
                        </button>
                    ))}
                </div>

                {/* QR Code (placeholder) */}
                <div className={styles.qrSection}>
                    <div className={styles.qrCode}>
                        {qrLoading ? (
                            <span>Đang tạo...</span>
                        ) : qrDataUrl ? (
                            <img src={qrDataUrl} alt={`QR code for ${movieTitle}`} />
                        ) : (
                            <span>📱</span>
                        )}
                    </div>
                    <p>Quét mã để mở trên điện thoại</p>
                </div>
            </div>
        </div>
    );
}
