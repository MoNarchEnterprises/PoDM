import { knowledgeGraph } from './knowledgeGraph';
import { markdownLoader } from './markdownLoader';
import { ollamaClient } from './ollamaClient';
import {
  chunkArchitecture, chunkModule, chunkService, chunkEntity, chunkRoute,
  chunkPage, chunkComponent, chunkWorkflow, chunkDiagram, chunkExternalSystem,
  chunkEvent, chunkQueue, chunkAgent, chunkMarkdown,
} from './chunker';
import type { EmbeddingChunk, EmbeddingEntry, EmbeddingMatch, EmbeddingIndexStatus } from '../types';

const STORAGE_KEY = 'podm-architecture-embeddings';
const STORAGE_VERSION = 1;

const ARCHITECTURE_DOCS = [
  '00-session-notes.md',
  '01-documentation-plan.md',
  '01-repository-inventory.md',
  '02-dependency-map.md',
  '03-architecture-kb.md',
  '04-business-capabilities.md',
  '05-user-journeys.md',
  '06-frontend-architecture.md',
  '07-cross-cutting-concerns.md',
  '08-crypto-deep-dive.md',
  '08-diagram-index.md',
  '09-quality-report.md',
  '09-testing-monitoring.md',
  '10-internal-workflows.md',
  '11-data-flow.md',
  '12-maintenance.md',
];

export interface RetrieveOptions {
  topK?: number;
  minScore?: number;
}

export interface IndexResult {
  total: number;
  embedded: number;
  cached: number;
  failed: number;
}

interface StoredPayload {
  version: number;
  model: string;
  entries: EmbeddingEntry[];
}

type ProgressListener = (done: number, total: number) => void;
type StatusListener = (status: EmbeddingIndexStatus) => void;

class EmbeddingService {
  private entries = new Map<string, EmbeddingEntry>();
  private chunks: EmbeddingChunk[] = [];
  private indexing = false;
  private indexed = false;
  private modelAvailable = false;
  private modelName = 'nomic-embed-text';
  private progress = { done: 0, total: 0 };
  private progressListeners = new Set<ProgressListener>();
  private statusListeners = new Set<StatusListener>();

  setModel(name: string): void {
    if (name && name !== this.modelName) {
      this.modelName = name;
      this.indexed = false;
      this.entries.clear();
      this.notifyStatus();
    }
  }

  isIndexed(): boolean { return this.indexed; }
  isIndexing(): boolean { return this.indexing; }
  isModelAvailable(): boolean { return this.modelAvailable; }
  getModel(): string { return this.modelName; }
  getChunkCount(): number { return this.entries.size; }

  onProgress(listener: ProgressListener): () => void {
    this.progressListeners.add(listener);
    return () => this.progressListeners.delete(listener);
  }

  onStatus(listener: StatusListener): () => void {
    this.statusListeners.add(listener);
    listener(this.getStatus());
    return () => this.statusListeners.delete(listener);
  }

  getStatus(): EmbeddingIndexStatus {
    return {
      indexed: this.indexed,
      indexing: this.indexing,
      progress: { ...this.progress },
      chunks: this.entries.size,
      model: this.modelName,
      modelAvailable: this.modelAvailable,
      storageKey: STORAGE_KEY,
    };
  }

  async checkModel(): Promise<boolean> {
    this.modelAvailable = await ollamaClient.isModelAvailable(this.modelName);
    this.notifyStatus();
    return this.modelAvailable;
  }

  setModelAvailable(available: boolean): void {
    this.modelAvailable = available;
    this.notifyStatus();
  }

  private notifyProgress(): void {
    for (const l of this.progressListeners) l(this.progress.done, this.progress.total);
  }

  private notifyStatus(): void {
    const status = this.getStatus();
    for (const l of this.statusListeners) l(status);
  }

  private buildChunks(): EmbeddingChunk[] {
    const chunks: EmbeddingChunk[] = [];
    const kg = knowledgeGraph;

    const arch = kg.getArchitecture();
    if (arch) chunks.push(chunkArchitecture(arch));

    kg.getModules().forEach((m) => chunks.push(chunkModule(m)));
    kg.getServices().forEach((s) => chunks.push(chunkService(s)));
    kg.getEntities().forEach((e) => chunks.push(chunkEntity(e)));
    kg.getRoutes().forEach((r) => chunks.push(chunkRoute(r)));
    kg.getPages().forEach((p) => chunks.push(chunkPage(p)));
    kg.getComponents().forEach((c) => chunks.push(chunkComponent(c)));
    kg.getWorkflows().forEach((w) => chunks.push(chunkWorkflow(w)));
    kg.getDiagrams().forEach((d) => chunks.push(chunkDiagram(d)));
    kg.getExternalSystems().forEach((e) => chunks.push(chunkExternalSystem(e)));
    kg.getEvents().forEach((e) => chunks.push(chunkEvent(e)));
    kg.getQueues().forEach((q) => chunks.push(chunkQueue(q)));
    kg.getAgents().forEach((a) => chunks.push(chunkAgent(a)));

    return chunks;
  }

