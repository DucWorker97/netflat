'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { useProfile, useUpdateProfile, useChangePassword } from '@/lib/queries';
import { PASSWORD_REQUIREMENTS_HINT, getPasswordValidationError } from '@/lib/security';
import styles from './profile.module.css';

export default function ProfilePage() {
    const { user, isAuthenticated, isLoading: authLoading } = useAuth();
    const router = useRouter();

    const { data: profile, isLoading: profileLoading } = useProfile(isAuthenticated);

    const [displayName, setDisplayName] = useState('');
    const [avatarUrl, setAvatarUrl] = useState('');
    const [profileMsg, setProfileMsg] = useState('');
    const [profileError, setProfileError] = useState('');

    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [passwordMsg, setPasswordMsg] = useState('');
    const [passwordError, setPasswordError] = useState('');

    const updateProfile = useUpdateProfile();
    const changePassword = useChangePassword();

    useEffect(() => {
        if (!authLoading && !isAuthenticated) {
            router.push('/login?redirect=/profile');
        }
    }, [authLoading, isAuthenticated, router]);

    useEffect(() => {
        if (profile) {
            setDisplayName(profile.displayName || '');
            setAvatarUrl(profile.avatarUrl || '');
        }
    }, [profile]);

    if (authLoading || profileLoading) {
        return (
            <div className={styles.container}>
                <div className="loading-spinner"><div className="spinner" /></div>
            </div>
        );
    }

    if (!user) return null;

    const handleProfileSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setProfileMsg('');
        setProfileError('');

        try {
            await updateProfile.mutateAsync({
                displayName: displayName.trim() || undefined,
                avatarUrl: avatarUrl.trim() || undefined,
            });
            setProfileMsg('Profile updated successfully');
        } catch (err) {
            setProfileError(err instanceof Error ? err.message : 'Update failed');
        }
    };

    const handlePasswordSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setPasswordMsg('');
        setPasswordError('');

        const passwordError = getPasswordValidationError(newPassword);
        if (passwordError) {
            setPasswordError(passwordError);
            return;
        }

        if (newPassword !== confirmPassword) {
            setPasswordError('Passwords do not match');
            return;
        }

        try {
            await changePassword.mutateAsync({ currentPassword, newPassword });
            setPasswordMsg('Password changed successfully');
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
        } catch (err) {
            setPasswordError(err instanceof Error ? err.message : 'Change failed');
        }
    };

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <div className={styles.avatar}>
                    {profile?.avatarUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={profile.avatarUrl} alt="Avatar" />
                    ) : (
                        <span>{(profile?.displayName || user.email)[0].toUpperCase()}</span>
                    )}
                </div>
                <div className={styles.headerInfo}>
                    <h1>{profile?.displayName || user.email}</h1>
                    <p>{user.email}</p>
                </div>
            </div>

            {profile?.stats && (
                <div className={styles.section}>
                    <div className={styles.stats}>
                        <div className={styles.statItem}>
                            <div className={styles.statValue}>{profile.stats.favorites}</div>
                            <div className={styles.statLabel}>Favorites</div>
                        </div>
                        <div className={styles.statItem}>
                            <div className={styles.statValue}>{profile.stats.ratings}</div>
                            <div className={styles.statLabel}>Ratings</div>
                        </div>
                    </div>
                </div>
            )}

            <div className={styles.section}>
                <h2 className={styles.sectionTitle}>Profile Information</h2>
                <form onSubmit={handleProfileSubmit}>
                    <div className={styles.field}>
                        <label htmlFor="displayName">Display Name</label>
                        <input
                            id="displayName"
                            type="text"
                            className="input"
                            value={displayName}
                            onChange={(e) => setDisplayName(e.target.value)}
                            placeholder="Your display name"
                            maxLength={100}
                        />
                    </div>
                    <div className={styles.field}>
                        <label htmlFor="avatarUrl">Avatar URL</label>
                        <input
                            id="avatarUrl"
                            type="url"
                            className="input"
                            value={avatarUrl}
                            onChange={(e) => setAvatarUrl(e.target.value)}
                            placeholder="https://example.com/avatar.jpg"
                        />
                    </div>

                    {profileMsg && <p className={styles.successMsg}>{profileMsg}</p>}
                    {profileError && <p className={styles.errorMsg}>{profileError}</p>}

                    <button
                        type="submit"
                        className="btn btn-primary"
                        style={{ marginTop: '1rem' }}
                        disabled={updateProfile.isPending}
                    >
                        {updateProfile.isPending ? 'Saving...' : 'Save Profile'}
                    </button>
                </form>
            </div>

            <div className={styles.section}>
                <h2 className={styles.sectionTitle}>Change Password</h2>
                <form onSubmit={handlePasswordSubmit}>
                    <div className={styles.field}>
                        <label htmlFor="currentPassword">Current Password</label>
                        <input
                            id="currentPassword"
                            type="password"
                            className="input"
                            value={currentPassword}
                            onChange={(e) => setCurrentPassword(e.target.value)}
                            required
                        />
                    </div>
                    <div className={styles.field}>
                        <label htmlFor="newPassword">New Password</label>
                        <input
                            id="newPassword"
                            type="password"
                            className="input"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            required
                            minLength={8}
                        />
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                            {PASSWORD_REQUIREMENTS_HINT}
                        </span>
                    </div>
                    <div className={styles.field}>
                        <label htmlFor="confirmNewPassword">Confirm New Password</label>
                        <input
                            id="confirmNewPassword"
                            type="password"
                            className="input"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            required
                            minLength={8}
                        />
                    </div>

                    {passwordMsg && <p className={styles.successMsg}>{passwordMsg}</p>}
                    {passwordError && <p className={styles.errorMsg}>{passwordError}</p>}

                    <button
                        type="submit"
                        className="btn btn-primary"
                        style={{ marginTop: '1rem' }}
                        disabled={changePassword.isPending}
                    >
                        {changePassword.isPending ? 'Changing...' : 'Change Password'}
                    </button>
                </form>
            </div>
        </div>
    );
}
