import { create } from 'zustand';

export interface VisualizationConfig {
  chartType: 'bar' | 'line' | 'pie' | 'scatter' | 'area' | 'table' | 'metric';
  title: string;
  description: string;
  xAxis?: string;
  yAxis?: string[];
  colorBy?: string;
  metrics?: Array<{ label: string; value: number; format?: string }>;
}

export interface QueryResult {
  data: Array<Record<string, unknown>>;
  columns: string[];
  rowCount: number;
  totalRowCount: number;
  executionTime: number;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  sqlQuery?: string | null;
  explanation?: string;
  confidence?: number;
  queryResult?: QueryResult | null;
  visualization?: VisualizationConfig | null;
  timestamp: Date;
}

interface ChatState {
  messages: ChatMessage[];
  isLoading: boolean;
  error: string | null;
  currentVisualization: VisualizationConfig | null;
  currentQueryResult: QueryResult | null;
  currentSQL: string | null;

  // Actions
  addMessage: (message: ChatMessage) => void;
  setMessages: (messages: ChatMessage[]) => void;
  clearMessages: () => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setCurrentVisualization: (viz: VisualizationConfig | null) => void;
  setCurrentQueryResult: (result: QueryResult | null) => void;
  setCurrentSQL: (sql: string | null) => void;
}

export const useChatStore = create<ChatState>((set) => ({
  messages: [],
  isLoading: false,
  error: null,
  currentVisualization: null,
  currentQueryResult: null,
  currentSQL: null,

  addMessage: (message) =>
    set((state) => ({ messages: [...state.messages, message] })),
  setMessages: (messages) => set({ messages }),
  clearMessages: () =>
    set({
      messages: [],
      currentVisualization: null,
      currentQueryResult: null,
      currentSQL: null,
    }),
  setLoading: (loading) => set({ isLoading: loading }),
  setError: (error) => set({ error }),
  setCurrentVisualization: (viz) => set({ currentVisualization: viz }),
  setCurrentQueryResult: (result) => set({ currentQueryResult: result }),
  setCurrentSQL: (sql) => set({ currentSQL: sql }),
}));
