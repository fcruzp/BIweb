import { create } from 'zustand';

export interface WidgetConfig {
  id: string;
  title: string;
  widgetType: 'chart' | 'table' | 'metric' | 'text';
  dataSourceId?: string;
  sqlQuery?: string;
  visualization?: string; // JSON
  config: string; // JSON
  positionX: number;
  positionY: number;
  width: number;
  height: number;
}

export interface DashboardInfo {
  id: string;
  name: string;
  description?: string | null;
  layout: string; // JSON
  widgets: WidgetConfig[];
  createdAt: string;
  updatedAt: string;
}

interface DashboardState {
  dashboards: DashboardInfo[];
  activeDashboard: DashboardInfo | null;
  dashboardsLoading: boolean;
  editMode: boolean;

  // Actions
  setDashboards: (dashboards: DashboardInfo[]) => void;
  setActiveDashboard: (dashboard: DashboardInfo | null) => void;
  setDashboardsLoading: (loading: boolean) => void;
  setEditMode: (edit: boolean) => void;
  addDashboard: (dashboard: DashboardInfo) => void;
  removeDashboard: (id: string) => void;
  updateDashboard: (id: string, updates: Partial<DashboardInfo>) => void;
  addWidget: (dashboardId: string, widget: WidgetConfig) => void;
  removeWidget: (dashboardId: string, widgetId: string) => void;
}

export const useDashboardStore = create<DashboardState>((set) => ({
  dashboards: [],
  activeDashboard: null,
  dashboardsLoading: false,
  editMode: false,

  setDashboards: (dashboards) => set({ dashboards }),
  setActiveDashboard: (dashboard) => set({ activeDashboard: dashboard }),
  setDashboardsLoading: (loading) => set({ dashboardsLoading: loading }),
  setEditMode: (edit) => set({ editMode: edit }),
  addDashboard: (dashboard) =>
    set((state) => ({ dashboards: [dashboard, ...state.dashboards] })),
  removeDashboard: (id) =>
    set((state) => ({
      dashboards: state.dashboards.filter((d) => d.id !== id),
      activeDashboard:
        state.activeDashboard?.id === id ? null : state.activeDashboard,
    })),
  updateDashboard: (id, updates) =>
    set((state) => ({
      dashboards: state.dashboards.map((d) =>
        d.id === id ? { ...d, ...updates } : d
      ),
      activeDashboard:
        state.activeDashboard?.id === id
          ? { ...state.activeDashboard, ...updates }
          : state.activeDashboard,
    })),
  addWidget: (dashboardId, widget) =>
    set((state) => ({
      dashboards: state.dashboards.map((d) =>
        d.id === dashboardId
          ? { ...d, widgets: [...d.widgets, widget] }
          : d
      ),
      activeDashboard:
        state.activeDashboard?.id === dashboardId
          ? { ...state.activeDashboard, widgets: [...state.activeDashboard.widgets, widget] }
          : state.activeDashboard,
    })),
  removeWidget: (dashboardId, widgetId) =>
    set((state) => ({
      dashboards: state.dashboards.map((d) =>
        d.id === dashboardId
          ? { ...d, widgets: d.widgets.filter((w) => w.id !== widgetId) }
          : d
      ),
      activeDashboard:
        state.activeDashboard?.id === dashboardId
          ? { ...state.activeDashboard, widgets: state.activeDashboard.widgets.filter((w) => w.id !== widgetId) }
          : state.activeDashboard,
    })),
}));
