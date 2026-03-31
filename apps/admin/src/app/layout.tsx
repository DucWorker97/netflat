import type { Metadata } from 'next';
import './globals.css';
import { DebugSessionRecorder } from '@/components/debug-session-recorder';

export const metadata: Metadata = {
    title: 'Netflat Admin',
    description: 'Admin CMS for Netflat',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
    // DEBUG RECORDER TOGGLE (safe for submission):
    // - Keep false (default) to disable recorder UI and tracking.
    // - Set NEXT_PUBLIC_ENABLE_SESSION_RECORDER=true only when debugging.
    const recorderEnabled = process.env.NEXT_PUBLIC_ENABLE_SESSION_RECORDER === 'true';

    return (
        <html lang="vi" suppressHydrationWarning>
            <body suppressHydrationWarning>
                {/* DEBUG RECORDER MOUNT POINT: remove this line when asked to fully remove recorder */}
                {recorderEnabled ? <DebugSessionRecorder appName="admin" /> : null}
                {children}
            </body>
        </html>
    );
}
