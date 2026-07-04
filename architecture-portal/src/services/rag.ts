import { knowledgeGraph } from './knowledgeGraph';
import { markdownLoader } from './markdownLoader';
import type { KnowledgeGraph, Workflow, Module, Diagram } from '../types';

interface RagContext {
  content: string;
  sources: { title: string; path: string; relevance: number }[];
}

class RagService {
  async retrieveContext(query: string): Promise<RagContext> {
    const q = query.toLowerCase();
    const parts: string[] = [];
    const sources: RagContext['sources'] = [];

    const kg = knowledgeGraph;

    const modResults = kg.getModules().filter(
      (m) => m.name.toLowerCase().includes(q) || m.description.toLowerCase().includes(q)
    );
    for (const mod of modResults.slice(0, 3)) {
      parts.push(`Module: ${mod.name}\nDescription: ${mod.description}\nPath: ${mod.path}`);
      sources.push({ title: `Module: ${mod.name}`, path: mod.path, relevance: 0.9 });
    }

    const wfResults = kg.getWorkflows().filter(
      (w) => w.name.toLowerCase().includes(q) || w.description.toLowerCase().includes(q)
    );
    for (const wf of wfResults.slice(0, 3)) {
      parts.push(`Workflow: ${wf.name}\nDescription: ${wf.description}\nMain Steps: ${wf.mainFlow.slice(0, 5).join(' -> ')}`);
      sources.push({ title: `Workflow: ${wf.name}`, path: `#workflow-${wf.id}`, relevance: 0.85 });
    }

    const svcResults = kg.getServices().filter(
      (s) => s.name.toLowerCase().includes(q) || s.description.toLowerCase().includes(q)
    );
    for (const svc of svcResults.slice(0, 3)) {
      parts.push(`Service: ${svc.name}\nDescription: ${svc.description}\nModule: ${svc.module}\nMethods: ${svc.methods.join(', ')}`);
      sources.push({ title: `Service: ${svc.name}`, path: `#service-${svc.id}`, relevance: 0.8 });
    }

    const diaResults = kg.getDiagrams().filter(
      (d) => d.title.toLowerCase().includes(q) || d.description.toLowerCase().includes(q)
    );
    for (const dia of diaResults.slice(0, 2)) {
      parts.push(`Diagram: ${dia.title}\nCategory: ${dia.category}\nType: ${dia.type}\nDescription: ${dia.description}`);
      sources.push({ title: `Diagram: ${dia.title}`, path: `#diagram-${dia.id}`, relevance: 0.75 });
    }

    const entResults = kg.getEntities().filter(
      (e) => e.name.toLowerCase().includes(q) || e.table.toLowerCase().includes(q)
    );
    for (const ent of entResults.slice(0, 3)) {
      const fields = ent.fields.slice(0, 5).map((f) => `${f.name} (${f.type})`).join(', ');
      parts.push(`Entity: ${ent.name}\nTable: ${ent.table}\nFields: ${fields}`);
      sources.push({ title: `Entity: ${ent.name}`, path: `#entity-${ent.id}`, relevance: 0.7 });
    }

    const routeResults = kg.getRoutes().filter(
      (r) => r.domain.toLowerCase().includes(q) || r.path.toLowerCase().includes(q)
    );
    for (const route of routeResults.slice(0, 3)) {
      parts.push(`Route: ${route.methods} ${route.path}\nDomain: ${route.domain}\nAuth: ${route.auth}\nDescription: ${route.description}`);
      sources.push({ title: `Route: ${route.domain}`, path: route.path, relevance: 0.7 });
    }

    const agentResults = kg.getAgents().filter(
      (a) => a.name.toLowerCase().includes(q) || a.purpose.toLowerCase().includes(q)
    );
    for (const agent of agentResults.slice(0, 2)) {
      parts.push(`AI Agent: ${agent.name}\nPurpose: ${agent.purpose}\nCapabilities: ${agent.capabilities.join(', ')}`);
      sources.push({ title: `Agent: ${agent.name}`, path: `#agent-${agent.id}`, relevance: 0.65 });
    }

    const arch = kg.getArchitecture();
    if (arch && (q.includes('architecture') || q.includes('overview') || q.includes('pattern'))) {
      parts.push(`Architecture: ${arch.name} v${arch.version}\nDescription: ${arch.description}\nPatterns: ${arch.patterns.join(', ')}\nPrinciples: ${arch.principles.join(', ')}`);
      sources.push({ title: 'Architecture Overview', path: '#architecture', relevance: 0.95 });
    }

    return {
      content: parts.join('\n\n---\n\n'),
      sources,
    };
  }

  async retrieveArchitectureContext(): Promise<string> {
    const kg = knowledgeGraph;
    const arch = kg.getArchitecture();
    const parts: string[] = [];

    if (arch) {
      parts.push(`# PoDM Architecture Overview\nVersion: ${arch.version}\nDescription: ${arch.description}\nPatterns: ${arch.patterns.join(', ')}`);
    }

    const mods = kg.getModules();
    parts.push(`\n# Modules (${mods.length})\n${mods.map((m) => `- ${m.name}: ${m.description}`).join('\n')}`);

    return parts.join('\n');
  }
}

export const ragService = new RagService();
