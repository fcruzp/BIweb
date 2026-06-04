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
  clearHistoryByDataSourceId: (dataSourceId: string) => void;
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
      clearHistoryByDataSourceId: (dataSourceId) =>
        set((state) => {
          // History items are loaded per-dataSource and tracked via lastDataSourceId.
          // If the deleted dataSource is the one currently shown, clear everything.
          if (state.lastDataSourceId === dataSourceId) {
            return { history: [], lastDataSourceId: null };
          }
          return state;
        }),
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
