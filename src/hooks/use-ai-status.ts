'use client';

import { create } from 'zustand';
import { authFetch } from '@/lib/fetch-utils';

type AIStatus = 'unknown' | 'checking' | 'ok' | 'error';

interface AIStatusState {
  status: AIStatus;
  errorMessage: string | null;
  lastChecked: number | null;
  check: () => Promise<void>;
}

/**
 * Zustand store for AI connection status.
 * Shared across any component that needs to show AI health.
 * Checked once on auth, then on-demand (not polled).
 */
export const useAIStatusStore = create<AIStatusState>((set) => ({
  status: 'unknown',
  errorMessage: null,
  lastChecked: null,

  check: async () => {
    set({ status: 'checking' });
    try {
      const res = await authFetch('/api/ai/check', { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          set({ status: 'ok', errorMessage: null, lastChecked: Date.now() });
        } else {
          set({ status: 'error', errorMessage: data.error || 'AI connection failed', lastChecked: Date.now() });
        }
      } else {
        const data = await res.json().catch(() => ({}));
        set({ status: 'error', errorMessage: data.error || `HTTP ${res.status}`, lastChecked: Date.now() });
      }
    } catch (err) {
      set({
        status: 'error',
        errorMessage: err instanceof Error ? err.message : 'Network error',
        lastChecked: Date.now(),
      });
    }
  },
}));

/** Convenience hook — returns the AI status state */
export function useAIStatus() {
  const status = useAIStatusStore((s) => s.status);
  const errorMessage = useAIStatusStore((s) => s.errorMessage);
  const lastChecked = useAIStatusStore((s) => s.lastChecked);
  const check = useAIStatusStore((s) => s.check);
  return { status, errorMessage, lastChecked, check };
}
