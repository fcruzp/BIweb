import { create } from 'zustand';

export interface VisualizationConfig {
  chartType: 'bar' | 'line' | 'pie' | 'scatter' | 'area' | 'table' | 'metric' | 'heatmap';
  title: string;
  description: string;
  xAxis?: string;
  yAxis?: string[];
  colorBy?: string;
  metrics?: Array<{ label: string; value: number; format?: string }>;
  /** Province column name for heatmap visualization */
  provinceColumn?: string;
  /** Value column name for heatmap visualization */
  valueColumn?: string;
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

/** Stage info for streaming progress display */
export interface StreamingStage {
  stage: string;         // 'generating_sql' | 'executing' | 'retrying' | 'analyzing'
  message: string;       // Localized human-readable message
  sql?: string;          // SQL query (when available)
  attempt?: number;      // Retry attempt number
}

interface ChatState {
  messages: ChatMessage[];
  isLoading: boolean;
  error: string | null;
  currentVisualization: VisualizationConfig | null;
  currentQueryResult: QueryResult | null;
  currentSQL: string | null;

  // Streaming state
  streamingStage: StreamingStage | null;
  streamingMessage: Partial<ChatMessage> | null;  // Partial assistant message being built

  // Actions
  addMessage: (message: ChatMessage) => void;
  setMessages: (messages: ChatMessage[]) => void;
  clearMessages: () => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setCurrentVisualization: (viz: VisualizationConfig | null) => void;
  setCurrentQueryResult: (result: QueryResult | null) => void;
  setCurrentSQL: (sql: string | null) => void;
  setStreamingStage: (stage: StreamingStage | null) => void;
  setStreamingMessage: (message: Partial<ChatMessage> | null) => void;
  loadMessages: (sessionId: string) => Promise<void>;
}

export const useChatStore = create<ChatState>((set) => ({
  messages: [],
  isLoading: false,
  error: null,
  currentVisualization: null,
  currentQueryResult: null,
  currentSQL: null,
  streamingStage: null,
  streamingMessage: null,

  addMessage: (message) =>
    set((state) => ({ messages: [...state.messages, message] })),
  setMessages: (messages) => set({ messages }),
  clearMessages: () =>
    set({
      messages: [],
      currentVisualization: null,
      currentQueryResult: null,
      currentSQL: null,
      streamingStage: null,
      streamingMessage: null,
    }),
  setLoading: (loading) => set({ isLoading: loading }),
  setError: (error) => set({ error }),
  setCurrentVisualization: (viz) => set({ currentVisualization: viz }),
  setCurrentQueryResult: (result) => set({ currentQueryResult: result }),
  setCurrentSQL: (sql) => set({ currentSQL: sql }),
  setStreamingStage: (stage) => set({ streamingStage: stage }),
  setStreamingMessage: (message) => set({ streamingMessage: message }),
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
        }) => {
          // Parse queryResult — may be a JSON string from DB or already an object from API
          let parsedQueryResult: QueryResult | null = null;
          if (msg.queryResult) {
            try {
              const raw = typeof msg.queryResult === 'string'
                ? JSON.parse(msg.queryResult)
                : msg.queryResult;

              if (raw && typeof raw === 'object') {
                // Handle old format: raw is a bare array of rows (no data/columns wrapper)
                if (Array.isArray(raw)) {
                  parsedQueryResult = {
                    data: raw,
                    columns: raw.length > 0 ? Object.keys(raw[0]) : [],
                    rowCount: raw.length,
                    totalRowCount: raw.length,
                    executionTime: 0,
                  };
                } else {
                  // New format: raw is a full QueryResult object
                  // Ensure data is an array (could be double-encoded string)
                  if (typeof raw.data === 'string') {
                    try { raw.data = JSON.parse(raw.data); } catch { /* keep as-is */ }
                  }
                  // Ensure columns exists
                  if (!raw.columns && Array.isArray(raw.data) && raw.data.length > 0) {
                    raw.columns = Object.keys(raw.data[0]);
                  }
                  parsedQueryResult = raw as QueryResult;
                }
              }
            } catch {
              parsedQueryResult = null;
            }
          }

          // Parse visualization — same defensive approach
          let parsedVisualization: VisualizationConfig | null = null;
          if (msg.visualization) {
            try {
              const raw = typeof msg.visualization === 'string'
                ? JSON.parse(msg.visualization)
                : msg.visualization;
              parsedVisualization = raw as VisualizationConfig;
            } catch {
              parsedVisualization = null;
            }
          }

          return {
            id: msg.id,
            role: msg.role as 'user' | 'assistant' | 'system',
            content: msg.content,
            sqlQuery: msg.sqlQuery || null,
            queryResult: parsedQueryResult,
            visualization: parsedVisualization,
            timestamp: new Date(msg.createdAt),
          };
        }
      );
      set({
        messages: loadedMessages,
        currentVisualization: null,
        currentQueryResult: null,
        currentSQL: null,
        isLoading: false,
        streamingStage: null,
        streamingMessage: null,
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to load messages';
      set({ error: errorMessage, isLoading: false });
    }
  },
}));
