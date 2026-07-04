export interface AppSettings {
  ollamaUrl: string;
  defaultModel: string;
  embeddingModel: string;
  temperature: number;
  topP: number;
  topK: number;
  repeatPenalty: number;
  contextWindow: number;
  maxTokens: number;
  keepAlive: string;
  systemPrompt: string;
  streaming: boolean;
  theme: 'dark' | 'light';
  sidebarOpen: boolean;
}

export const DEFAULT_SETTINGS: AppSettings = {
  ollamaUrl: 'http://localhost:11434',
  defaultModel: '',
  embeddingModel: 'nomic-embed-text',
  temperature: 0.7,
  topP: 0.9,
  topK: 40,
  repeatPenalty: 1.1,
  contextWindow: 4096,
  maxTokens: 2048,
  keepAlive: '5m',
  systemPrompt: `You are an expert architecture assistant for the PoDM platform.
Answer questions using ONLY the provided documentation context. Do not analyze application source code.
Provide concise, accurate answers about architecture, modules, services, workflows, diagrams, and dependencies.`,
  streaming: true,
  theme: 'dark',
  sidebarOpen: true,
};
