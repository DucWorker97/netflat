'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { useBillingHistory, useCancelSubscription, useMySubscription } from '@/lib/queries';
import styles from './billing.module.css';

function formatMoney(vnd: number, currency: string) {
    return new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency,
        maximumFractionDigits: 0,
    }).format(vnd);
}

function formatDate(value: string) {
    return new Date(value).toLocaleString('vi-VN');
}

function getDaysUntil(value: string) {
    return Math.ceil((new Date(value).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

function getStatusLabel(status: 'active' | 'canceled' | 'expired') {
    if (status === 'active') return 'Đang hoạt động';
    if (status === 'canceled') return 'Đã hủy gia hạn';
    return 'Đã hết hạn';
}

function getVnpayMessage(status: string | null) {
    if (status === 'success') return 'Thanh toan VNPay thanh cong. Goi cuoc da duoc cap nhat.';
    if (status === 'pending') return 'Thanh toan VNPay da ghi nhan. He thong dang cho IPN xac nhan.';
    if (status === 'failed') return 'Thanh toan VNPay khong thanh cong hoac da bi huy.';
    return '';
}

export default function BillingPage() {
    const { isAuthenticated } = useAuth();
    const [page, setPage] = useState(1);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [vnpayStatus, setVnpayStatus] = useState<string | null>(null);
    const subscription = useMySubscription(isAuthenticated);
    const payments = useBillingHistory(page, 20, isAuthenticated);
    const cancelSubscription = useCancelSubscription();
    const vnpayMessage = getVnpayMessage(vnpayStatus);
    const vnpayMessageClassName = vnpayStatus === 'failed' ? styles.error : styles.success;
    const { refetch: refetchSubscription } = subscription;
    const { refetch: refetchPayments } = payments;

    const currentSubscription = subscription.data;
    const daysUntilExpiry = currentSubscription ? getDaysUntil(currentSubscription.endDate) : null;
    const canCancel = Boolean(
        currentSubscription &&
        currentSubscription.plan.name !== 'free' &&
        currentSubscription.autoRenew &&
        daysUntilExpiry !== null &&
        daysUntilExpiry >= 0,
    );

    useEffect(() => {
        setVnpayStatus(new URLSearchParams(window.location.search).get('vnpay'));
    }, []);

    useEffect(() => {
        if (!vnpayStatus || !isAuthenticated) {
            return;
        }

        void refetchSubscription();
        void refetchPayments();
    }, [isAuthenticated, refetchPayments, refetchSubscription, vnpayStatus]);

    const handleCancelSubscription = async () => {
        setMessage('');
        setError('');

        try {
            await cancelSubscription.mutateAsync();
            setMessage('Đã hủy gia hạn. Bạn vẫn dùng được gói hiện tại đến ngày hết hạn.');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Không thể hủy gia hạn gói cước.');
        }
    };

    if (!isAuthenticated) {
        return (
            <div className={styles.container}>
                <p>Bạn cần đăng nhập để xem thông tin thanh toán.</p>
                <Link href="/login?redirect=/profile/billing" className="btn btn-primary">
                    Đăng nhập
                </Link>
            </div>
        );
    }

    if (subscription.isLoading || payments.isLoading) {
        return <div className="loading-spinner"><div className="spinner" /></div>;
    }

    return (
        <div className={styles.container}>
            <section className={styles.headerCard}>
                <div>
                    <h1>Thanh toán và gói cước</h1>
                    <p>Quản lý gói hiện tại và theo dõi lịch sử giao dịch demo.</p>
                </div>
                <Link href="/pricing" className="btn btn-primary">
                    Nâng cấp gói
                </Link>
            </section>

            {message ? <p className={styles.success}>{message}</p> : null}
            {vnpayMessage && !message ? <p className={vnpayMessageClassName}>{vnpayMessage}</p> : null}
            {error ? <p className={styles.error}>{error}</p> : null}

            {currentSubscription &&
                currentSubscription.plan.name !== 'free' &&
                daysUntilExpiry !== null &&
                daysUntilExpiry >= 0 &&
                daysUntilExpiry <= 7 ? (
                    <section className={styles.warningBanner}>
                        <p>
                            Gói {currentSubscription.plan.displayName} còn <strong>{daysUntilExpiry} ngày</strong>.
                        </p>
                        <Link href="/pricing" className="btn btn-secondary">
                            Gia hạn
                        </Link>
                    </section>
                ) : null}

            <section className={styles.subscriptionCard}>
                <h2>Gói hiện tại</h2>
                {currentSubscription ? (
                    <div className={styles.subscriptionInfo}>
                        <div>
                            <p className={styles.planName}>{currentSubscription.plan.displayName}</p>
                            <p className={styles.planMeta}>
                                Trạng thái: <strong>{getStatusLabel(currentSubscription.status)}</strong>
                            </p>
                            <p className={styles.planMeta}>
                                Có hiệu lực đến: <strong>{formatDate(currentSubscription.endDate)}</strong>
                            </p>
                            {currentSubscription.status === 'canceled' ? (
                                <p className={styles.planMeta}>
                                    Gói đã hủy gia hạn và sẽ chuyển về Free khi hết hạn.
                                </p>
                            ) : null}
                            {canCancel ? (
                                <button
                                    type="button"
                                    className="btn btn-secondary"
                                    disabled={cancelSubscription.isPending}
                                    onClick={handleCancelSubscription}
                                >
                                    {cancelSubscription.isPending ? 'Đang hủy...' : 'Hủy gia hạn'}
                                </button>
                            ) : null}
                        </div>
                        <div className={styles.usage}>
                            <p>
                                Đã xem tháng này: {currentSubscription.usage?.moviesWatched ?? 0}/{currentSubscription.plan.maxMoviesPerMonth >= 9999 ? '∞' : currentSubscription.plan.maxMoviesPerMonth}
                            </p>
                            <p>Độ phân giải tối đa: {currentSubscription.plan.maxQualityResolution}</p>
                            <p>Thiết bị đồng thời: {currentSubscription.plan.maxDevices}</p>
                            <p>Tự động gia hạn: {currentSubscription.autoRenew ? 'Bật' : 'Tắt'}</p>
                        </div>
                    </div>
                ) : (
                    <p>Chưa có thông tin gói cước.</p>
                )}
            </section>

            <section className={styles.historyCard}>
                <h2>Lịch sử thanh toán</h2>
                {payments.data && payments.data.data.length > 0 ? (
                    <div className={styles.tableWrap}>
                        <table className={styles.table}>
                            <thead>
                                <tr>
                                    <th>Thời gian</th>
                                    <th>Gói</th>
                                    <th>Số tiền</th>
                                    <th>Phương thức</th>
                                    <th>Trạng thái</th>
                                </tr>
                            </thead>
                            <tbody>
                                {payments.data.data.map((payment) => (
                                    <tr key={payment.id}>
                                        <td>{formatDate(payment.createdAt)}</td>
                                        <td>{payment.subscription?.plan?.displayName ?? '-'}</td>
                                        <td>{formatMoney(payment.amount, payment.currency)}</td>
                                        <td>{payment.paymentMethod}</td>
                                        <td>
                                            <span className={`${styles.status} ${styles[`status_${payment.status}`]}`}>
                                                {payment.status}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {payments.data.meta.totalPages > 1 ? (
                            <div className={styles.pagination}>
                                <button
                                    type="button"
                                    className="btn btn-secondary"
                                    disabled={!payments.data.meta.hasPrev}
                                    onClick={() => setPage((value) => Math.max(1, value - 1))}
                                >
                                    Trước
                                </button>
                                <span>
                                    Trang {payments.data.meta.page} / {payments.data.meta.totalPages}
                                </span>
                                <button
                                    type="button"
                                    className="btn btn-secondary"
                                    disabled={!payments.data.meta.hasNext}
                                    onClick={() => setPage((value) => value + 1)}
                                >
                                    Sau
                                </button>
                            </div>
                        ) : null}
                    </div>
                ) : (
                    <div className={styles.emptyState}>
                        <p>Chưa có giao dịch nào.</p>
                        <Link href="/pricing" className="btn btn-secondary">
                            Chọn gói ngay
                        </Link>
                    </div>
                )}
            </section>
        </div>
    );
}
