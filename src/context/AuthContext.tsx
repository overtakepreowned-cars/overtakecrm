import React, { createContext, useContext, useState, useEffect } from 'react';

import { User } from '../types';

interface AuthContextType {
    user: User | null;
    token: string | null;
    isAdmin: boolean;
    login: (username: string, password?: string) => Promise<boolean>;
    logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const isTokenExpired = (token: string): boolean => {
    try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        return payload.exp * 1000 < Date.now();
    } catch {
        return true;
    }
};

const clearStoredAuth = () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('authUser');
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(() => {
        if (typeof window !== 'undefined') {
            const storedToken = localStorage.getItem('authToken');
            const storedUser = localStorage.getItem('authUser');
            if (storedToken && storedUser && !isTokenExpired(storedToken)) {
                try {
                    return JSON.parse(storedUser);
                } catch {
                    clearStoredAuth();
                    return null;
                }
            }
            clearStoredAuth();
        }
        return null;
    });

    const [token, setToken] = useState<string | null>(() => {
        if (typeof window !== 'undefined') {
            const storedToken = localStorage.getItem('authToken');
            return storedToken && !isTokenExpired(storedToken) ? storedToken : null;
        }
        return null;
    });

    const isAdmin = user?.role === 'admin';

    useEffect(() => {
        if (user) {
            localStorage.setItem('authUser', JSON.stringify(user));
        } else {
            localStorage.removeItem('authUser');
        }
    }, [user]);

    useEffect(() => {
        if (token) {
            localStorage.setItem('authToken', token);
        } else {
            localStorage.removeItem('authToken');
        }
    }, [token]);

    const login = async (username: string, password?: string) => {
        try {
            const res = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: username.trim(), password: password?.trim() })
            });

            if (res.ok) {
                const data = await res.json();
                if (typeof window !== 'undefined') {
                    localStorage.setItem('authToken', data.token);
                    localStorage.setItem('authUser', JSON.stringify(data.user));
                }
                setUser(data.user);
                setToken(data.token);
                return true;
            }
            return false;
        } catch (error) {
            console.error('Login error:', error);
            return false;
        }
    };

    const logout = () => {
        clearStoredAuth();
        setUser(null);
        setToken(null);
    };

    return (
        <AuthContext.Provider value={{ user, token, isAdmin, login, logout }}>
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
