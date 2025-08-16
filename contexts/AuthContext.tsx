import React, { createContext, useState, useEffect, useContext, ReactNode, useCallback } from 'react';
import { User } from '../types';
import * as workspaceApi from '../api/workspace';

// Global declaration for the netlifyIdentity object provided by the widget script
declare global {
  interface Window {
    netlifyIdentity: any;
  }
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: () => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// A minimal type for the Netlify user object we receive from events
interface NetlifyUser {
  email: string;
  user_metadata?: {
    full_name?: string;
    avatar_url?: string;
  };
}

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const handleLogin = useCallback(async (netlifyUser: NetlifyUser | null) => {
    setLoading(true);
    if (netlifyUser) {
      const vestaUser = await workspaceApi.getOrCreateUser(netlifyUser);
      setUser(vestaUser);
    } else {
      setUser(null);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    const netlifyIdentity = window.netlifyIdentity;

    const onAuthAction = (netlifyUser: NetlifyUser | null) => {
      handleLogin(netlifyUser);

      if (window.location.hash === '#') {
        window.history.replaceState(null, document.title, window.location.pathname + window.location.search);
      }
    };

    if (netlifyIdentity) {
      netlifyIdentity.on('init', (netlifyUser: NetlifyUser | null) => {
          onAuthAction(netlifyUser);
      });
      
      netlifyIdentity.on('login', (netlifyUser: NetlifyUser | null) => {
          onAuthAction(netlifyUser);
      });
      
      netlifyIdentity.on('logout', () => {
        setUser(null);
      });

      netlifyIdentity.init();
    } else {
        setLoading(false);
    }

    return () => {
      if (netlifyIdentity) {
        netlifyIdentity.off('init');
        netlifyIdentity.off('login');
        netlifyIdentity.off('logout');
      }
    };
  }, [handleLogin]);

  const login = () => {
    if (window.netlifyIdentity) {
      window.netlifyIdentity.open();
    }
  };

  const logout = () => {
    if (window.netlifyIdentity) {
      window.netlifyIdentity.logout();
    }
  };

  const value = { user, loading, login, logout };
  
  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