  async buildAllChunks(): Promise<EmbeddingChunk[]> {
    const entityChunks = this.buildChunks();
    const mdChunks: EmbeddingChunk[] = [];
    for (const file of ARCHITECTURE_DOCS) {
      try {
        const text = await markdownLoader.loadArchitectureDoc(file);
        const parts = chunkMarkdown(text, `docs/architecture/${file}`);
        mdChunks.push(...parts);
      } catch (err) {
        console.warn(`[EmbeddingService] Failed to load ${file}`, err);
      }
    }
    return [...entityChunks, ...mdChunks];
  }

  private loadFromStorage(): StoredPayload | null {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as StoredPayload;
      if (!parsed || parsed.version !== STORAGE_VERSION) return null;
      if (parsed.model !== this.modelName) return null;
      return parsed;
    } catch {
      return null;
    }
  }

  private saveToStorage(payload: StoredPayload): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch (err) {
      console.warn('[EmbeddingService] Failed to persist embeddings to localStorage', err);
    }
  }

  async index(
    options?: { force?: boolean; onPullRequest?: () => Promise<boolean> },
  ): Promise<IndexResult> {
    if (this.indexed && !options?.force) {
      return { total: this.entries.size, embedded: 0, cached: this.entries.size, failed: 0 };
    }
    if (this.indexing) {
      return { total: this.progress.total, embedded: this.progress.done, cached: 0, failed: 0 };
    }

    this.indexing = true;
    this.notifyStatus();
    const result: IndexResult = { total: 0, embedded: 0, cached: 0, failed: 0 };

    try {
      const available = await this.checkModel();
      if (!available) {
        if (!options?.onPullRequest) {
          this.indexing = false;
          this.notifyStatus();
          return result;
        }
        const accepted = await options.onPullRequest();
        if (!accepted) {
          this.indexing = false;
          this.notifyStatus();
          return result;
        }
        try {
          await ollamaClient.pullModel(this.modelName);
          await this.checkModel();
        } catch (err) {
          console.error('[EmbeddingService] Pull failed', err);
          this.indexing = false;
          this.notifyStatus();
          return result;
        }
      }

      this.chunks = await this.buildAllChunks();
      const cached = this.loadFromStorage();
      const cacheById = new Map<string, EmbeddingEntry>();
      if (cached?.entries) {
        for (const e of cached.entries) cacheById.set(e.id, e);
      }

      this.progress = { done: 0, total: this.chunks.length };
      this.notifyProgress();

      const kept: EmbeddingEntry[] = [];
      for (const chunk of this.chunks) {
        this.progress.done++;
        result.total++;

        const cached_entry = cacheById.get(chunk.id);
        if (cached_entry && cached_entry.hash === chunk.hash && cached_entry.vector?.length) {
          kept.push({ ...chunk, vector: cached_entry.vector });
          result.cached++;
          this.notifyProgress();
          continue;
        }

        try {
          const vector = await ollamaClient.embed(chunk.text, this.modelName);
          const entry: EmbeddingEntry = { ...chunk, vector };
          kept.push(entry);
          result.embedded++;
        } catch (err) {
          console.warn(`[EmbeddingService] Failed to embed ${chunk.id}`, err);
          result.failed++;
        }
        this.notifyProgress();
      }

      this.entries.clear();
      kept.forEach((e) => this.entries.set(e.id, e));

      this.saveToStorage({
        version: STORAGE_VERSION,
        model: this.modelName,
        entries: kept,
      });

      this.indexed = result.failed === 0 || kept.length > 0;
      this.notifyStatus();
      return result;
    } finally {
      this.indexing = false;
      this.notifyStatus();
    }
  }

  async retrieve(query: string, opts: RetrieveOptions = {}): Promise<EmbeddingMatch[]> {
    const topK = opts.topK ?? 8;
    const minScore = opts.minScore ?? 0.15;
    if (!query.trim() || this.entries.size === 0) return [];

    let queryVec: number[];
    try {
      queryVec = await ollamaClient.embed(query, this.modelName);
    } catch (err) {
      console.warn('[EmbeddingService] Failed to embed query', err);
      return [];
    }

    const matches: EmbeddingMatch[] = [];
    for (const entry of this.entries.values()) {
      const score = cosineSimilarity(queryVec, entry.vector);
      if (score >= minScore) matches.push({ entry, score });
    }
    matches.sort((a, b) => b.score - a.score);
    return matches.slice(0, topK);
  }

  getEntry(id: string): EmbeddingEntry | undefined {
    return this.entries.get(id);
  }

  clear(): void {
    this.entries.clear();
    this.chunks = [];
    this.indexed = false;
    this.progress = { done: 0, total: 0 };
    try { localStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
    this.notifyStatus();
  }
}

export function cosineSimilarity(a: number[], b: number[]): number {
  if (!a || !b || a.length !== b.length || a.length === 0) return 0;
  let dot = 0;
  let magA = 0;
  let magB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    magA += a[i] * a[i];
    magB += b[i] * b[i];
  }
  const denom = Math.sqrt(magA) * Math.sqrt(magB);
  return denom === 0 ? 0 : dot / denom;
}

export const embeddingService = new EmbeddingService();
