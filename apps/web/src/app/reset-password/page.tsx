'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';
import { api } from '@/lib/api';
import { PASSWORD_REQUIREMENTS_HINT, getPasswordValidationError } from '@/lib/security';
import styles from '../login/login.module.css';

function ResetPasswordForm() {
    const searchParams = useSearchParams();
    const token = searchParams.get('token') || '';

    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        const passwordError = getPasswordValidationError(password);
        if (passwordError) {
            setError(passwordError);
            return;
        }

        if (password !== confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        setIsSubmitting(true);

        try {
            await api.post('/api/auth/reset-password', { token, newPassword: password });
            setSuccess(true);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Request failed');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!token) {
        return (
            <div className={styles.container}>
                <div className={styles.card}>
                    <Link href="/" className={styles.title}>netflat</Link>
                    <p style={{ textAlign: 'center', color: 'var(--danger)' }}>
                        Invalid reset link. Please request a new one.
                    </p>
                    <Link
                        href="/forgot-password"
                        className="btn btn-primary"
                        style={{ display: 'block', textAlign: 'center', width: '100%', marginTop: '1rem' }}
                    >
                        Request New Link
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className={styles.container}>
            <div className={styles.card}>
                <Link href="/" className={styles.title}>netflat</Link>
                <p className={styles.subtitle}>Set your new password</p>

                {success ? (
                    <div>
                        <p style={{ color: 'var(--success)', textAlign: 'center', marginBottom: '1rem' }}>
                            Password reset successfully!
                        </p>
                        <Link
                            href="/login"
                            className="btn btn-primary"
                            style={{ display: 'block', textAlign: 'center', width: '100%' }}
                        >
                            Sign In
                        </Link>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className={styles.form}>
                        <div className={styles.field}>
                            <label htmlFor="password">New Password</label>
                            <div className={styles.passwordWrapper}>
                                <input
                                    id="password"
                                    type={showPassword ? 'text' : 'password'}
                                    className="input"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="Enter new password"
                                    required
                                    minLength={8}
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

                        <p className={styles.helperText}>{PASSWORD_REQUIREMENTS_HINT}</p>

                        <div className={styles.field}>
                            <label htmlFor="confirmPassword">Confirm Password</label>
                            <input
                                id="confirmPassword"
                                type={showPassword ? 'text' : 'password'}
                                className="input"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                placeholder="Enter password again"
                                required
                                minLength={8}
                            />
                        </div>

                        {error && <p className="error-text">{error}</p>}

                        <button
                            type="submit"
                            className="btn btn-primary"
                            style={{ width: '100%', marginTop: '0.5rem' }}
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? 'Resetting...' : 'Reset Password'}
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
}

export default function ResetPasswordPage() {
    return (
        <Suspense fallback={<div className={styles.container}><div className="loading-spinner"><div className="spinner" /></div></div>}>
            <ResetPasswordForm />
        </Suspense>
    );
}
