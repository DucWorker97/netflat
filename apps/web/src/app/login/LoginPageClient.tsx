'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { PASSWORD_REQUIREMENTS_HINT, getPasswordValidationError } from '@/lib/security';
import styles from './login.module.css';

type AuthMode = 'login' | 'register';

const VIEWER_DEMO_ACCOUNT = {
    email: 'viewer@netflat.local',
    password: 'viewer123',
};

export function LoginPageClient() {
    const { login, register, isLoading } = useAuth();
    const router = useRouter();
    const searchParams = useSearchParams();

    const currentMode: AuthMode = searchParams.get('mode') === 'register' ? 'register' : 'login';
    const redirectTo = searchParams.get('redirect') || '/';

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const switchMode = (mode: AuthMode) => {
        const params = new URLSearchParams(searchParams.toString());
        if (mode === 'login') params.delete('mode');
        else params.set('mode', mode);
        setError('');
        router.replace(`/login${params.toString() ? `?${params}` : ''}`);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (currentMode === 'register') {
            const passwordError = getPasswordValidationError(password);
            if (passwordError) {
                setError(passwordError);
                return;
            }
            if (password !== confirmPassword) {
                setError('Mật khẩu xác nhận không khớp');
                return;
            }
        }

        setIsSubmitting(true);

        try {
            if (currentMode === 'login') {
                await login(email.trim(), password, redirectTo);
            } else {
                await register(email.trim(), password, redirectTo);
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Yêu cầu thất bại');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (isLoading) {
        return (
            <div className={styles.container}>
                <div className="loading-spinner"><div className="spinner" /></div>
            </div>
        );
    }

    return (
        <div className={styles.container}>
            <div className={styles.card}>
                <Link href="/" className={styles.title}>netflat</Link>
                <p className={styles.subtitle}>{currentMode === 'register' ? 'Tạo tài khoản mới' : 'Đăng nhập để xem phim'}</p>

                <div className={styles.modeTabs}>
                    <button
                        type="button"
                        className={`${styles.modeTab} ${currentMode === 'login' ? styles.modeTabActive : ''}`}
                        onClick={() => switchMode('login')}
                    >
                        Đăng nhập
                    </button>
                    <button
                        type="button"
                        className={`${styles.modeTab} ${currentMode === 'register' ? styles.modeTabActive : ''}`}
                        onClick={() => switchMode('register')}
                    >
                        Đăng ký
                    </button>
                </div>

                <form onSubmit={handleSubmit} className={styles.form}>
                    <div className={styles.field}>
                        <label htmlFor="email">Email</label>
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

                    <div className={styles.field}>
                        <label htmlFor="password">Mật khẩu</label>
                        <div className={styles.passwordWrapper}>
                            <input
                                id="password"
                                type={showPassword ? 'text' : 'password'}
                                className="input"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="Nhập mật khẩu"
                                required
                                minLength={currentMode === 'login' ? undefined : 8}
                            />
                            <button
                                type="button"
                                className={styles.showPasswordBtn}
                                onClick={() => setShowPassword((v) => !v)}
                            >
                                {showPassword ? 'Ẩn' : 'Hiện'}
                            </button>
                        </div>
                    </div>

                    {currentMode === 'register' && (
                        <>
                            <p className={styles.helperText}>{PASSWORD_REQUIREMENTS_HINT}</p>
                            <div className={styles.field}>
                                <label htmlFor="confirmPassword">Xác nhận mật khẩu</label>
                                <input
                                    id="confirmPassword"
                                    type={showPassword ? 'text' : 'password'}
                                    className="input"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    placeholder="Nhập lại mật khẩu"
                                    required
                                    minLength={8}
                                />
                            </div>
                        </>
                    )}

                    {error && <p className="error-text">{error}</p>}

                    <button
                        type="submit"
                        className="btn btn-primary"
                        style={{ width: '100%', marginTop: '1rem' }}
                        disabled={isSubmitting}
                    >
                        {isSubmitting
                            ? (currentMode === 'login' ? 'Đang đăng nhập...' : 'Đang tạo tài khoản...')
                            : (currentMode === 'login' ? 'Đăng nhập' : 'Đăng ký')}
                    </button>
                </form>

                {currentMode === 'login' && (
                    <>
                        <p className={styles.accountHint}>
                            Tài khoản xem mẫu: <code>{VIEWER_DEMO_ACCOUNT.email} / {VIEWER_DEMO_ACCOUNT.password}</code>
                        </p>
                        <p className={styles.hint}>
                            <Link href="/forgot-password" className={styles.forgotLink}>Quên mật khẩu?</Link>
                        </p>
                    </>
                )}
            </div>
        </div>
    );
}
