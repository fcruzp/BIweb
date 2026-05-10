/**
 * Auth-aware fetch utilities.
 *
 * Prevents the infinite 401 retry loop that occurs when the session expires:
 * - On 401, does NOT retry (unlike regular fetch which React may re-trigger)
 * - On 401, dispatches a global event so AuthProvider can handle it
 * - Provides a hook-friendly wrapper for data fetching components
 */

/** Global event name dispatched when a 401 is detected */
export const AUTH_EXPIRED_EVENT = 'datamind:auth-expired';

/**
 * Auth-aware fetch wrapper.
 *
 * Same as `fetch()` but:
 * 1. Never retries on 401 (prevents infinite loops)
 * 2. Dispatches `AUTH_EXPIRED_EVENT` on 401 so the app can react
 * 3. Returns the response as-is (caller must check `.ok`)
 */
export async function authFetch(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> {
  const res = await fetch(input, init);

  if (res.status === 401) {
    // Dispatch a global event — AuthProvider or layout can listen for this
    // to trigger re-auth or sign-out
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(AUTH_EXPIRED_EVENT, {
        detail: { url: typeof input === 'string' ? input : input instanceof URL ? input.href : input.url },
      }));
    }
  }

  return res;
}

/**
 * Check if a response is an auth error (401).
 * Useful for conditional retry logic: only retry on non-401 errors.
 */
export function isAuthError(res: Response): boolean {
  return res.status === 401;
}
