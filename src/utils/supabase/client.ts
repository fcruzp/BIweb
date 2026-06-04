/**
 * Mock Supabase client for local development.
 * Replaces the real Supabase Auth with a local demo user.
 */

const DEMO_USER = {
  id: 'demo-user-00000001',
  email: 'demo@datamind.local',
  user_metadata: {
    full_name: 'Demo User',
    avatar_url: null,
  },
  app_metadata: {},
  aud: 'authenticated',
  created_at: new Date().toISOString(),
  role: 'authenticated',
};

// Session storage key
const SESSION_KEY = 'datamind_mock_session';

function getStoredSession() {
  if (typeof window === 'undefined') return null;
  try {
    const stored = localStorage.getItem(SESSION_KEY);
    if (stored) {
      const session = JSON.parse(stored);
      // Check if session is still valid (24h expiry)
      if (session.expires_at && Date.now() < session.expires_at) {
        return session;
      }
      localStorage.removeItem(SESSION_KEY);
    }
  } catch {
    // Ignore
  }
  return null;
}

function createSession() {
  const session = {
    access_token: 'mock-access-token-' + Date.now(),
    refresh_token: 'mock-refresh-token-' + Date.now(),
    expires_in: 86400,
    expires_at: Date.now() + 86400000, // 24 hours
    token_type: 'bearer',
    user: DEMO_USER,
  };
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    } catch {
      // Ignore
    }
  }
  return session;
}

function createMockAuth() {
  return {
    getUser: async () => {
      const session = getStoredSession();
      if (session) {
        return { data: { user: session.user }, error: null };
      }
      return { data: { user: null }, error: { message: 'Not authenticated' } };
    },
    getSession: async () => {
      const session = getStoredSession();
      return { data: { session }, error: null };
    },
    signInWithPassword: async ({ email, password }: { email: string; password: string }) => {
      // Accept any credentials for demo
      if (email && password && password.length >= 4) {
        const user = { ...DEMO_USER, email };
        const session = createSession();
        session.user = user;
        if (typeof window !== 'undefined') {
          try {
            localStorage.setItem(SESSION_KEY, JSON.stringify(session));
          } catch {
            // Ignore
          }
        }
        return { data: { user, session }, error: null };
      }
      return {
        data: { user: null, session: null },
        error: { message: 'Invalid credentials' },
      };
    },
    signUp: async ({ email, password, options }: { email: string; password: string; options?: any }) => {
      const name = options?.data?.full_name || email.split('@')[0];
      const user = { ...DEMO_USER, email, user_metadata: { full_name: name } };
      const session = createSession();
      session.user = user;
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem(SESSION_KEY, JSON.stringify(session));
        } catch {
          // Ignore
        }
      }
      return { data: { user, session }, error: null };
    },
    signInWithOAuth: async (options?: any) => {
      // Mock OAuth - just sign in as demo user
      const session = createSession();
      return { data: { provider: options?.provider || 'google', url: null }, error: null };
    },
    signOut: async () => {
      if (typeof window !== 'undefined') {
        try {
          localStorage.removeItem(SESSION_KEY);
        } catch {
          // Ignore
        }
      }
      return { error: null };
    },
    resetPasswordForEmail: async (email?: string, options?: any) => {
      return { data: {}, error: null };
    },
    refreshSession: async () => {
      const session = getStoredSession();
      if (session) {
        const newSession = createSession();
        newSession.user = session.user;
        if (typeof window !== 'undefined') {
          try {
            localStorage.setItem(SESSION_KEY, JSON.stringify(newSession));
          } catch {
            // Ignore
          }
        }
        return { data: { session: newSession }, error: null };
      }
      return { data: { session: null }, error: null };
    },
    onAuthStateChange: (callback: any, options?: any) => {
      // Immediately check for existing session
      const session = getStoredSession();
      if (session) {
        // Call back asynchronously to mimic Supabase behavior
        setTimeout(() => callback('SIGNED_IN', session), 100);
      }
      return {
        data: {
          subscription: {
            unsubscribe: () => {},
          },
        },
      };
    },
  };
}

function createMockClient() {
  return {
    auth: createMockAuth(),
    from: () => ({
      select: () => ({ eq: () => ({ single: async () => ({ data: null, error: null }) }) }),
    }),
  };
}

export const createClient = () => createMockClient();
