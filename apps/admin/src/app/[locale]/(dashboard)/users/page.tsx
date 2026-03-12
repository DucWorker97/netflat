'use client';

import { useCallback, useEffect, useState } from 'react';
import styles from './users.module.css';
import { api } from '@/lib/api';
import { getPasswordValidationError } from '@/lib/security';

interface User {
    id: string;
    email: string;
    role: 'admin' | 'viewer';
    isActive: boolean;
    disabledReason: string | null;
    createdAt: string;
    lastLoginAt: string | null;
}

interface UsersResponse {
    data: User[];
    meta: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };
}

const USERS_PER_PAGE = 10;

export default function UsersPage() {
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [roleFilter, setRoleFilter] = useState<'all' | 'admin' | 'viewer'>('all');
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalUsers, setTotalUsers] = useState(0);
    const [showModal, setShowModal] = useState(false);
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [formState, setFormState] = useState({
        email: '',
        role: 'viewer' as 'viewer' | 'admin',
        password: '',
    });
    const [formError, setFormError] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);

    const fetchUsers = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const params = new URLSearchParams({
                page: currentPage.toString(),
                limit: USERS_PER_PAGE.toString(),
            });

            if (searchQuery.trim()) params.set('search', searchQuery.trim());
            if (roleFilter !== 'all') params.set('role', roleFilter);

            const res = await api.get<UsersResponse>(`/api/admin/users?${params.toString()}`);
            setUsers(res.data || []);
            setTotalPages(res.meta?.totalPages || 1);
            setTotalUsers(res.meta?.total || 0);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to fetch users');
            setUsers([]);
            setTotalUsers(0);
            setTotalPages(1);
        } finally {
            setLoading(false);
        }
    }, [currentPage, roleFilter, searchQuery]);

    useEffect(() => {
        fetchUsers();
    }, [fetchUsers]);

    const formatDate = (dateString: string | null) => {
        if (!dateString) return 'Never';
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    };

    const getInitials = (email: string) => {
        return email.charAt(0).toUpperCase();
    };

    const openCreate = () => {
        setEditingUser(null);
        setFormState({ email: '', role: 'viewer', password: '' });
        setFormError(null);
        setShowModal(true);
    };

    const openEdit = (user: User) => {
        setEditingUser(user);
        setFormState({ email: user.email, role: user.role, password: '' });
        setFormError(null);
        setShowModal(true);
    };

    const closeModal = () => {
        setShowModal(false);
        setEditingUser(null);
        setFormError(null);
        setSaving(false);
    };

    const handleSave = async () => {
        setFormError(null);

        if (!formState.email.trim()) {
            setFormError('Email is required');
            return;
        }

        const payload = {
            email: formState.email.trim(),
            role: formState.role,
            password: formState.password.trim() || undefined,
        };

        if (!editingUser && !payload.password) {
            setFormError('Password is required for new users');
            return;
        }

        if (payload.password) {
            const passwordError = getPasswordValidationError(payload.password);
            if (passwordError) {
                setFormError(passwordError);
                return;
            }
        }

        if (editingUser) {
            const hasChanges =
                payload.email !== editingUser.email ||
                payload.role !== editingUser.role ||
                !!payload.password;

            if (!hasChanges) {
                setFormError('No changes to save');
                return;
            }
        }

        setSaving(true);
        try {
            if (editingUser) {
                await api.patch(`/api/admin/users/${editingUser.id}`, payload);
            } else {
                await api.post('/api/admin/users', payload);
            }
            closeModal();
            await fetchUsers();
        } catch (err) {
            setFormError(err instanceof Error ? err.message : 'Failed to save user');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (userId: string) => {
        if (!confirm('Delete this user? This will remove all their data.')) return;
        try {
            await api.delete(`/api/admin/users/${userId}`);
            await fetchUsers();
        } catch (err) {
            alert(err instanceof Error ? err.message : 'Failed to delete user');
        }
    };

    const handleToggleActive = async (user: User) => {
        const action = user.isActive ? 'disable' : 'enable';
        if (user.isActive) {
            const reason = prompt('Reason for disabling this account (optional):');
            try {
                await api.patch(`/api/users/${user.id}/disable`, { reason: reason || undefined });
                await fetchUsers();
            } catch (err) {
                alert(err instanceof Error ? err.message : 'Failed to disable user');
            }
        } else {
            try {
                await api.patch(`/api/users/${user.id}/enable`);
                await fetchUsers();
            } catch (err) {
                alert(err instanceof Error ? err.message : 'Failed to enable user');
            }
        }
    };

    const adminCount = users.filter(u => u.role === 'admin').length;
    const viewerCount = users.filter(u => u.role === 'viewer').length;

    return (
        <div className={styles['users-page']}>
            <div className={styles['users-header']}>
                <h1>User Management</h1>
                <button className="btn btn-primary" onClick={openCreate}>
                    + Add User
                </button>
            </div>

            {/* Stats */}
            <div className={styles['users-stats']}>
                <div className={styles['stat-card']}>
                    <div className={styles['stat-value']}>{totalUsers}</div>
                    <div className={styles['stat-label']}>Total Users</div>
                </div>
                <div className={styles['stat-card']}>
                    <div className={styles['stat-value']}>{adminCount}</div>
                    <div className={styles['stat-label']}>Admins</div>
                </div>
                <div className={styles['stat-card']}>
                    <div className={styles['stat-value']}>{viewerCount}</div>
                    <div className={styles['stat-label']}>Viewers</div>
                </div>
            </div>

            {/* Filters */}
            <div className={styles.filters}>
                <input
                    type="text"
                    className={styles['search-input']}
                    placeholder="Search by email..."
                    value={searchQuery}
                    onChange={(e) => {
                        setSearchQuery(e.target.value);
                        setCurrentPage(1);
                    }}
                />
                <select
                    className={styles['role-filter']}
                    value={roleFilter}
                    onChange={(e) => {
                        setRoleFilter(e.target.value as 'all' | 'admin' | 'viewer');
                        setCurrentPage(1);
                    }}
                >
                    <option value="all">All Roles</option>
                    <option value="admin">Admin</option>
                    <option value="viewer">User</option>
                </select>
            </div>

            {error && (
                <div className={styles['error-banner']}>{error}</div>
            )}

            {/* Users Table */}
            <div className={styles['users-table-container']}>
                {loading ? (
                    <div className={styles['loading-container']}>
                        <div className={styles.spinner}></div>
                        <p style={{ marginTop: '1rem' }}>Loading users...</p>
                    </div>
                ) : users.length === 0 ? (
                    <div className={styles['empty-state']}>
                        <div className={styles['empty-state-icon']}>Users</div>
                        <h3>No users found</h3>
                        <p>Try adjusting your filters</p>
                    </div>
                ) : (
                    <>
                        <table className={styles['users-table']}>
                            <thead>
                                <tr>
                                    <th>User</th>
                                    <th>Role</th>
                                    <th>Status</th>
                                    <th>Created</th>
                                    <th>Last Login</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {users.map((user) => (
                                    <tr key={user.id}>
                                        <td>
                                            <div className={styles['user-info']}>
                                                <div className={styles['user-avatar']}>
                                                    {getInitials(user.email)}
                                                </div>
                                                <div className={styles['user-details']}>
                                                    <span className={styles['user-email']}>{user.email}</span>
                                                    <span className={styles['user-id']}>{user.id.slice(0, 8)}...</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td>
                                            <span className={`${styles['role-badge']} ${styles[user.role]}`}>
                                                {user.role === 'viewer' ? 'user' : user.role}
                                            </span>
                                        </td>
                                        <td>
                                            <span
                                                className={`${styles['role-badge']} ${user.isActive ? styles['status-active'] : styles['status-disabled']}`}
                                                title={user.disabledReason || undefined}
                                            >
                                                {user.isActive ? 'Active' : 'Disabled'}
                                            </span>
                                        </td>
                                        <td>
                                            <span className={styles['date-text']}>{formatDate(user.createdAt)}</span>
                                        </td>
                                        <td>
                                            <span className={styles['date-text']}>{formatDate(user.lastLoginAt)}</span>
                                        </td>
                                        <td>
                                            <div className={styles['actions-cell']}>
                                                <button
                                                    className={`${styles['action-btn']} ${styles.primary}`}
                                                    onClick={() => openEdit(user)}
                                                >
                                                    Edit
                                                </button>
                                                <button
                                                    className={`${styles['action-btn']} ${user.isActive ? styles.warning : styles.success}`}
                                                    onClick={() => handleToggleActive(user)}
                                                >
                                                    {user.isActive ? 'Disable' : 'Enable'}
                                                </button>
                                                <button
                                                    className={`${styles['action-btn']} ${styles.danger}`}
                                                    onClick={() => handleDelete(user.id)}
                                                >
                                                    Delete
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>

                        {/* Pagination */}
                        <div className={styles.pagination}>
                            <span className={styles['pagination-info']}>
                                Showing {(currentPage - 1) * USERS_PER_PAGE + 1}-{Math.min(currentPage * USERS_PER_PAGE, totalUsers)} of {totalUsers}
                            </span>
                            <div className={styles['pagination-buttons']}>
                                <button
                                    className={styles['pagination-btn']}
                                    disabled={currentPage === 1}
                                    onClick={() => setCurrentPage(currentPage - 1)}
                                >
                                    Previous
                                </button>
                                <button
                                    className={styles['pagination-btn']}
                                    disabled={currentPage >= totalPages}
                                    onClick={() => setCurrentPage(currentPage + 1)}
                                >
                                    Next
                                </button>
                            </div>
                        </div>
                    </>
                )}
            </div>

            {showModal && (
                <div className={styles.modalOverlay} onClick={closeModal}>
                    <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
                        <h2 className={styles.modalTitle}>
                            {editingUser ? 'Edit User' : 'Add User'}
                        </h2>

                        <div className={styles.formGroup}>
                            <label>Email *</label>
                            <input
                                type="email"
                                className="input"
                                value={formState.email}
                                onChange={(e) => setFormState(prev => ({ ...prev, email: e.target.value }))}
                                placeholder="user@example.com"
                            />
                        </div>

                        <div className={styles.formGroup}>
                            <label>Role</label>
                            <select
                                className="input"
                                value={formState.role}
                                onChange={(e) => setFormState(prev => ({ ...prev, role: e.target.value as 'viewer' | 'admin' }))}
                            >
                                <option value="viewer">User</option>
                                <option value="admin">Admin</option>
                            </select>
                        </div>

                        <div className={styles.formGroup}>
                            <label>{editingUser ? 'Reset Password' : 'Password'}{!editingUser && ' *'}</label>
                            <input
                                type="password"
                                className="input"
                                value={formState.password}
                                onChange={(e) => setFormState(prev => ({ ...prev, password: e.target.value }))}
                                placeholder={
                                    editingUser
                                        ? 'Leave blank to keep current password'
                                        : 'At least 8 characters with letters and numbers'
                                }
                            />
                        </div>

                        {formError && (
                            <div className={styles.formError}>{formError}</div>
                        )}

                        <div className={styles.modalActions}>
                            <button className="btn btn-secondary" onClick={closeModal} disabled={saving}>
                                Cancel
                            </button>
                            <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                                {saving ? 'Saving...' : 'Save'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
