import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface HistoryItem {
  id: string;
  naturalQuery: string;
  sqlQuery: string;
  rowCount: number;
  executionTime: number;
  status: string;
  errorMessage: string | null;
  createdAt: string;
}

interface HistoryState {
  history: HistoryItem[];
  historyLoading: boolean;
  lastDataSourceId: string | null;

  setHistory: (history: HistoryItem[]) => void;
  setHistoryLoading: (loading: boolean) => void;
  setLastDataSourceId: (id: string | null) => void;
  addHistoryItem: (item: HistoryItem) => void;
  clearHistory: () => void;
}

export const useHistoryStore = create<HistoryState>()(
  persist(
    (set) => ({
      history: [],
      historyLoading: false,
      lastDataSourceId: null,

      setHistory: (history) => set({ history }),
      setHistoryLoading: (loading) => set({ historyLoading: loading }),
      setLastDataSourceId: (id) => set({ lastDataSourceId: id }),
      addHistoryItem: (item) =>
        set((state) => ({ history: [item, ...state.history] })),
      clearHistory: () => set({ history: [] }),
    }),
    {
      name: 'datamind-history-state',
      partialize: (state) => ({
        history: state.history.slice(0, 50),
        lastDataSourceId: state.lastDataSourceId,
      }),
    }
  )
);
