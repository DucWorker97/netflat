import type { Metadata } from 'next';
import './globals.css';
import { QueryProvider } from '@/lib/query-provider';
import { AuthProvider } from '@/lib/auth-context';
import { Navbar } from '@/components/navbar';
import { Footer } from '@/components/footer';

export const metadata: Metadata = {
    title: 'Netflat - Watch Movies',
    description: 'Stream your favorite movies',
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="en" suppressHydrationWarning>
            <body suppressHydrationWarning>
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
