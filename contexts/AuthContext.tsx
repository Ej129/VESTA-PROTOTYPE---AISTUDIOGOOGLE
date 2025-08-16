
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

  const updateUserState = useCallback(async (netlifyUser: NetlifyUser | null) => {
    if (netlifyUser) {
      // Get or create our app-specific user from the Netlify user data
      const appUser = await workspaceApi.getOrCreateUser(netlifyUser);
      setUser(appUser);
    } else {
      setUser(null);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    const netlifyIdentity = window.netlifyIdentity;

    if (netlifyIdentity) {
      // Initialize the widget
      netlifyIdentity.init();

      // Bind to authentication events
      netlifyIdentity.on('init', (netlifyUser: NetlifyUser | null) => {
        updateUserState(netlifyUser);
      });

      netlifyIdentity.on('login', (netlifyUser: NetlifyUser) => {
        updateUserState(netlifyUser);
        netlifyIdentity.close(); // Close the modal on login
      });

      netlifyIdentity.on('logout', () => {
        updateUserState(null);
      });

      // Check for an existing user on mount
      const currentUser = netlifyIdentity.currentUser();
      if (currentUser) {
        updateUserState(currentUser);
      } else {
        setLoading(false); // No user, stop loading
      }

      // Cleanup function to remove event listeners
      return () => {
        netlifyIdentity.off('login');
        netlifyIdentity.off('logout');
      };
    } else {
      // If the script hasn't loaded for some reason, stop loading
      console.warn('Netlify Identity widget not found.');
      setLoading(false);
    }
  }, [updateUserState]);

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