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
            setError(err instanceof Error ? err.message : 'Không thể tải danh sách người dùng');
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
        if (!dateString) return 'Chưa từng';
        return new Date(dateString).toLocaleDateString('vi-VN', {
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
            setFormError('Email là bắt buộc');
            return;
        }

        const payload = {
            email: formState.email.trim(),
            role: formState.role,
            password: formState.password.trim() || undefined,
        };

        if (!editingUser && !payload.password) {
            setFormError('Mật khẩu là bắt buộc khi tạo người dùng mới');
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
                setFormError('Không có thay đổi để lưu');
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
            setFormError(err instanceof Error ? err.message : 'Không thể lưu người dùng');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (userId: string) => {
        if (!confirm('Xóa người dùng này? Thao tác này sẽ xóa toàn bộ dữ liệu của họ.')) return;
        try {
            await api.delete(`/api/admin/users/${userId}`);
            await fetchUsers();
        } catch (err) {
            alert(err instanceof Error ? err.message : 'Không thể xóa người dùng');
        }
    };

    const handleToggleActive = async (user: User) => {
        if (user.isActive) {
            const reason = prompt('Lý do vô hiệu hóa tài khoản này (không bắt buộc):');
            try {
                await api.patch(`/api/users/${user.id}/disable`, { reason: reason || undefined });
                await fetchUsers();
            } catch (err) {
                alert(err instanceof Error ? err.message : 'Không thể vô hiệu hóa người dùng');
            }
        } else {
            try {
                await api.patch(`/api/users/${user.id}/enable`);
                await fetchUsers();
            } catch (err) {
                alert(err instanceof Error ? err.message : 'Không thể kích hoạt người dùng');
            }
        }
    };

    const adminCount = users.filter(u => u.role === 'admin').length;
    const viewerCount = users.filter(u => u.role === 'viewer').length;

    return (
        <div className={styles['users-page']}>
            <div className={styles['users-header']}>
                <h1>Quản lý người dùng</h1>
                <button className="btn btn-primary" onClick={openCreate}>
                    + Thêm người dùng
                </button>
            </div>

            {/* Stats */}
            <div className={styles['users-stats']}>
                <div className={styles['stat-card']}>
                    <div className={styles['stat-value']}>{totalUsers}</div>
                    <div className={styles['stat-label']}>Tổng người dùng</div>
                </div>
                <div className={styles['stat-card']}>
                    <div className={styles['stat-value']}>{adminCount}</div>
                    <div className={styles['stat-label']}>Quản trị viên</div>
                </div>
                <div className={styles['stat-card']}>
                    <div className={styles['stat-value']}>{viewerCount}</div>
                    <div className={styles['stat-label']}>Người dùng</div>
                </div>
            </div>

            {/* Filters */}
            <div className={styles.filters}>
                <input
                    type="text"
                    className={styles['search-input']}
                    placeholder="Tìm theo email..."
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
                    <option value="all">Tất cả vai trò</option>
                    <option value="admin">Quản trị viên</option>
                    <option value="viewer">Người dùng</option>
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
                        <p style={{ marginTop: '1rem' }}>Đang tải người dùng...</p>
                    </div>
                ) : users.length === 0 ? (
                    <div className={styles['empty-state']}>
                        <div className={styles['empty-state-icon']}>Người dùng</div>
                        <h3>Không tìm thấy người dùng</h3>
                        <p>Hãy thử điều chỉnh bộ lọc</p>
                    </div>
                ) : (
                    <>
                        <table className={styles['users-table']}>
                            <thead>
                                <tr>
                                    <th>Người dùng</th>
                                    <th>Vai trò</th>
                                    <th>Trạng thái</th>
                                    <th>Ngày tạo</th>
                                    <th>Đăng nhập gần nhất</th>
                                    <th>Thao tác</th>
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
                                                {user.role === 'viewer' ? 'người dùng' : 'quản trị viên'}
                                            </span>
                                        </td>
                                        <td>
                                            <span
                                                className={`${styles['role-badge']} ${user.isActive ? styles['status-active'] : styles['status-disabled']}`}
                                                title={user.disabledReason || undefined}
                                            >
                                                {user.isActive ? 'Đang hoạt động' : 'Đã vô hiệu hóa'}
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
                                                    Sửa
                                                </button>
                                                <button
                                                    className={`${styles['action-btn']} ${user.isActive ? styles.warning : styles.success}`}
                                                    onClick={() => handleToggleActive(user)}
                                                >
                                                    {user.isActive ? 'Vô hiệu hóa' : 'Kích hoạt'}
                                                </button>
                                                <button
                                                    className={`${styles['action-btn']} ${styles.danger}`}
                                                    onClick={() => handleDelete(user.id)}
                                                >
                                                    Xóa
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
                                Hiển thị {(currentPage - 1) * USERS_PER_PAGE + 1}-{Math.min(currentPage * USERS_PER_PAGE, totalUsers)} trên tổng {totalUsers}
                            </span>
                            <div className={styles['pagination-buttons']}>
                                <button
                                    className={styles['pagination-btn']}
                                    disabled={currentPage === 1}
                                    onClick={() => setCurrentPage(currentPage - 1)}
                                >
                                    Trước
                                </button>
                                <button
                                    className={styles['pagination-btn']}
                                    disabled={currentPage >= totalPages}
                                    onClick={() => setCurrentPage(currentPage + 1)}
                                >
                                    Sau
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
                            {editingUser ? 'Chỉnh sửa người dùng' : 'Thêm người dùng'}
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
                            <label>Vai trò</label>
                            <select
                                className="input"
                                value={formState.role}
                                onChange={(e) => setFormState(prev => ({ ...prev, role: e.target.value as 'viewer' | 'admin' }))}
                            >
                                <option value="viewer">Người dùng</option>
                                <option value="admin">Quản trị viên</option>
                            </select>
                        </div>

                        <div className={styles.formGroup}>
                            <label>{editingUser ? 'Đặt lại mật khẩu' : 'Mật khẩu'}{!editingUser && ' *'}</label>
                            <input
                                type="password"
                                className="input"
                                value={formState.password}
                                onChange={(e) => setFormState(prev => ({ ...prev, password: e.target.value }))}
                                placeholder={
                                    editingUser
                                        ? 'Để trống nếu muốn giữ mật khẩu hiện tại'
                                        : 'Ít nhất 8 ký tự gồm chữ và số'
                                }
                            />
                        </div>

                        {formError && (
                            <div className={styles.formError}>{formError}</div>
                        )}

                        <div className={styles.modalActions}>
                            <button className="btn btn-secondary" onClick={closeModal} disabled={saving}>
                                Hủy
                            </button>
                            <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                                {saving ? 'Đang lưu...' : 'Lưu'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
