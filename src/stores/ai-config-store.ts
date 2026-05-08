import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type AIProvider = 'z-ai' | 'openrouter';

export interface AIModelOption {
  id: string;
  name: string;
  provider: AIProvider;
  description: string;
}

/** All available models across providers */
export const AVAILABLE_MODELS: AIModelOption[] = [
  // Z-AI (built-in, no key needed)
  { id: 'auto', name: 'Auto (Default)', provider: 'z-ai', description: 'z-ai-web-dev-sdk built-in model — works out of the box, no API key needed' },

  // OpenRouter — Anthropic
  { id: 'anthropic/claude-sonnet-4', name: 'Claude Sonnet 4', provider: 'openrouter', description: 'Latest Anthropic model — excellent for SQL and data analysis' },
  { id: 'anthropic/claude-3.5-sonnet', name: 'Claude 3.5 Sonnet', provider: 'openrouter', description: 'Fast and capable — great balance of speed and quality' },
  { id: 'anthropic/claude-3.5-haiku', name: 'Claude 3.5 Haiku', provider: 'openrouter', description: 'Ultra-fast — ideal for simple queries' },

  // OpenRouter — Google
  { id: 'google/gemini-2.5-flash-preview', name: 'Gemini 2.5 Flash', provider: 'openrouter', description: 'Google\'s fast multimodal model — great for structured outputs' },
  { id: 'google/gemini-2.0-flash-001', name: 'Gemini 2.0 Flash', provider: 'openrouter', description: 'Fast and versatile — good for most tasks' },

  // OpenRouter — xAI
  { id: 'x-ai/grok-3-mini-beta', name: 'Grok 3 Mini', provider: 'openrouter', description: 'xAI\'s efficient model — fast responses' },
  { id: 'x-ai/grok-3-beta', name: 'Grok 3', provider: 'openrouter', description: 'xAI\'s flagship model — powerful reasoning' },

  // OpenRouter — Meta
  { id: 'meta-llama/llama-4-maverick', name: 'Llama 4 Maverick', provider: 'openrouter', description: 'Meta\'s open model — good quality, cost-effective' },
  { id: 'meta-llama/llama-3.3-70b-instruct', name: 'Llama 3.3 70B', provider: 'openrouter', description: 'Strong open-source model — reliable for SQL generation' },

  // OpenRouter — Mistral
  { id: 'mistralai/mistral-large-2411', name: 'Mistral Large', provider: 'openrouter', description: 'Mistral\'s top model — excellent for code and analysis' },
  { id: 'mistralai/ministral-8b', name: 'MiniStral 8B', provider: 'openrouter', description: 'Tiny and fast — budget-friendly option' },

  // OpenRouter — DeepSeek
  { id: 'deepseek/deepseek-chat-v3-0324', name: 'DeepSeek V3', provider: 'openrouter', description: 'High-quality reasoning — great for complex SQL' },
  { id: 'deepseek/deepseek-r1', name: 'DeepSeek R1', provider: 'openrouter', description: 'Reasoning model — best for complex analytical queries' },
];

export interface AIConfigState {
  /** Active AI provider */
  provider: AIProvider;

  /** OpenRouter API key (stored locally in browser) */
  openrouterApiKey: string;

  /** Selected model ID */
  modelId: string;

  /** Custom model ID (if user types a model not in the list) */
  customModelId: string;

  /** Whether to use custom model instead of predefined */
  useCustomModel: boolean;

  /** Temperature for AI completions (0-1) */
  temperature: number;

  /** Max tokens for responses */
  maxTokens: number;

  // Actions
  setProvider: (provider: AIProvider) => void;
  setOpenRouterApiKey: (key: string) => void;
  setModelId: (id: string) => void;
  setCustomModelId: (id: string) => void;
  setUseCustomModel: (use: boolean) => void;
  setTemperature: (temp: number) => void;
  setMaxTokens: (tokens: number) => void;
  getEffectiveModelId: () => string;
  isConfigured: () => boolean;
}

export const useAIConfigStore = create<AIConfigState>()(
  persist(
    (set, get) => ({
      provider: 'z-ai',
      openrouterApiKey: '',
      modelId: 'auto',
      customModelId: '',
      useCustomModel: false,
      temperature: 0.3,
      maxTokens: 4096,

      setProvider: (provider) =>
        set({
          provider,
          // Reset model when switching provider
          modelId: provider === 'z-ai' ? 'auto' : 'anthropic/claude-sonnet-4',
        }),

      setOpenRouterApiKey: (key) => set({ openrouterApiKey: key }),

      setModelId: (id) => set({ modelId: id }),

      setCustomModelId: (id) => set({ customModelId: id }),

      setUseCustomModel: (use) => set({ useCustomModel: use }),

      setTemperature: (temp) => set({ temperature: temp }),

      setMaxTokens: (tokens) => set({ maxTokens: tokens }),

      getEffectiveModelId: () => {
        const state = get();
        if (state.useCustomModel && state.customModelId) {
          return state.customModelId;
        }
        return state.modelId;
      },

      isConfigured: () => {
        const state = get();
        if (state.provider === 'z-ai') return true; // No key needed
        if (state.provider === 'openrouter') return state.openrouterApiKey.length > 0;
        return false;
      },
    }),
    {
      name: 'datamind-ai-config',
      // Only persist safe fields (NOT the API key in production — but for this app it's localStorage)
      partialize: (state) => ({
        provider: state.provider,
        openrouterApiKey: state.openrouterApiKey,
        modelId: state.modelId,
        customModelId: state.customModelId,
        useCustomModel: state.useCustomModel,
        temperature: state.temperature,
        maxTokens: state.maxTokens,
      }),
    }
  )
);
