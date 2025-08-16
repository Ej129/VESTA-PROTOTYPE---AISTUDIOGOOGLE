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
  console.log('[AuthProvider] State Init: loading=', loading, 'user=', user);

  const handleLogin = useCallback(async (netlifyUser: NetlifyUser | null) => {
    console.log('[AuthProvider] handleLogin called with netlifyUser:', netlifyUser);
    setLoading(true);
    if (netlifyUser) {
      console.log('[AuthProvider] Netlify user found, getting or creating Vesta user...');
      const vestaUser = await workspaceApi.getOrCreateUser(netlifyUser);
      console.log('[AuthProvider] Vesta user resolved:', vestaUser);
      setUser(vestaUser);
    } else {
      console.log('[AuthProvider] No Netlify user, setting Vesta user to null.');
      setUser(null);
    }
    setLoading(false);
    // Note: Logging 'user' here will show the value from the previous render due to closure.
    // The component will re-render with the correct new user state.
  }, []);

  useEffect(() => {
    console.log('[AuthProvider] useEffect setup running.');
    const netlifyIdentity = window.netlifyIdentity;

    const onAuthAction = (netlifyUser: NetlifyUser | null) => {
      console.log('[AuthProvider] Netlify Identity event triggered with user:', netlifyUser);
      handleLogin(netlifyUser);

      if (window.location.hash === '#') {
        window.history.replaceState(null, document.title, window.location.pathname + window.location.search);
        console.log('[AuthProvider] Cleaned up URL hash.');
      }
    };

    if (netlifyIdentity) {
      console.log('[AuthProvider] Netlify Identity widget found. Attaching listeners.');
      netlifyIdentity.on('init', (netlifyUser: NetlifyUser | null) => {
          console.log('[AuthProvider] "init" event fired with user:', netlifyUser);
          onAuthAction(netlifyUser);
      });
      
      netlifyIdentity.on('login', (netlifyUser: NetlifyUser | null) => {
          console.log('[AuthProvider] "login" event fired with user:', netlifyUser);
          onAuthAction(netlifyUser);
      });
      
      netlifyIdentity.on('logout', () => {
        console.log('[AuthProvider] "logout" event fired.');
        setUser(null);
      });

      netlifyIdentity.init();
      console.log('[AuthProvider] Netlify Identity initialized.');
    } else {
        console.warn("Netlify Identity widget not found. Make sure the script is included in your HTML.");
        setLoading(false);
    }

    return () => {
      if (netlifyIdentity) {
        console.log('[AuthProvider] useEffect cleanup. Removing listeners.');
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
  
  console.log('[AuthProvider] has rendered. State: loading=', loading, 'user=', user);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};