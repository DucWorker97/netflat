'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import {
    useCompleteMockPayment,
    useCreateCheckout,
    useMySubscription,
    useSubscriptionPlans,
    useUpgradeSubscription,
} from '@/lib/queries';
import styles from './pricing.module.css';

function formatMoney(vnd: number) {
    return new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND',
        maximumFractionDigits: 0,
    }).format(vnd);
}

function getAnnualSavingsPct(monthlyPrice: number, annualPrice: number | null) {
    if (!annualPrice || monthlyPrice <= 0) return 0;

    const monthlyTotal = monthlyPrice * 12;
    const savings = monthlyTotal - annualPrice;
    if (savings <= 0) return 0;

    return Math.round((savings / monthlyTotal) * 100);
}

export default function PricingPage() {
    const { isAuthenticated } = useAuth();
    const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly');
    const [activePlanName, setActivePlanName] = useState<string | null>(null);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');

    const plansQuery = useSubscriptionPlans();
    const mySubscription = useMySubscription(isAuthenticated);
    const createCheckout = useCreateCheckout();
    const completeMockPayment = useCompleteMockPayment();
    const upgradeSubscription = useUpgradeSubscription();

    const loading =
        createCheckout.isPending ||
        completeMockPayment.isPending ||
        upgradeSubscription.isPending;

    const planOrder = useMemo(() => ['free', 'pro', 'premium'], []);

    const plans = useMemo(() => {
        const items = plansQuery.data ?? [];
        return [...items].sort((a, b) => planOrder.indexOf(a.name) - planOrder.indexOf(b.name));
    }, [plansQuery.data, planOrder]);

    const handleChoosePlan = async (planName: string) => {
        if (!isAuthenticated) {
            return;
        }

        setMessage('');
        setError('');
        setActivePlanName(planName);

        try {
            if (planName === 'free') {
                await upgradeSubscription.mutateAsync({
                    planName,
                    billingCycle: 'monthly',
                });

                setMessage('Đã chuyển về gói Free.');
                return;
            }

            const checkout = await createCheckout.mutateAsync({
                planName,
                billingCycle,
            });

            await completeMockPayment.mutateAsync({
                paymentId: checkout.paymentId,
                planName,
                billingCycle,
            });

            setMessage('Thanh toán mô phỏng thành công. Gói cước đã được cập nhật.');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Không thể xử lý nâng cấp gói cước.');
        } finally {
            setActivePlanName(null);
        }
    };

    return (
        <div className={styles.container}>
            <section className={styles.hero}>
                <h1>Chọn gói cước phù hợp với bạn</h1>
                <p>
                    Netflat hỗ trợ luồng thanh toán demo. Bạn có thể thử nâng cấp gói và kiểm tra lịch sử giao dịch ngay.
                </p>
                <div className={styles.cycleSwitcher}>
                    <button
                        type="button"
                        className={`${styles.cycleButton} ${billingCycle === 'monthly' ? styles.cycleButtonActive : ''}`}
                        onClick={() => setBillingCycle('monthly')}
                    >
                        Thanh toán theo tháng
                    </button>
                    <button
                        type="button"
                        className={`${styles.cycleButton} ${billingCycle === 'annual' ? styles.cycleButtonActive : ''}`}
                        onClick={() => setBillingCycle('annual')}
                    >
                        Thanh toán theo năm
                    </button>
                </div>
                {message && <p className={styles.success}>{message}</p>}
                {error && <p className={styles.error}>{error}</p>}
            </section>

            {!isAuthenticated ? (
                <section className={styles.guestBanner}>
                    <div>
                        <h2>Đăng nhập để quản lý gói cước</h2>
                        <p>Xem gói hiện tại, nâng cấp và theo dõi lịch sử thanh toán trong tài khoản của bạn.</p>
                    </div>
                    <Link href="/login?redirect=/pricing" className="btn btn-primary">
                        Đăng nhập
                    </Link>
                </section>
            ) : null}

            {plansQuery.isLoading ? (
                <div className="loading-spinner"><div className="spinner" /></div>
            ) : (
                <section className={styles.grid}>
                    {plans.map((plan) => {
                        const isCurrent = mySubscription.data?.plan?.name === plan.name;
                        const displayPrice = billingCycle === 'annual'
                            ? (plan.annualPrice ?? plan.monthlyPrice * 12)
                            : plan.monthlyPrice;
                        const savingsPct = getAnnualSavingsPct(plan.monthlyPrice, plan.annualPrice);
                        const isPlanLoading = loading && activePlanName === plan.name;

                        return (
                            <article key={plan.id} className={`${styles.card} ${isCurrent ? styles.cardActive : ''}`}>
                                <div className={styles.cardHeader}>
                                    <h2>{plan.displayName}</h2>
                                    {isCurrent ? <span className={styles.badge}>Gói hiện tại</span> : null}
                                </div>
                                {plan.description ? <p className={styles.description}>{plan.description}</p> : null}

                                <p className={styles.price}>{formatMoney(displayPrice)}</p>
                                <p className={styles.priceHint}>{billingCycle === 'annual' ? 'mỗi năm' : 'mỗi tháng'}</p>
                                {billingCycle === 'annual' && savingsPct > 0 ? (
                                    <span className={styles.savingsBadge}>Tiết kiệm {savingsPct}%</span>
                                ) : null}

                                <ul className={styles.features}>
                                    <li>{plan.maxMoviesPerMonth >= 9999 ? 'Không giới hạn số phim mỗi tháng' : `${plan.maxMoviesPerMonth} phim mỗi tháng`}</li>
                                    <li>Độ phân giải tối đa: {plan.maxQualityResolution}</li>
                                    <li>{plan.maxFavorites} phim yêu thích</li>
                                    <li>{plan.maxDevices} thiết bị đồng thời</li>
                                    <li>{plan.showAds ? 'Có quảng cáo' : 'Không quảng cáo'}</li>
                                </ul>

                                {isAuthenticated ? (
                                    <button
                                        type="button"
                                        className={`btn ${isCurrent ? 'btn-secondary' : 'btn-primary'}`}
                                        disabled={isCurrent || isPlanLoading}
                                        onClick={() => handleChoosePlan(plan.name)}
                                    >
                                        {isCurrent ? 'Đang sử dụng' : isPlanLoading ? 'Đang xử lý...' : 'Chọn gói'}
                                    </button>
                                ) : (
                                    <Link href={`/login?redirect=/pricing`} className="btn btn-primary">
                                        Đăng nhập để chọn gói
                                    </Link>
                                )}
                            </article>
                        );
                    })}
                </section>
            )}
        </div>
    );
}
