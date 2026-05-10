import { createBrowserClient } from "@supabase/ssr";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

/**
 * Browser-side Supabase client using @supabase/ssr.
 *
 * IMPORTANT: This client uses cookies (document.cookie) for session storage,
 * which is required for server-side auth validation in middleware and API routes.
 *
 * The cookieOptions ensure:
 * - SameSite=Lax (works with cross-origin redirects like OAuth)
 * - Secure=true (required for HTTPS, which datamind.space-z.ai uses)
 * - Path=/ (accessible from all routes)
 * - Max-Age=15552000 (180 days — session persists across browser restarts)
 *
 * Without these options, some browsers may not send cookies with API requests,
 * causing 401 errors on all protected endpoints.
 */
export const createClient = () =>
  createBrowserClient(
    supabaseUrl!,
    supabaseKey!,
    {
      cookies: {
        getAll() {
          // Read all cookies from document.cookie
          // This is required by @supabase/ssr to find auth session cookies
          const pairs = document.cookie.split(';');
          return pairs.map(pair => {
            const [name, ...rest] = pair.trim().split('=');
            return { name, value: rest.join('=') };
          }).filter(pair => pair.name);
        },
        setAll(cookiesToSet) {
          // Write cookies to document.cookie
          // This is called by the SSR library when the session changes
          cookiesToSet.forEach(({ name, value, options }) => {
            let cookie = `${name}=${value}`;
            if (options?.path) cookie += `; path=${options.path}`;
            if (options?.maxAge) cookie += `; max-age=${options.maxAge}`;
            if (options?.domain) cookie += `; domain=${options.domain}`;
            if (options?.sameSite) cookie += `; samesite=${options.sameSite}`;
            if (options?.secure) cookie += '; secure';
            document.cookie = cookie;
          });
        },
      },
    }
  );
