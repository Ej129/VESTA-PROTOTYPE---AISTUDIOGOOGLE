import React, { createContext, useState, useEffect, useContext, ReactNode, useCallback } from 'react';
import netlifyIdentity from 'netlify-identity-widget';
import { User } from '../types';
import * as workspaceApi from '../api/workspace';

interface AuthContextType {
    user: User | null;
    isInitialized: boolean;
    logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
    const [user, setUser] = useState<User | null>(null);
    const [isInitialized, setIsInitialized] = useState(false);

    useEffect(() => {
        netlifyIdentity.init();

        const handleLogin = async (netlifyUser: any) => {
            try {
                const appUser = await workspaceApi.getOrCreateUser(netlifyUser);
                setUser(appUser);
                netlifyIdentity.close();
            } catch (error) {
                console.error("Error during login sync:", error);
            }
        };

        const handleLogout = () => {
            setUser(null);
        };

        netlifyIdentity.on('init', (netlifyUser) => {
            if (netlifyUser) {
                handleLogin(netlifyUser);
            }
            setIsInitialized(true);
        });

        netlifyIdentity.on('login', handleLogin);
        netlifyIdentity.on('logout', handleLogout);

        return () => {
            // Per Netlify docs, event listeners on the widget are not meant to be cleaned up
        };
    }, []);

    const logout = useCallback(() => {
        netlifyIdentity.logout();
    }, []);

    const value = { user, isInitialized, logout };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
