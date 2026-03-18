import React, { createContext, useContext, useState, useEffect } from 'react';

import { User } from '../types';

interface AuthContextType {
    user: User | null;
    isAdmin: boolean;
    login: (username: string, password?: string) => Promise<boolean>;
    logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(() => {
        // Hydrate from local storage on initial load
        if (typeof window !== 'undefined') {
            const storedUser = localStorage.getItem('authUser');
            if (storedUser) {
                try {
                    return JSON.parse(storedUser);
                } catch (_e) {
                    return null;
                }
            }
        }
        return null;
    });

    const isAdmin = user?.role === 'admin';

    useEffect(() => {
        // Persist to local storage
        if (user) {
            localStorage.setItem('authUser', JSON.stringify(user));
        } else {
            localStorage.removeItem('authUser');
        }
    }, [user]);

    const login = async (username: string, password?: string) => {
        try {
            const res = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: username.trim(), password: password?.trim() })
            });

            if (res.ok) {
                const authenticatedUser = await res.json();
                setUser(authenticatedUser);
                return true;
            }
            return false;
        } catch (error) {
            console.error('Login error:', error);
            return false;
        }
    };

    const logout = () => {
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, isAdmin, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
