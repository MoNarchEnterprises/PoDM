import type {
  KnowledgeGraph, Module, Service, Entity, Route, Page,
  Component, Workflow, Diagram, Relationship, ExternalSystem,
  Event, Queue, Agent, ArchitectureData,
} from '../types';

const KNOWLEDGE_FILES = [
  'architecture.json', 'modules.json', 'services.json', 'entities.json',
  'routes.json', 'pages.json', 'components.json', 'workflows.json',
  'diagrams.json', 'relationships.json', 'externalSystems.json',
  'events.json', 'queues.json', 'agents.json',
];

const DOCS_PATHS = [
  '/docs/architecture/',
  '/docs/flowcharts/',
  '/docs/diagram-specifications/',
  '/docs/api/',
  '/docs/knowledge/',
];

class KnowledgeGraphService {
  private graph: KnowledgeGraph = {
    architecture: null, modules: [], services: [], entities: [],
    routes: [], pages: [], components: [], workflows: [],
    diagrams: [], relationships: [], externalSystems: [],
    events: [], queues: [], agents: [],
  };
  private loaded = false;
  private loading = false;

  async load(): Promise<KnowledgeGraph> {
    if (this.loaded) return this.graph;
    if (this.loading) await new Promise((r) => setTimeout(r, 100));
    this.loading = true;

    try {
      const base = import.meta.env.BASE_URL || '/';

      const results = await Promise.allSettled(
        KNOWLEDGE_FILES.map(async (file) => {
          const resp = await fetch(`${base}docs/knowledge/${file}`);
          if (!resp.ok) throw new Error(`Failed to load ${file}: ${resp.status}`);
          return { file, data: await resp.json() };
        })
      );

      for (const result of results) {
        if (result.status === 'fulfilled') {
          const { file, data } = result.value;
          const key = file.replace('.json', '') as keyof KnowledgeGraph;
          if (key === 'architecture') {
            this.graph.architecture = data as ArchitectureData;
          } else if (Array.isArray(data)) {
            (this.graph as any)[key] = data;
          }
        }
      }

      this.loaded = true;
      return this.graph;
    } finally {
      this.loading = false;
    }
  }

  isLoaded(): boolean { return this.loaded; }

  getArchitecture(): ArchitectureData | null { return this.graph.architecture; }
  getModules(): Module[] { return this.graph.modules; }
  getServices(): Service[] { return this.graph.services; }
  getEntities(): Entity[] { return this.graph.entities; }
  getRoutes(): Route[] { return this.graph.routes; }
  getPages(): Page[] { return this.graph.pages; }
  getComponents(): Component[] { return this.graph.components; }
  getWorkflows(): Workflow[] { return this.graph.workflows; }
  getDiagrams(): Diagram[] { return this.graph.diagrams; }
  getRelationships(): Relationship[] { return this.graph.relationships; }
  getExternalSystems(): ExternalSystem[] { return this.graph.externalSystems; }
  getEvents(): Event[] { return this.graph.events; }
  getQueues(): Queue[] { return this.graph.queues; }
  getAgents(): Agent[] { return this.graph.agents; }

  findModule(id: string): Module | undefined {
    return this.graph.modules.find((m) => m.id === id);
  }

  findService(id: string): Service | undefined {
    return this.graph.services.find((s) => s.id === id);
  }

  findEntity(id: string): Entity | undefined {
    return this.graph.entities.find((e) => e.id === id);
  }

  findRoute(id: string): Route | undefined {
    return this.graph.routes.find((r) => r.id === id);
  }

  findPage(id: string): Page | undefined {
    return this.graph.pages.find((p) => p.id === id);
  }

  findComponent(id: string): Component | undefined {
    return this.graph.components.find((c) => c.id === id);
  }

  findWorkflow(id: string): Workflow | undefined {
    return this.graph.workflows.find((w) => w.id === id);
  }

  findDiagram(id: string): Diagram | undefined {
    return this.graph.diagrams.find((d) => d.id === id);
  }

  findEvent(id: string): Event | undefined {
    return this.graph.events.find((e) => e.id === id);
  }

  findAgent(id: string): Agent | undefined {
    return this.graph.agents.find((a) => a.id === id);
  }

  findExternalSystem(id: string): ExternalSystem | undefined {
    return this.graph.externalSystems.find((e) => e.id === id);
  }

  findQueue(id: string): Queue | undefined {
    return this.graph.queues.find((q) => q.id === id);
  }

  getDependencies(moduleId: string): Module[] {
    const mod = this.findModule(moduleId);
    if (!mod) return [];
    return mod.dependencies
      .map((id) => this.findModule(id))
      .filter((m): m is Module => !!m);
  }

