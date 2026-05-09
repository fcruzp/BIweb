'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { createClient } from '@/utils/supabase/client';
import type { User } from '@supabase/supabase-js';

interface AuthContextValue {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  openAuthModal: (tab?: AuthTab) => void;
  closeAuthModal: () => void;
  isAuthModalOpen: boolean;
  authModalTab: AuthTab;
  signOut: () => Promise<void>;
}

export type AuthTab = 'signin' | 'signup' | 'forgot-password';

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalTab, setAuthModalTab] = useState<AuthTab>('signin');

  const openAuthModal = useCallback((tab: AuthTab = 'signin') => {
    setAuthModalTab(tab);
    setIsAuthModalOpen(true);
  }, []);

  const closeAuthModal = useCallback(() => {
    setIsAuthModalOpen(false);
  }, []);

  const signOut = useCallback(async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    setUser(null);
  }, []);

  useEffect(() => {
    const supabase = createClient();

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setIsLoading(false);
    });

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setUser(session?.user ?? null);
        setIsLoading(false);

        // Close modal + sync user to our DB on successful sign in/sign up
        if (session?.user) {
          setIsAuthModalOpen(false);
          try {
            await fetch('/api/auth/sync', { method: 'POST' });
          } catch {
            // Non-critical: user will be synced on next API call
          }
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const value: AuthContextValue = {
    user,
    isAuthenticated: !!user,
    isLoading,
    openAuthModal,
    closeAuthModal,
    isAuthModalOpen,
    authModalTab,
    signOut,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
