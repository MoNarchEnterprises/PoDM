import { knowledgeGraph } from './knowledgeGraph';
import { embeddingService } from './embeddingService';
import type {
  Module, Service, Workflow, Diagram,
  EmbeddingMatch, ContextSource,
} from '../types';

interface RagContext {
  content: string;
  sources: ContextSource[];
}

const STOP_WORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'but', 'if', 'else', 'so', 'as', 'at', 'by',
  'for', 'from', 'in', 'into', 'of', 'on', 'to', 'with', 'without', 'is', 'are',
  'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does',
  'did', 'doing', 'will', 'would', 'can', 'could', 'shall', 'should', 'may',
  'might', 'must', 'i', 'my', 'me', 'we', 'us', 'our', 'you', 'your', 'he',
  'she', 'it', 'its', 'they', 'them', 'their', 'this', 'that', 'these',
  'those', 'what', 'which', 'who', 'whom', 'whose', 'when', 'where', 'why',
  'how', 'all', 'any', 'both', 'each', 'few', 'more', 'most', 'other', 'some',
  'such', 'only', 'own', 'same', 'than', 'too', 'very', 'just', 'also', 'get',
  'got', 'go', 'goes', 'going', 'gone', 'about', 'above', 'after', 'again',
  'against', 'before', 'below', 'between', 'during', 'further', 'here',
  'there', 'then', 'once', 'out', 'over', 'under', 'up', 'down', 'off',
  'no', 'not', 'now', 's', 't', 'll', 've', 're', 'd', 'm',
]);

function extractKeywords(query: string): string[] {
  const raw = query.toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 1 && !STOP_WORDS.has(w));
  const seen = new Set<string>();
  const out: string[] = [];
  for (const w of raw) {
    if (!seen.has(w)) {
      seen.add(w);
      out.push(w);
    }
  }
  return out;
}

class RagService {
  async retrieveContext(query: string): Promise<RagContext> {
    if (embeddingService.isIndexed() && embeddingService.getChunkCount() > 0) {
      const matches = await embeddingService.retrieve(query, { topK: 8, minScore: 0.12 });
      if (matches.length > 0) {
        return this.buildEmbeddingsContext(matches);
      }
      const fallback = await this.retrieveKeywordContext(query);
      return fallback.sources.length > 0 ? fallback : { content: '', sources: [] };
    }
    return this.retrieveKeywordContext(query);
  }

  private buildEmbeddingsContext(matches: EmbeddingMatch[]): RagContext {
    const parts: string[] = [];
    const sources: ContextSource[] = [];
    for (const m of matches) {
      parts.push(`--- ${m.entry.type}: ${m.entry.title} ---\n${m.entry.text}`);
      sources.push({
        title: m.entry.title,
        path: m.entry.source,
        relevance: Math.max(0, Math.min(1, m.score)),
      });
    }
    return { content: parts.join('\n\n'), sources };
  }

