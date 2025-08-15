import React, { createContext, useState, useEffect, useContext, ReactNode, useCallback } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import { User, Auth0User } from '../types';
import * as workspaceApi from '../api/workspace';

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

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const { 
    user: auth0User, 
    isAuthenticated, 
    isLoading: isAuth0Loading, 
    loginWithRedirect, 
    logout: auth0Logout 
  } = useAuth0<Auth0User>();

  const [vestaUser, setVestaUser] = useState<User | null>(null);
  const [isSyncing, setIsSyncing] = useState(true);

  useEffect(() => {
    const syncUser = async (currentAuth0User: Auth0User) => {
      // The user is authenticated with Auth0, now get/create them in our app's user database
      const appUser = await workspaceApi.getOrCreateUser(currentAuth0User);
      setVestaUser(appUser);
      setIsSyncing(false);
    };

    if (isAuth0Loading) {
      // If Auth0 is still figuring things out, we are in a loading state.
      setIsSyncing(true);
      return;
    }

    if (isAuthenticated && auth0User) {
      // Auth0 is done, and we have a user. Sync them.
      syncUser(auth0User);
    } else {
      // Auth0 is done, and there is no user.
      setVestaUser(null);
      setIsSyncing(false);
    }
  }, [auth0User, isAuthenticated, isAuth0Loading]);

  const login = useCallback(() => {
    loginWithRedirect();
  }, [loginWithRedirect]);

  const logout = useCallback(() => {
    auth0Logout({ logoutParams: { returnTo: window.location.origin } });
  }, [auth0Logout]);

  // The overall loading state is true if Auth0 is loading OR if we are syncing our internal user.
  const loading = isAuth0Loading || isSyncing;

  const value = { user: vestaUser, loading, login, logout };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};