/**
 * Mock Supabase server client for local development.
 * Returns the same demo user as the client-side mock.
 */

const DEMO_SUPABASE_ID = 'demo-user-00000001';

function createMockServerAuth() {
  return {
    getUser: async () => {
      // Always return the demo user for server-side operations
      return {
        data: {
          user: {
            id: DEMO_SUPABASE_ID,
            email: 'demo@datamind.local',
            user_metadata: {
              full_name: 'Demo User',
              avatar_url: null,
            },
            app_metadata: {},
            aud: 'authenticated',
            created_at: new Date().toISOString(),
            role: 'authenticated',
          },
        },
        error: null,
      };
    },
    getSession: async () => {
      return {
        data: {
          session: {
            access_token: 'mock-server-token',
            user: {
              id: DEMO_SUPABASE_ID,
              email: 'demo@datamind.local',
            },
          },
        },
        error: null,
      };
    },
    exchangeCodeForSession: async (code: string) => {
      // Mock code exchange - just return a session
      return {
        data: {
          session: {
            access_token: 'mock-server-token-' + code,
            user: {
              id: DEMO_SUPABASE_ID,
              email: 'demo@datamind.local',
              user_metadata: {
                full_name: 'Demo User',
                avatar_url: null,
              },
            },
          },
          user: {
            id: DEMO_SUPABASE_ID,
            email: 'demo@datamind.local',
            user_metadata: {
              full_name: 'Demo User',
              avatar_url: null,
            },
          },
        },
        error: null,
      };
    },
  };
}

function createMockServerClient() {
  return {
    auth: createMockServerAuth(),
    from: () => ({
      select: () => ({ eq: () => ({ single: async () => ({ data: null, error: null }) }) }),
    }),
  };
}

export const createClient = async () => createMockServerClient();
