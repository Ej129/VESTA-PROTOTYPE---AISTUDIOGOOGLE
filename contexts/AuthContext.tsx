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

      // After authentication, Netlify redirects with a URL hash. The widget
      // processes it and should remove it, but sometimes an empty '#' remains.
      // This logic cleans up the URL for a cleaner user experience.
      if (window.location.hash === '#') {
        window.history.replaceState(null, document.title, window.location.pathname + window.location.search);
      }
    };

    if (netlifyIdentity) {
      // The 'init' event fires when the widget is initialized, and it may
      // contain a user if they were already logged in (or just returned from an external provider).
      netlifyIdentity.on('init', onAuthAction);
      
      // The 'login' event fires after a user successfully logs in using the widget.
      netlifyIdentity.on('login', onAuthAction);
      
      netlifyIdentity.on('logout', () => {
        setUser(null);
      });

      netlifyIdentity.init();
    } else {
        console.warn("Netlify Identity widget not found. Make sure the script is included in your HTML.");
        setLoading(false);
    }

    return () => {
      if (netlifyIdentity) {
        netlifyIdentity.off('init', onAuthAction);
        netlifyIdentity.off('login', onAuthAction);
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
