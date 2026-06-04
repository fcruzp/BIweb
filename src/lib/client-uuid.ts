/**
 * Generate a unique ID on the client side.
 * Uses crypto.randomUUID() when available (secure contexts / HTTPS),
 * falls back to a timestamp + random string for non-secure contexts (HTTP).
 */
export function generateId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  // Fallback for non-secure contexts (HTTP) where crypto.randomUUID is not available
  return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
}