  private async retrieveKeywordContext(query: string): Promise<RagContext> {
    const keywords = extractKeywords(query);
    if (keywords.length === 0) return { content: '', sources: [] };

    const q = query.toLowerCase();
    const kg = knowledgeGraph;
    const parts: string[] = [];
    const sources: ContextSource[] = [];

    const matchedAny = (text: string): boolean => {
      const lower = text.toLowerCase();
      if (lower.includes(q)) return true;
      return keywords.some((k) => lower.includes(k));
    };

    const addMatch = (
      label: string,
      description: string,
      path: string,
      relevance: number,
    ) => {
      parts.push(`${label}\n${description}`);
      sources.push({ title: label, path, relevance });
    };

    const mods = kg.getModules().filter(
      (m) => matchedAny(m.name) || matchedAny(m.description) || matchedAny(m.path),
    );
    for (const mod of mods.slice(0, 3)) {
      addMatch(`Module: ${mod.name}`, `${mod.description}\nPath: ${mod.path}`, mod.path, 0.9);
    }

    const svcs = kg.getServices().filter(
      (s) => matchedAny(s.name) || matchedAny(s.description) || s.methods.some((m) => matchedAny(m)),
    );
    for (const svc of svcs.slice(0, 3)) {
      addMatch(
        `Service: ${svc.name}`,
        `${svc.description}\nModule: ${svc.module}\nMethods: ${svc.methods.join(', ')}`,
        `#service-${svc.id}`,
        0.85,
      );
    }

    const wfs = kg.getWorkflows().filter(
      (w) => matchedAny(w.name) || matchedAny(w.description) || w.mainFlow.some((s) => matchedAny(s)),
    );
    for (const wf of wfs.slice(0, 3)) {
      addMatch(
        `Workflow: ${wf.name}`,
        `${wf.description}\nMain Steps: ${wf.mainFlow.slice(0, 5).join(' -> ')}`,
        `#workflow-${wf.id}`,
        0.8,
      );
    }

    const dias = kg.getDiagrams().filter(
      (d) => matchedAny(d.title) || matchedAny(d.description),
    );
    for (const dia of dias.slice(0, 2)) {
      addMatch(
        `Diagram: ${dia.title}`,
        `Category: ${dia.category}\nType: ${dia.type}\nDescription: ${dia.description}`,
        `#diagram-${dia.id}`,
        0.75,
      );
    }

    const ents = kg.getEntities().filter(
      (e) => matchedAny(e.name) || matchedAny(e.table),
    );
    for (const ent of ents.slice(0, 3)) {
      const fields = ent.fields.slice(0, 5).map((f) => `${f.name} (${f.type})`).join(', ');
      addMatch(`Entity: ${ent.name}`, `Table: ${ent.table}\nFields: ${fields}`, `#entity-${ent.id}`, 0.7);
    }

    const routes = kg.getRoutes().filter(
      (r) => matchedAny(r.domain) || matchedAny(r.path) || matchedAny(r.description),
    );
    for (const route of routes.slice(0, 3)) {
      addMatch(
        `Route: ${route.methods} ${route.path}`,
        `Domain: ${route.domain}\nAuth: ${route.auth}\nDescription: ${route.description}`,
        route.path,
        0.65,
      );
    }

    const agents = kg.getAgents().filter(
      (a) => matchedAny(a.name) || matchedAny(a.purpose),
    );
    for (const agent of agents.slice(0, 2)) {
      addMatch(
        `AI Agent: ${agent.name}`,
        `Purpose: ${agent.purpose}\nCapabilities: ${agent.capabilities.join(', ')}`,
        `#agent-${agent.id}`,
        0.6,
      );
    }

    const arch = kg.getArchitecture();
    if (arch && (q.includes('architecture') || q.includes('overview') || q.includes('pattern'))) {
      addMatch(
        'Architecture Overview',
        `Architecture: ${arch.name} v${arch.version}\nDescription: ${arch.description}\nPatterns: ${arch.patterns.join(', ')}\nPrinciples: ${arch.principles.join(', ')}`,
        '#architecture',
        0.95,
      );
    }

    return { content: parts.join('\n\n---\n\n'), sources };
  }

  async retrieveArchitectureContext(): Promise<string> {
    const arch = knowledgeGraph.getArchitecture();
    const parts: string[] = [];

    if (arch) {
      parts.push(`# PoDM Architecture Overview\nVersion: ${arch.version}\nDescription: ${arch.description}\nPatterns: ${arch.patterns.join(', ')}`);
    }

    const mods = knowledgeGraph.getModules();
    parts.push(`\n# Modules (${mods.length})\n${mods.map((m: Module) => `- ${m.name}: ${m.description}`).join('\n')}`);

    const svcs = knowledgeGraph.getServices();
    parts.push(`\n# Services (${svcs.length})\n${svcs.map((s: Service) => `- ${s.name}: ${s.description}`).join('\n')}`);

    const wfs = knowledgeGraph.getWorkflows();
    parts.push(`\n# Workflows (${wfs.length})\n${wfs.map((w: Workflow) => `- ${w.name}: ${w.description}`).join('\n')}`);

    const dias = knowledgeGraph.getDiagrams();
    parts.push(`\n# Diagrams (${dias.length})\n${dias.map((d: Diagram) => `- ${d.title}: ${d.description}`).join('\n')}`);

    return parts.join('\n');
  }
}

export const ragService = new RagService();
