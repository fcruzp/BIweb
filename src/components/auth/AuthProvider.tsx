'use client';

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { createClient } from '@/utils/supabase/client';
import type { User } from '@supabase/supabase-js';
import { AUTH_EXPIRED_EVENT } from '@/lib/fetch-utils';

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
  showOnboarding: boolean;
  completeOnboarding: (interestArea?: string) => Promise<void>;
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
  const [showOnboarding, setShowOnboarding] = useState(false);

  // Initialize auth modal state from URL params
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(() => getInitialAuthModalState().isOpen);
  const [authModalTab, setAuthModalTab] = useState<AuthTab>(() => getInitialAuthModalState().tab);

  // Track if we've already synced the user this session
  const hasSyncedRef = useRef(false);
  // Guard against concurrent sync calls
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
      // signOut can fail if the user was deleted from Supabase.
      // That's fine — we still need to clean up local state.
    }
    // Always clear local state regardless of signOut result
    setUser(null);
    setDbUser(null);
    setShowOnboarding(false);
    hasSyncedRef.current = false;

    // Force-clear all Supabase auth cookies in case signOut failed
    try {
      document.cookie.split(';').forEach(cookie => {
        const name = cookie.trim().split('=')[0];
        if (name.startsWith('sb-') || name.startsWith('sb_')) {
          document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
        }
      });
    } catch {
      // Ignore cookie clearing errors
    }
  }, []);

  const completeOnboarding = useCallback(async (interestArea?: string) => {
    try {
      await fetch('/api/onboarding/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ interestArea }),
      });
      setShowOnboarding(false);
      // Update local dbUser state
      if (dbUser) {
        setDbUser({ ...dbUser, onboardingCompleted: true, interestArea: interestArea ?? dbUser.interestArea });
      }
    } catch (err) {
      console.warn('[AuthProvider] Failed to complete onboarding:', err);
      // Still close onboarding locally even if API fails
      setShowOnboarding(false);
    }
  }, [dbUser]);

  const syncDbUser = useCallback(async function sync(retryCount = 0): Promise<void> {
    // Prevent concurrent sync calls
    if (syncingRef.current) return;
    syncingRef.current = true;

    try {
      const controller = new AbortController();
      // 10s timeout — if /auth/sync takes longer, something is very wrong
      const timeoutId = setTimeout(() => controller.abort(), 10_000);

      const res = await fetch('/api/auth/sync', {
        method: 'POST',
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

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
            onboardingCompleted: data.onboardingCompleted ?? false,
            interestArea: data.interestArea ?? null,
            subscription: data.subscription ?? null,
          };
          setDbUser(dbUserData);
          // Show onboarding for new users who haven't completed it
          setShowOnboarding(!dbUserData.onboardingCompleted);
          hasSyncedRef.current = true;
        }
      } else if (res.status === 401 && retryCount < 2) {
        // 401 usually means the session cookies haven't been written yet
        // (race condition after sign-in) or the access token expired.
        // Try refreshing the session and retrying.
        console.warn(`[AuthProvider] /api/auth/sync returned 401 (attempt ${retryCount + 1}/3)`);

        const supabase = createClient();
        const { data: { session } } = await supabase.auth.refreshSession();

        if (session) {
          // Wait a tick for cookies to be written to the browser
          await new Promise(resolve => setTimeout(resolve, 300));
          syncingRef.current = false;
          return sync(retryCount + 1);
        } else {
          // Session is truly invalid — sign out
          console.warn('[AuthProvider] Session refresh failed — signing out');
          await supabase.auth.signOut();
          setUser(null);
          setDbUser(null);
        }
      } else if (res.status === 401) {
        // Max retries exceeded — session is invalid
        console.warn('[AuthProvider] /api/auth/sync returned 401 after retries — signing out');
        const supabase = createClient();
        await supabase.auth.signOut();
        setUser(null);
        setDbUser(null);
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
    } finally {
      syncingRef.current = false;
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
        // Small delay to ensure cookies are written to the browser
        if (!hasSyncedRef.current) {
          await new Promise(resolve => setTimeout(resolve, 200));
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
        if ((event as string) === 'TOKEN_REFRESH_FAILED' || event === 'SIGNED_OUT') {
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
            // Delay sync to ensure cookies are written — the onAuthStateChange
            // callback fires BEFORE the browser has finished persisting cookies
            await new Promise(resolve => setTimeout(resolve, 300));
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

  // Listen for global auth-expired events from authFetch
  // When any API call returns 401, authFetch dispatches this event.
  // We debounce it — if we see multiple 401s in quick succession, only
  // handle the first one. Once recovery fails, we immediately sign out
  // and DO NOT retry (prevents the 401 cascade loop).
  useEffect(() => {
    let handlingExpired = false;
    let permanentlyExpired = false;

    const handleAuthExpired = async () => {
      // If we already determined the session is unrecoverable, ignore all future events
      if (permanentlyExpired) return;
      if (handlingExpired) return;
      handlingExpired = true;

      console.warn('[AuthProvider] Auth expired event received — attempting session recovery');

      try {
        // Don't sign out immediately — try refreshing the session first
        const supabase = createClient();
        const { data: { session } } = await supabase.auth.refreshSession();

        if (session) {
          // Session refreshed successfully — retry sync
          console.log('[AuthProvider] Session refreshed after auth expiry — retrying sync');
          await syncDbUser();
          // Recovery worked — reset the flag
          permanentlyExpired = false;
        } else {
          // Can't recover — sign out immediately and permanently
          console.warn('[AuthProvider] Cannot recover session — signing out permanently');
          permanentlyExpired = true;
          await supabase.auth.signOut();
          setUser(null);
          setDbUser(null);
          setShowOnboarding(false);
          hasSyncedRef.current = false;
          setIsLoading(false);

          // Clear all auth cookies manually to prevent stale cookies
          try {
            document.cookie.split(';').forEach(cookie => {
              const name = cookie.trim().split('=')[0];
              if (name.startsWith('sb-') || name.startsWith('sb_')) {
                document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
              }
            });
          } catch {
            // Ignore cookie clearing errors
          }
        }
      } catch (err) {
        // refreshSession itself failed — session is definitely unrecoverable
        console.warn('[AuthProvider] Session recovery threw error — signing out permanently:', err);
        permanentlyExpired = true;
        const supabase = createClient();
        try { await supabase.auth.signOut(); } catch {}
        setUser(null);
        setDbUser(null);
        setShowOnboarding(false);
        hasSyncedRef.current = false;
        setIsLoading(false);
      }

      // Reset handling flag after 3s (shorter than before to avoid pileup)
      // But keep permanentlyExpired = true if recovery failed
      setTimeout(() => { handlingExpired = false; }, 3000);
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
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
