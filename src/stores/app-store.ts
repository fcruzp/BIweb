import { create } from 'zustand';
import { persist } from 'zustand/middleware';

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

export interface ChatSessionInfo {
  id: string;
  title: string;
  dataSourceId: string;
  createdAt: string;
  updatedAt: string;
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

  // Data sources cache — PERSISTED for instant sidebar rendering
  dataSources: DataSourceInfo[];
  dataSourcesLoading: boolean;

  // Chat sessions cache — PERSISTED for instant sidebar rendering
  chatSessions: ChatSessionInfo[];
  chatSessionsLoading: boolean;

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
  setChatSessions: (sessions: ChatSessionInfo[]) => void;
  setChatSessionsLoading: (loading: boolean) => void;
  addChatSession: (session: ChatSessionInfo) => void;
  removeChatSession: (id: string) => void;
  updateChatSession: (id: string, updates: Partial<ChatSessionInfo>) => void;
  removeChatSessionsByDataSourceId: (dataSourceId: string) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      activeDataSourceId: null,
      activeDashboardId: null,
      activeSessionId: null,
      currentView: 'chat',
      sidebarOpen: true,
      sidebarCollapsed: false,
      dataSources: [],
      dataSourcesLoading: false,
      chatSessions: [],
      chatSessionsLoading: false,

      setActiveDataSource: (id) =>
        set({ activeDataSourceId: id, activeSessionId: null, chatSessions: [] }),
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
      setChatSessions: (sessions) => set({ chatSessions: sessions }),
      setChatSessionsLoading: (loading) => set({ chatSessionsLoading: loading }),
      addChatSession: (session) =>
        set((state) => ({ chatSessions: [session, ...state.chatSessions] })),
      removeChatSession: (id) =>
        set((state) => ({
          chatSessions: state.chatSessions.filter((s) => s.id !== id),
          activeSessionId:
            state.activeSessionId === id ? null : state.activeSessionId,
        })),
      updateChatSession: (id, updates) =>
        set((state) => ({
          chatSessions: state.chatSessions.map((s) =>
            s.id === id ? { ...s, ...updates } : s
          ),
        })),
      removeChatSessionsByDataSourceId: (dataSourceId) =>
        set((state) => {
          const remainingSessions = state.chatSessions.filter(
            (s) => s.dataSourceId !== dataSourceId
          );
          return {
            chatSessions: remainingSessions,
            activeSessionId:
              state.activeSessionId && !remainingSessions.some((s) => s.id === state.activeSessionId)
                ? null
                : state.activeSessionId,
          };
        }),
    }),
    {
      name: 'datamind-app-state',
      partialize: (state) => ({
        activeDataSourceId: state.activeDataSourceId,
        // Persist data sources and chat sessions for instant sidebar rendering
        // On next load, sidebar renders from cache immediately while refreshing in background
        dataSources: state.dataSources,
        chatSessions: state.chatSessions,
      }),
    }
  )
);
