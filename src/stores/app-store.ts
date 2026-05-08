import { create } from 'zustand';

export type AppView = 'chat' | 'dashboard' | 'history' | 'schema';

export interface DataSourceInfo {
  id: string;
  name: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  status: string;
  errorMessage?: string | null;
  createdAt: string;
  schemas?: Array<{
    id: string;
    tableName: string;
    columns: string; // JSON
    rowCount: number;
  }>;
  contexts?: Array<{
    id: string;
    semanticContext: string;
    summary: string;
  }>;
}

interface AppState {
  // Active selections
  activeDataSourceId: string | null;
  activeDashboardId: string | null;
  activeSessionId: string | null;
  currentView: AppView;

  // UI state
  sidebarOpen: boolean;
  sidebarCollapsed: boolean;

  // Data sources cache
  dataSources: DataSourceInfo[];
  dataSourcesLoading: boolean;

  // Actions
  setActiveDataSource: (id: string | null) => void;
  setActiveDashboard: (id: string | null) => void;
  setActiveSession: (id: string | null) => void;
  setCurrentView: (view: AppView) => void;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  setDataSources: (sources: DataSourceInfo[]) => void;
  setDataSourcesLoading: (loading: boolean) => void;
  addDataSource: (source: DataSourceInfo) => void;
  removeDataSource: (id: string) => void;
  updateDataSource: (id: string, updates: Partial<DataSourceInfo>) => void;
}

export const useAppStore = create<AppState>((set) => ({
  activeDataSourceId: null,
  activeDashboardId: null,
  activeSessionId: null,
  currentView: 'chat',
  sidebarOpen: true,
  sidebarCollapsed: false,
  dataSources: [],
  dataSourcesLoading: false,

  setActiveDataSource: (id) => set({ activeDataSourceId: id, activeSessionId: null }),
  setActiveDashboard: (id) => set({ activeDashboardId: id }),
  setActiveSession: (id) => set({ activeSessionId: id }),
  setCurrentView: (view) => set({ currentView: view }),
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
  setDataSources: (sources) => set({ dataSources: sources }),
  setDataSourcesLoading: (loading) => set({ dataSourcesLoading: loading }),
  addDataSource: (source) =>
    set((state) => ({ dataSources: [source, ...state.dataSources] })),
  removeDataSource: (id) =>
    set((state) => ({ dataSources: state.dataSources.filter((s) => s.id !== id) })),
  updateDataSource: (id, updates) =>
    set((state) => ({
      dataSources: state.dataSources.map((s) =>
        s.id === id ? { ...s, ...updates } : s
      ),
    })),
}));
