import Fuse from 'fuse.js';
import { knowledgeGraph } from './knowledgeGraph';
import type { Module, Service, Entity, Route, Page, Component, Workflow, Diagram, ExternalSystem, Agent, Event } from '../types';

interface SearchableItem {
  id: string;
  type: string;
  name: string;
  description: string;
  keywords: string[];
  category?: string;
}

class SearchService {
  private fuse: Fuse<SearchableItem> | null = null;
  private items: SearchableItem[] = [];
  private initialized = false;

  async initialize(): Promise<void> {
    if (this.initialized) return;

    if (!knowledgeGraph.isLoaded()) {
      await knowledgeGraph.load();
    }

    this.items = this.buildIndex();
    this.fuse = new Fuse(this.items, {
      keys: [
        { name: 'name', weight: 2 },
        { name: 'description', weight: 1.5 },
        { name: 'keywords', weight: 1 },
        { name: 'category', weight: 1 },
      ],
      threshold: 0.4,
      distance: 100,
      minMatchCharLength: 1,
    });
    this.initialized = true;
  }

  private buildIndex(): SearchableItem[] {
    const items: SearchableItem[] = [];

    const push = (item: any, type: string, name: string, desc: string, extras?: Partial<SearchableItem>) => {
      items.push({
        id: item.id || item.name,
        type,
        name,
        description: desc,
        keywords: [],
        ...extras,
      });
    };

    knowledgeGraph.getModules().forEach((m: Module) =>
      push(m, 'module', m.name, m.description, { keywords: m.services.concat(m.entities), category: 'Module' })
    );
    knowledgeGraph.getServices().forEach((s: Service) =>
      push(s, 'service', s.name, s.description, { keywords: s.methods, category: 'Service' })
    );
    knowledgeGraph.getEntities().forEach((e: Entity) =>
      push(e, 'entity', e.name, e.description, { keywords: [e.table, ...e.fields.map((f) => f.name)], category: 'Entity' })
    );
    knowledgeGraph.getRoutes().forEach((r: Route) =>
      push(r, 'route', r.domain, `${r.methods} ${r.path} — ${r.description}`, { keywords: [r.path, r.methods], category: 'Route' })
    );
    knowledgeGraph.getPages().forEach((p: Page) =>
      push(p, 'page', p.name, p.path, { keywords: p.components, category: 'Page' })
    );
    knowledgeGraph.getComponents().forEach((c: Component) =>
      push(c, 'component', c.name, c.description, { keywords: c.props, category: 'Component' })
    );
    knowledgeGraph.getWorkflows().forEach((w: Workflow) =>
      push(w, 'workflow', w.name, w.description, { keywords: w.actors, category: 'Workflow' })
    );
    knowledgeGraph.getDiagrams().forEach((d: Diagram) =>
      push(d, 'diagram', d.title, d.description, { keywords: d.participants, category: `Diagram (${d.category})` })
    );
    knowledgeGraph.getExternalSystems().forEach((e: ExternalSystem) =>
      push(e, 'api', e.name, e.purpose, { keywords: [e.type, e.integration], category: 'External API' })
    );
    knowledgeGraph.getAgents().forEach((a: Agent) =>
      push(a, 'agent', a.name, a.purpose, { keywords: a.capabilities, category: 'AI Agent' })
    );
    knowledgeGraph.getEvents().forEach((e: Event) =>
      push(e, 'event', e.name, e.description, { keywords: [e.producer, ...e.consumers], category: 'Event' })
    );

    return items;
  }

  search(query: string, limit = 20): SearchableItem[] {
    if (!this.fuse || !query.trim()) return [];

    const results = this.fuse.search(query.trim(), { limit });
    return results.map((r) => r.item);
  }

  getByType(type: string): SearchableItem[] {
    return this.items.filter((i) => i.type === type);
  }
}

export const searchService = new SearchService();
