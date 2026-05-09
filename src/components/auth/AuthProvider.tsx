'use client';

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
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

  // Track if we've already synced the user this session
  const hasSyncedRef = useRef(false);

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
    hasSyncedRef.current = false;
  }, []);

  const syncDbUser = useCallback(async () => {
    try {
      const controller = new AbortController();
      // 10s timeout — if /auth/sync takes longer, something is very wrong
      // and we shouldn't block the app from loading
      const timeoutId = setTimeout(() => controller.abort(), 10_000);

      const res = await fetch('/api/auth/sync', {
        method: 'POST',
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

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
          hasSyncedRef.current = true;
        }
      } else {
        console.warn('[AuthProvider] /api/auth/sync returned:', res.status);
      }
    } catch (err) {
      // Non-critical: user will be synced on next API call
      if (err instanceof DOMException && err.name === 'AbortError') {
        console.warn('[AuthProvider] /api/auth/sync timed out (10s) — will retry on next API call');
      } else {
        console.warn('[AuthProvider] /api/auth/sync failed:', err instanceof Error ? err.message : err);
      }
    }
  }, []);

  useEffect(() => {
    const supabase = createClient();

    // Get initial session — validate with getUser() to catch expired sessions
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        // Validate the session server-side by calling getUser()
        // This catches the case where the local session is stale/expired
        const { data: { user: validatedUser }, error } = await supabase.auth.getUser();

        if (error || !validatedUser) {
          // Session is invalid/expired — sign out and show auth screen
          console.warn('[AuthProvider] Session validation failed — clearing stale session');
          await supabase.auth.signOut();
          setUser(null);
          setDbUser(null);
          setIsLoading(false);
          return;
        }

        setUser(validatedUser);
        setIsLoading(false);

        // Sync user to our DB if authenticated
        if (!hasSyncedRef.current) {
          await syncDbUser();
        }
      } else {
        setUser(null);
        setIsLoading(false);
      }
    });

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        // Handle session recovery failures
        if (event === 'TOKEN_REFRESH_FAILED' || event === 'SIGNED_OUT') {
          setUser(null);
          setDbUser(null);
          setIsLoading(false);
          hasSyncedRef.current = false;
          return;
        }

        setUser(session?.user ?? null);
        setIsLoading(false);

        // Close modal + sync user to our DB on successful sign in/sign up
        if (session?.user) {
          setIsAuthModalOpen(false);
          if (!hasSyncedRef.current || event === 'SIGNED_IN') {
            await syncDbUser();
          }
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
