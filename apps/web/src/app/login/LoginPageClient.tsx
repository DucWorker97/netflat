'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { PASSWORD_REQUIREMENTS_HINT, getPasswordValidationError } from '@/lib/security';
import styles from './login.module.css';

type AuthMode = 'login' | 'register';

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
                setError('Passwords do not match');
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
            setError(err instanceof Error ? err.message : 'Request failed');
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
                <p className={styles.subtitle}>{currentMode === 'register' ? 'Create your account' : 'Sign in to watch'}</p>

                <div className={styles.modeTabs}>
                    <button
                        type="button"
                        className={`${styles.modeTab} ${currentMode === 'login' ? styles.modeTabActive : ''}`}
                        onClick={() => switchMode('login')}
                    >
                        Sign In
                    </button>
                    <button
                        type="button"
                        className={`${styles.modeTab} ${currentMode === 'register' ? styles.modeTabActive : ''}`}
                        onClick={() => switchMode('register')}
                    >
                        Register
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
                        <label htmlFor="password">Password</label>
                        <div className={styles.passwordWrapper}>
                            <input
                                id="password"
                                type={showPassword ? 'text' : 'password'}
                                className="input"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="Enter your password"
                                required
                                minLength={currentMode === 'login' ? undefined : 8}
                            />
                            <button
                                type="button"
                                className={styles.showPasswordBtn}
                                onClick={() => setShowPassword((v) => !v)}
                            >
                                {showPassword ? 'Hide' : 'Show'}
                            </button>
                        </div>
                    </div>

                    {currentMode === 'register' && (
                        <>
                            <p className={styles.helperText}>{PASSWORD_REQUIREMENTS_HINT}</p>
                            <div className={styles.field}>
                                <label htmlFor="confirmPassword">Confirm password</label>
                                <input
                                    id="confirmPassword"
                                    type={showPassword ? 'text' : 'password'}
                                    className="input"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    placeholder="Enter your password again"
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
                            ? (currentMode === 'login' ? 'Signing in...' : 'Creating account...')
                            : (currentMode === 'login' ? 'Sign In' : 'Register')}
                    </button>
                </form>

                {currentMode === 'login' && (
                    <p className={styles.hint}>
                        <Link href="/forgot-password" className={styles.forgotLink}>Forgot your password?</Link>
                    </p>
                )}
            </div>
        </div>
    );
}
