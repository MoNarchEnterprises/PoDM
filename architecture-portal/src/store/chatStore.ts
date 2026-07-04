import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ChatMessage } from '../types';

interface ChatStore {
  messages: ChatMessage[];
  isLoading: boolean;
  error: string | null;
  addMessage: (message: ChatMessage) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearMessages: () => void;
  addContextMessage: (content: string, sources?: ChatMessage['sources']) => void;
}

export const useChatStore = create<ChatStore>()(
  persist(
    (set) => ({
      messages: [],
      isLoading: false,
      error: null,
      addMessage: (message) =>
        set((state) => ({ messages: [...state.messages, message] })),
      setLoading: (isLoading) => set({ isLoading }),
      setError: (error) => set({ error }),
      clearMessages: () => set({ messages: [], error: null }),
      addContextMessage: (content, sources) =>
        set((state) => {
          const msg: ChatMessage = {
            id: crypto.randomUUID(),
            role: 'system',
            content,
            timestamp: Date.now(),
            sources,
          };
          return { messages: [...state.messages, msg] };
        }),
    }),
    { name: 'podm-architecture-chat' }
  )
);
