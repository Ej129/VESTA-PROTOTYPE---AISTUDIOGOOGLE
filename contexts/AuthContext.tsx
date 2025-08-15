import React, { createContext, useState, useEffect, useContext, ReactNode, useCallback } from 'react';
import netlifyIdentity from 'netlify-identity-widget';
import { User } from '../types';
import * as workspaceApi from '../api/workspace';

interface AuthContextType {
  currentUser: User | null;
  loading: boolean;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    netlifyIdentity.init();

    const handleLogin = async (netlifyUser: any) => {
      setLoading(true);
      const appUser = await workspaceApi.getOrCreateUser(netlifyUser);
      setCurrentUser(appUser);
      setLoading(false);
      netlifyIdentity.close();
    };

    const handleLogout = () => {
      setCurrentUser(null);
    };

    netlifyIdentity.on('init', (user) => {
      if (user) {
        handleLogin(user);
      } else {
        setLoading(false); // No user, finished loading
      }
    });
    
    netlifyIdentity.on('login', handleLogin);
    netlifyIdentity.on('logout', handleLogout);

    return () => {
      netlifyIdentity.off('login', handleLogin);
      netlifyIdentity.off('logout', handleLogout);
    };
  }, []);

  const logout = useCallback(() => {
    netlifyIdentity.logout();
  }, []);

  const value = { currentUser, loading, logout };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