  getDependents(moduleId: string): Module[] {
    return this.graph.modules.filter((m) =>
      m.dependencies.includes(moduleId)
    );
  }

  findEverythingRelatedTo(id: string, type?: string): any[] {
    const results: any[] = [];
    const rels = this.graph.relationships.filter(
      (r) =>
        (r.source === id && (!type || r.sourceType === type)) ||
        (r.target === id && (!type || r.targetType === type))
    );

    for (const rel of rels) {
      if (rel.source === id) {
        const found = this.findByType(rel.target, rel.targetType);
        if (found) results.push(found);
      }
      if (rel.target === id) {
        const found = this.findByType(rel.source, rel.sourceType);
        if (found) results.push(found);
      }
    }
    return results;
  }

  private findByType(id: string, type: string): any {
    switch (type) {
      case 'module': return this.findModule(id);
      case 'service': return this.findService(id);
      case 'entity': return this.findEntity(id);
      case 'route': return this.findRoute(id);
      case 'page': return this.findPage(id);
      case 'component': return this.findComponent(id);
      case 'workflow': return this.findWorkflow(id);
      case 'diagram': return this.findDiagram(id);
      case 'event': return this.findEvent(id);
      case 'agent': return this.findAgent(id);
      case 'queue': return this.findQueue(id);
      case 'api': return this.findExternalSystem(id);
      default: return undefined;
    }
  }

  getModuleDiagrams(moduleId: string): Diagram[] {
    const mod = this.findModule(moduleId);
    if (!mod) return [];
    return mod.diagrams
      .map((id) => this.findDiagram(id))
      .filter((d): d is Diagram => !!d);
  }

  getModuleWorkflows(moduleId: string): Workflow[] {
    return this.graph.workflows.filter((w) =>
      w.modules.includes(moduleId)
    );
  }

  getModuleServices(moduleId: string): Service[] {
    const mod = this.findModule(moduleId);
    if (!mod) return [];
    return mod.services
      .map((id) => this.findService(id))
      .filter((s): s is Service => !!s);
  }

  getModuleEntities(moduleId: string): Entity[] {
    const mod = this.findModule(moduleId);
    if (!mod) return [];
    return mod.entities
      .map((id) => this.findEntity(id))
      .filter((e): e is Entity => !!e);
  }

  getModuleRoutes(moduleId: string): Route[] {
    return this.graph.routes.filter((r) => r.module === moduleId);
  }

  getByCategory(category: string): Diagram[] {
    return this.graph.diagrams.filter((d) => d.category === category);
  }

  searchAll(query: string): SearchResult[] {
    const q = query.toLowerCase();
    const results: SearchResult[] = [];

    const push = (item: any, type: string, name: string, desc: string) => {
      if (
        name.toLowerCase().includes(q) ||
        desc.toLowerCase().includes(q)
      ) {
        results.push({ id: item.id || item.name, type, name, description: desc });
      }
    };

    this.graph.modules.forEach((m) => push(m, 'module', m.name, m.description));
    this.graph.services.forEach((s) => push(s, 'service', s.name, s.description));
    this.graph.entities.forEach((e) => push(e, 'entity', e.name, e.description));
    this.graph.routes.forEach((r) => push(r, 'route', r.domain, r.description));
    this.graph.pages.forEach((p) => push(p, 'page', p.name, p.path));
    this.graph.components.forEach((c) => push(c, 'component', c.name, c.description));
    this.graph.workflows.forEach((w) => push(w, 'workflow', w.name, w.description));
    this.graph.diagrams.forEach((d) => push(d, 'diagram', d.title, d.description));
    this.graph.externalSystems.forEach((e) => push(e, 'api', e.name, e.purpose));
    this.graph.agents.forEach((a) => push(a, 'agent', a.name, a.purpose));
    this.graph.events.forEach((e) => push(e, 'event', e.name, e.description));

    return results;
  }

  getDashboardStats(): DashboardStats {
    return {
      modules: this.graph.modules.length,
      services: this.graph.services.length,
      entities: this.graph.entities.length,
      routes: this.graph.routes.length,
      pages: this.graph.pages.length,
      components: this.graph.components.length,
      workflows: this.graph.workflows.length,
      diagrams: this.graph.diagrams.length,
      externalApis: this.graph.externalSystems.length,
      agents: this.graph.agents.length,
      events: this.graph.events.length,
      queues: this.graph.queues.length,
    };
  }
}

export interface SearchResult {
  id: string;
  type: string;
  name: string;
  description: string;
}

export interface DashboardStats {
  modules: number;
  services: number;
  entities: number;
  routes: number;
  pages: number;
  components: number;
  workflows: number;
  diagrams: number;
  externalApis: number;
  agents: number;
  events: number;
  queues: number;
}

export const knowledgeGraph = new KnowledgeGraphService();
