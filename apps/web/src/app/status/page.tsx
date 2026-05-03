'use client';

import { useEffect, useMemo, useState } from 'react';

type HealthState = {
    ok: boolean;
    statusCode?: number;
    message: string;
    checkedAt?: string;
};

const INITIAL_STATE: HealthState = {
    ok: false,
    message: 'Đang kiểm tra trạng thái API...',
};

export default function StatusPage() {
    const [apiHealth, setApiHealth] = useState<HealthState>(INITIAL_STATE);

    const apiBaseUrl = useMemo(
        () => process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3000',
        [],
    );

    useEffect(() => {
        let mounted = true;

        const run = async () => {
            try {
                const response = await fetch(`${apiBaseUrl}/health`, { method: 'GET' });
                const text = await response.text();

                if (!mounted) {
                    return;
                }

                setApiHealth({
                    ok: response.ok,
                    statusCode: response.status,
                    message: response.ok ? `Hoạt động tốt: ${text}` : `Phản hồi lỗi: ${text}`,
                    checkedAt: new Date().toISOString(),
                });
            } catch (error: unknown) {
                if (!mounted) {
                    return;
                }

                setApiHealth({
                    ok: false,
                    message: error instanceof Error ? error.message : String(error),
                    checkedAt: new Date().toISOString(),
                });
            }
        };

        run();
        return () => {
            mounted = false;
        };
    }, [apiBaseUrl]);

    return (
        <main style={{ maxWidth: 900, margin: '24px auto', padding: '0 16px' }}>
            <h1 style={{ marginBottom: 12 }}>Trạng thái hệ thống</h1>
            <p style={{ marginBottom: 24, color: 'var(--text-secondary)' }}>
                Trang này dùng để kiểm tra nhanh trạng thái chạy của web và API.
            </p>

            <section
                style={{
                    background: 'var(--bg-secondary)',
                    border: '1px solid var(--border)',
                    borderRadius: 10,
                    padding: 16,
                    marginBottom: 12,
                }}
            >
                <h2 style={{ marginTop: 0, marginBottom: 8, fontSize: 18 }}>Ứng dụng Web</h2>
                <p style={{ margin: 0 }}>Trạng thái: đang chạy</p>
            </section>

            <section
                style={{
                    background: 'var(--bg-secondary)',
                    border: '1px solid var(--border)',
                    borderRadius: 10,
                    padding: 16,
                }}
            >
                <h2 style={{ marginTop: 0, marginBottom: 8, fontSize: 18 }}>Tình trạng API</h2>
                <p style={{ margin: '0 0 6px 0' }}>Địa chỉ gốc: {apiBaseUrl}</p>
                <p style={{ margin: '0 0 6px 0' }}>
                    Trạng thái: {apiHealth.ok ? 'bình thường' : 'không ổn định'}
                    {typeof apiHealth.statusCode === 'number' ? ` (HTTP ${apiHealth.statusCode})` : ''}
                </p>
                <p style={{ margin: '0 0 6px 0' }}>Thông báo: {apiHealth.message}</p>
                <p style={{ margin: 0, color: 'var(--text-secondary)' }}>
                    Thời điểm kiểm tra: {apiHealth.checkedAt || 'đang chờ'}
                </p>
            </section>
        </main>
    );
}
