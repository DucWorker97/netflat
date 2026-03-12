'use client';

import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { api } from './api';

interface User {
    id: string;
    email: string;
    role: string;
    createdAt: string;
}

interface AuthContextType {
    user: User | null;
    isLoading: boolean;
    isAuthenticated: boolean;
    login: (email: string, password: string) => Promise<void>;
    logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        // Check if we have a stored token and fetch user
        const checkAuth = async () => {
            if (api.isAuthenticated()) {
                try {
                    const res = await api.get<{ data: User }>('/api/auth/me');
                    setUser(res.data);
                } catch {
                    api.clearTokens();
                }
            }
            setIsLoading(false);
        };

        checkAuth();
    }, []);

    // Extract locale from current pathname
    const getLocale = () => {
        if (typeof window !== 'undefined') {
            const match = window.location.pathname.match(/^\/(vi|en)(\/?|$)/);
            return match ? match[1] : 'vi';
        }
        return 'vi';
    };

    const login = async (email: string, password: string) => {
        interface LoginResponse {
            data: {
                accessToken: string;
                refreshToken: string;
                user: User;
            };
        }

        const res = await api.post<LoginResponse>('/api/auth/login', { email, password });

        // Check if user has admin role
        if (res.data.user.role !== 'admin') {
            throw new Error('Access denied. Admin account required.');
        }

        api.setTokens(res.data.accessToken, res.data.refreshToken);
        setUser(res.data.user);
        router.push(`/${getLocale()}/movies`);
    };

    const logout = () => {
        api.clearTokens();
        setUser(null);
        router.push(`/${getLocale()}/login`);
    };

    return (
        <AuthContext.Provider
            value={{
                user,
                isLoading,
                isAuthenticated: !!user,
                login,
                logout,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within AuthProvider');
    }
    return context;
}
