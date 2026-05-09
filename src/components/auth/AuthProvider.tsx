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
  dbUser: DbUser | null;
}

export type AuthTab = 'signin' | 'signup' | 'forgot-password';

export interface DbUser {
  id: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
  role: string;
  preferredLang: string;
  company: string | null;
  subscription: {
    plan: string;
    status: string;
  } | null;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

// Check URL params to determine if auth modal should auto-open
function getInitialAuthModalState(): { isOpen: boolean; tab: AuthTab } {
  if (typeof window === 'undefined') return { isOpen: false, tab: 'signin' };
  try {
    const params = new URLSearchParams(window.location.search);
    if (params.get('auth') === 'required') {
      return { isOpen: true, tab: 'signin' };
    }
  } catch {
    // Ignore
  }
  return { isOpen: false, tab: 'signin' };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [dbUser, setDbUser] = useState<DbUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Initialize auth modal state from URL params
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(() => getInitialAuthModalState().isOpen);
  const [authModalTab, setAuthModalTab] = useState<AuthTab>(() => getInitialAuthModalState().tab);

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
    setDbUser(null);
  }, []);

  const syncDbUser = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/sync', { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        if (data.user) {
          setDbUser({
            id: data.user.id,
            email: data.user.email,
            name: data.user.name,
            avatarUrl: data.user.avatarUrl,
            role: data.user.role,
            preferredLang: data.user.preferredLang,
            company: data.user.company,
            subscription: data.subscription ?? null,
          });
        }
      }
    } catch {
      // Non-critical: user will be synced on next API call
    }
  }, []);

  useEffect(() => {
    const supabase = createClient();

    // Get initial session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setUser(session?.user ?? null);
      setIsLoading(false);

      // Sync user to our DB if authenticated
      if (session?.user) {
        await syncDbUser();
      }
    });

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setUser(session?.user ?? null);
        setIsLoading(false);

        // Close modal + sync user to our DB on successful sign in/sign up
        if (session?.user) {
          setIsAuthModalOpen(false);
          await syncDbUser();
          // Clean up URL params
          if (window.location.search.includes('auth=')) {
            window.history.replaceState({}, '', '/');
          }
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [syncDbUser]);

  const value: AuthContextValue = {
    user,
    isAuthenticated: !!user,
    isLoading,
    openAuthModal,
    closeAuthModal,
    isAuthModalOpen,
    authModalTab,
    signOut,
    dbUser,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
