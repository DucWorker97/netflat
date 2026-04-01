import type { Metadata } from 'next';
import './globals.css';
import { QueryProvider } from '@/lib/query-provider';
import { AuthProvider } from '@/lib/auth-context';
import { Navbar } from '@/components/navbar';
import { Footer } from '@/components/footer';
import { DebugSessionRecorder } from '@/components/debug-session-recorder';

export const metadata: Metadata = {
    title: 'Netflat - Xem Phim',
    description: 'Xem phim trực tuyến yêu thích của bạn',
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    // DEBUG RECORDER TOGGLE (safe for submission):
    // - Keep false (default) to disable recorder UI and tracking.
    // - Set NEXT_PUBLIC_ENABLE_SESSION_RECORDER=true only when debugging.
    const recorderEnabled = process.env.NEXT_PUBLIC_ENABLE_SESSION_RECORDER === 'true';

    return (
        <html lang="vi" suppressHydrationWarning>
            <body suppressHydrationWarning>
                {/* DEBUG RECORDER MOUNT POINT: remove this line when asked to fully remove recorder */}
                {recorderEnabled ? <DebugSessionRecorder appName="web" /> : null}
                <QueryProvider>
                    <AuthProvider>
                        <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
                            <Navbar />
                            <div style={{ flex: 1 }}>
                                {children}
                            </div>
                            <Footer />
                        </div>
                    </AuthProvider>
                </QueryProvider>
            </body>
        </html>
    );
}
