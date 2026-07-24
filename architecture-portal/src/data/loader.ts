import architectureData from '@knowledge/architecture.json';
import modulesData from '@knowledge/modules.json';
import servicesData from '@knowledge/services.json';
import entitiesData from '@knowledge/entities.json';
import routesData from '@knowledge/apis.json';
import pagesData from '@knowledge/pages.json';
import componentsData from '@knowledge/components.json';
import workflowsData from '@knowledge/workflows.json';
import diagramsData from '@knowledge/diagrams.json';
import relationshipsData from '@knowledge/relationships.json';
import externalSystemsData from '@knowledge/externalSystems.json';
import agentsData from '@knowledge/agents.json';
import eventsData from '@knowledge/events.json';
import queuesData from '@knowledge/queues.json';

const flowchartModules = import.meta.glob('@artifacts/flowcharts/*.md', { query: '?raw', import: 'default', eager: true }) as Record<string, string>;
const diagramModules = import.meta.glob('@artifacts/diagrams/*.md', { query: '?raw', import: 'default', eager: true }) as Record<string, string>;

const mermaidByCategoryId: Record<string, string> = {};
const mermaidBySpecPrefix: Record<string, string> = {};

function extractMermaid(content: string): string {
  const match = content.match(/```mermaid\s*\r?\n([\s\S]*?)```/i);
  return match ? match[1].trim() : '';
}

function extractFilenamePrefix(path: string): string | null {
  const name = path.split(/[\\/]/).pop() || '';
  const m = name.match(/^(\d{1,3})-/);
  return m ? m[1].padStart(3, '0') : null;
}

function extractTitleId(content: string): string | null {
  const m = content.match(/^##\s+([A-Z]-\d+)\s*[:-]/m);
  return m ? m[1] : null;
}

// Flowcharts use 3-digit prefixes that align 1:1 with diagrams.json ids (001-055).
Object.entries(flowchartModules).forEach(([path, content]) => {
  const mermaid = extractMermaid(content);
  if (!mermaid) return;
  const prefix = extractFilenamePrefix(path);
  if (prefix) mermaidBySpecPrefix[prefix] = mermaid;
  const titleId = extractTitleId(content);
  if (titleId) mermaidByCategoryId[titleId] = mermaid;
});

// Legacy C4 diagrams in docs/diagrams use 2-digit prefixes; zero-pad to 3 digits
// so they override the flowchart entry for diagrams.json ids 001-011 when available.
Object.entries(diagramModules).forEach(([path, content]) => {
  const mermaid = extractMermaid(content);
  if (!mermaid) return;
  const prefix = extractFilenamePrefix(path);
  if (prefix) mermaidBySpecPrefix[prefix] = mermaid;
  const titleId = extractTitleId(content);
  if (titleId) mermaidByCategoryId[titleId] = mermaid;
});

export function loadKnowledgeGraph() {
  return {
    architecture: architectureData as any,
    modules: modulesData as any[],
    services: servicesData as any[],
    entities: entitiesData as any[],
    routes: routesData as any[],
    pages: pagesData as any[],
    components: componentsData as any[],
    workflows: workflowsData as any[],
    diagrams: diagramsData as any[],
    relationships: relationshipsData as any[],
    externalSystems: externalSystemsData as any[],
    agents: agentsData as any[],
    events: eventsData as any[],
    queues: queuesData as any[],
    mermaidByCategoryId,
    mermaidBySpecPrefix,
  };
}

export function getMermaidForDiagram(diagramId: string): string | null {
  return mermaidBySpecPrefix[diagramId] || null;
}
