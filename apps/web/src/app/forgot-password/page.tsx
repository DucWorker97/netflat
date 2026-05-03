'use client';

import Link from 'next/link';
import { useState } from 'react';
import { api } from '@/lib/api';
import styles from '../login/login.module.css';

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [sent, setSent] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsSubmitting(true);

        try {
            await api.post('/api/auth/forgot-password', { email: email.trim() });
            setSent(true);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Yêu cầu thất bại');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className={styles.container}>
            <div className={styles.card}>
                <Link href="/" className={styles.title}>netflat</Link>
                <p className={styles.subtitle}>Khôi phục mật khẩu</p>

                {sent ? (
                    <div>
                        <p style={{ color: 'var(--success)', textAlign: 'center', marginBottom: '1rem' }}>
                            Nếu email tồn tại, chúng tôi đã gửi liên kết đặt lại mật khẩu.
                        </p>
                        <Link
                            href="/login"
                            className="btn btn-primary"
                            style={{ display: 'block', textAlign: 'center', width: '100%' }}
                        >
                            Quay lại đăng nhập
                        </Link>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className={styles.form}>
                        <div className={styles.field}>
                            <label htmlFor="email">Địa chỉ email</label>
                            <input
                                id="email"
                                type="email"
                                className="input"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="your@email.com"
                                required
                            />
                        </div>

                        {error && <p className="error-text">{error}</p>}

                        <button
                            type="submit"
                            className="btn btn-primary"
                            style={{ width: '100%', marginTop: '0.5rem' }}
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? 'Đang gửi...' : 'Gửi liên kết khôi phục'}
                        </button>

                        <p style={{ textAlign: 'center', marginTop: '1rem' }}>
                            <Link href="/login" style={{ color: 'var(--accent)', fontSize: '0.875rem' }}>
                                Quay lại đăng nhập
                            </Link>
                        </p>
                    </form>
                )}
            </div>
        </div>
    );
}
