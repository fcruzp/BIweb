'use client';

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { createClient } from '@/utils/supabase/client';
import type { User as SupabaseUser } from '@supabase/supabase-js';
import { AUTH_EXPIRED_EVENT } from '@/lib/fetch-utils';

interface AuthContextValue {
  user: SupabaseUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  openAuthModal: (tab?: AuthTab) => void;
  closeAuthModal: () => void;
  isAuthModalOpen: boolean;
  authModalTab: AuthTab;
  signOut: () => Promise<void>;
  dbUser: DbUser | null;
  showOnboarding: boolean;
  completeOnboarding: (interestArea?: string) => Promise<void>;
  refreshDbUser: () => Promise<void>;
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
  phone: string | null;
  country: string | null;
  taxId: string | null;
  onboardingCompleted: boolean;
  interestArea: string | null;
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
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [dbUser, setDbUser] = useState<DbUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showOnboarding, setShowOnboarding] = useState(false);

  const [isAuthModalOpen, setIsAuthModalOpen] = useState(() => getInitialAuthModalState().isOpen);
  const [authModalTab, setAuthModalTab] = useState<AuthTab>(() => getInitialAuthModalState().tab);

  const hasSyncedRef = useRef(false);
  const syncingRef = useRef(false);

  const openAuthModal = useCallback((tab: AuthTab = 'signin') => {
    setAuthModalTab(tab);
    setIsAuthModalOpen(true);
  }, []);

  const closeAuthModal = useCallback(() => {
    setIsAuthModalOpen(false);
  }, []);

  const signOut = useCallback(async () => {
    const supabase = createClient();
    try {
      await supabase.auth.signOut();
    } catch {
      // Ignore
    }
    setUser(null);
    setDbUser(null);
    setShowOnboarding(false);
    hasSyncedRef.current = false;
  }, []);

  const completeOnboarding = useCallback(async (interestArea?: string) => {
    try {
      await fetch('/api/onboarding/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ interestArea }),
      });
      setShowOnboarding(false);
      if (dbUser) {
        setDbUser({ ...dbUser, onboardingCompleted: true, interestArea: interestArea ?? dbUser.interestArea });
      }
    } catch (err) {
      console.warn('[AuthProvider] Failed to complete onboarding:', err);
      setShowOnboarding(false);
    }
  }, [dbUser]);

  const syncDbUser = useCallback(async function sync(): Promise<void> {
    if (syncingRef.current) return;
    syncingRef.current = true;

    try {
      const res = await fetch('/api/auth/sync', {
        method: 'POST',
      });

      if (res.ok) {
        const data = await res.json();
        if (data.user) {
          const dbUserData: DbUser = {
            id: data.user.id,
            email: data.user.email,
            name: data.user.name,
            avatarUrl: data.user.avatarUrl,
            role: data.user.role,
            preferredLang: data.user.preferredLang,
            company: data.user.company,
            phone: data.user.phone,
            country: data.user.country,
            taxId: data.user.taxId,
            onboardingCompleted: data.onboardingCompleted ?? false,
            interestArea: data.interestArea ?? null,
            subscription: data.subscription ?? null,
          };
          setDbUser(dbUserData);
          setShowOnboarding(!dbUserData.onboardingCompleted);
          hasSyncedRef.current = true;
        }
      } else {
        console.warn('[AuthProvider] /api/auth/sync returned:', res.status);
      }
    } catch (err) {
      console.warn('[AuthProvider] /api/auth/sync failed:', err instanceof Error ? err.message : err);
    } finally {
      syncingRef.current = false;
    }
  }, []);

  useEffect(() => {
    const supabase = createClient();

    // Auto-authenticate: try to get existing session, or create one
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user as any);
        setIsLoading(false);
        if (!hasSyncedRef.current) {
          await new Promise(resolve => setTimeout(resolve, 200));
          await syncDbUser();
        }
      } else {
        // Auto-sign in as demo user
        const { data } = await supabase.auth.signInWithPassword({
          email: 'demo@datamind.local',
          password: 'demo1234',
        });

        if (data.user) {
          setUser(data.user as any);
          if (!hasSyncedRef.current) {
            await new Promise(resolve => setTimeout(resolve, 200));
            await syncDbUser();
          }
        }
        setIsLoading(false);
      }
    });

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setUser(session?.user as any ?? null);
        setIsLoading(false);

        if (session?.user) {
          setIsAuthModalOpen(false);
          if (!hasSyncedRef.current || event === 'SIGNED_IN') {
            await new Promise(resolve => setTimeout(resolve, 300));
            await syncDbUser();
          }
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

  // Listen for auth-expired events
  useEffect(() => {
    const handleAuthExpired = async () => {
      console.warn('[AuthProvider] Auth expired event — re-authenticating');
      const supabase = createClient();
      const { data } = await supabase.auth.signInWithPassword({
        email: 'demo@datamind.local',
        password: 'demo1234',
      });
      if (data.user) {
        setUser(data.user as any);
        await syncDbUser();
      }
    };

    window.addEventListener(AUTH_EXPIRED_EVENT, handleAuthExpired);
    return () => {
      window.removeEventListener(AUTH_EXPIRED_EVENT, handleAuthExpired);
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
    showOnboarding,
    completeOnboarding,
    refreshDbUser: syncDbUser,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
