export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  sources?: ContextSource[];
}

export interface ContextSource {
  title: string;
  path: string;
  relevance: number;
}

export interface OllamaModel {
  name: string;
  modified_at: string;
  size: number;
}

export interface OllamaGenerateRequest {
  model: string;
  prompt: string;
  system?: string;
  template?: string;
  context?: number[];
  stream?: boolean;
  raw?: boolean;
  format?: string;
  options?: {
    temperature?: number;
    top_p?: number;
    top_k?: number;
    repeat_penalty?: number;
    num_predict?: number;
    num_ctx?: number;
    keep_alive?: string;
  };
}

export interface OllamaGenerateResponse {
  model: string;
  created_at: string;
  response: string;
  done: boolean;
  context?: number[];
  total_duration?: number;
  load_duration?: number;
  prompt_eval_count?: number;
  eval_count?: number;
  eval_duration?: number;
}

export interface OllamaChatRequest {
  model: string;
  messages: OllamaChatMessage[];
  stream?: boolean;
  options?: {
    temperature?: number;
    top_p?: number;
    top_k?: number;
    repeat_penalty?: number;
    num_predict?: number;
    num_ctx?: number;
    keep_alive?: string;
  };
}

export interface OllamaChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface OllamaChatResponse {
  model: string;
  created_at: string;
  message: OllamaChatMessage;
  done: boolean;
}

export interface OllamaTagsResponse {
  models: OllamaModel[];
}

export interface OllamaEmbeddingsRequest {
  model: string;
  prompt: string;
  options?: {
    temperature?: number;
    top_p?: number;
    top_k?: number;
    repeat_penalty?: number;
    num_predict?: number;
    num_ctx?: number;
    keep_alive?: string;
  };
}

export interface OllamaEmbeddingsResponse {
  model: string;
  embedding: number[];
}

export interface OllamaPullRequest {
  name: string;
  stream?: boolean;
}

export interface EmbeddingChunk {
  id: string;
  type: 'module' | 'service' | 'entity' | 'route' | 'page' | 'component' |
        'workflow' | 'diagram' | 'externalSystem' | 'event' | 'queue' |
        'agent' | 'architecture' | 'markdown';
  title: string;
  text: string;
  source: string;
  hash: string;
}

export interface EmbeddingEntry extends EmbeddingChunk {
  vector: number[];
}

export interface EmbeddingMatch {
  entry: EmbeddingEntry;
  score: number;
}

export interface EmbeddingIndexStatus {
  indexed: boolean;
  indexing: boolean;
  progress: { done: number; total: number };
  chunks: number;
  model: string;
  modelAvailable: boolean;
  storageKey: string;
}
