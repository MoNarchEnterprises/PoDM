import type {
  OllamaModel, OllamaGenerateRequest, OllamaGenerateResponse,
  OllamaChatRequest, OllamaChatResponse, OllamaTagsResponse,
} from '../types';

export interface AIProvider {
  name: string;
  listModels(): Promise<OllamaModel[]>;
  chat(request: OllamaChatRequest): Promise<OllamaChatResponse>;
  chatStream(request: OllamaChatRequest): Promise<ReadableStream<Uint8Array>>;
  generate(request: OllamaGenerateRequest): Promise<OllamaGenerateResponse>;
}

class OllamaClient implements AIProvider {
  name = 'ollama';
  private baseUrl: string;

  constructor(baseUrl = 'http://localhost:11434') {
    this.baseUrl = baseUrl;
  }

  setBaseUrl(url: string): void {
    this.baseUrl = url;
  }

  async listModels(): Promise<OllamaModel[]> {
    try {
      const resp = await fetch(`${this.baseUrl}/api/tags`);
      if (!resp.ok) throw new Error(`Failed to list models: ${resp.status}`);
      const data: OllamaTagsResponse = await resp.json();
      return data.models || [];
    } catch (err) {
      console.error('Ollama list models error:', err);
      return [];
    }
  }

  async chat(request: OllamaChatRequest): Promise<OllamaChatResponse> {
    const resp = await fetch(`${this.baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...request, stream: false }),
    });
    if (!resp.ok) throw new Error(`Chat failed: ${resp.status}`);
    return resp.json();
  }

  async chatStream(request: OllamaChatRequest): Promise<ReadableStream<Uint8Array>> {
    const resp = await fetch(`${this.baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...request, stream: true }),
    });
    if (!resp.ok) throw new Error(`Chat stream failed: ${resp.status}`);
    return resp.body!;
  }

  async generate(request: OllamaGenerateRequest): Promise<OllamaGenerateResponse> {
    const resp = await fetch(`${this.baseUrl}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });
    if (!resp.ok) throw new Error(`Generate failed: ${resp.status}`);
    return resp.json();
  }

  async testConnection(): Promise<boolean> {
    try {
      const resp = await fetch(`${this.baseUrl}/api/tags`, { method: 'GET', signal: AbortSignal.timeout(5000) });
      return resp.ok;
    } catch {
      return false;
    }
  }
}

export const ollamaClient = new OllamaClient();

export function createAIProvider(type: string, baseUrl: string): AIProvider {
  switch (type) {
    case 'ollama':
      return new OllamaClient(baseUrl);
    default:
      return new OllamaClient(baseUrl);
  }
}
