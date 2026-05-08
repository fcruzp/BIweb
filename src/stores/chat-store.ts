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
  loadMessages: (sessionId: string) => Promise<void>;
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
  loadMessages: async (sessionId: string) => {
    try {
      set({ isLoading: true, error: null });
      const res = await fetch(`/api/chat/sessions/${sessionId}/messages`);
      if (!res.ok) {
        throw new Error('Failed to load messages');
      }
      const data = await res.json();
      const loadedMessages: ChatMessage[] = data.messages.map(
        (msg: {
          id: string;
          role: string;
          content: string;
          sqlQuery?: string | null;
          queryResult?: string | null;
          visualization?: string | null;
          createdAt: string;
        }) => ({
          id: msg.id,
          role: msg.role as 'user' | 'assistant' | 'system',
          content: msg.content,
          sqlQuery: msg.sqlQuery || null,
          queryResult: msg.queryResult
            ? (JSON.parse(msg.queryResult) as QueryResult)
            : null,
          visualization: msg.visualization
            ? (JSON.parse(msg.visualization) as VisualizationConfig)
            : null,
          timestamp: new Date(msg.createdAt),
        })
      );
      set({
        messages: loadedMessages,
        currentVisualization: null,
        currentQueryResult: null,
        currentSQL: null,
        isLoading: false,
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to load messages';
      set({ error: errorMessage, isLoading: false });
    }
  },
}));
