import { useState, useMemo } from 'react';
import type { KnowledgeGraph } from '../types';

export default function Search({ data }: { data: KnowledgeGraph }) {
  const [query, setQuery] = useState('');

  const allItems = useMemo(() => {
    const items: { type: string; id: string; name: string; description: string; link: string }[] = [];
    data.modules.forEach((m) => items.push({ type: 'Module', id: m.id, name: m.name, description: m.description, link: '/modules' }));
    data.services.forEach((s) => items.push({ type: 'Service', id: s.id, name: s.name, description: s.description, link: '/services' }));
    data.entities.forEach((e) => items.push({ type: 'Entity', id: e.id, name: e.name, description: `Table: ${e.table}`, link: '/entities' }));
    data.diagrams.forEach((d) => items.push({ type: 'Diagram', id: d.id, name: d.title, description: d.description, link: '/diagrams' }));
    data.workflows.forEach((w) => items.push({ type: 'Workflow', id: w.id, name: w.name, description: w.description, link: '/search' }));
    data.externalSystems.forEach((s) => items.push({ type: 'External System', id: s.id, name: s.name, description: s.description, link: '/search' }));
    data.agents.forEach((a) => items.push({ type: 'Agent', id: a.id, name: a.name, description: a.description, link: '/search' }));
    data.events.forEach((e) => items.push({ type: 'Event', id: e.id, name: e.name, description: e.description, link: '/search' }));
    data.queues.forEach((q) => items.push({ type: 'Queue', id: q.id, name: q.name, description: q.description, link: '/search' }));
    return items;
  }, [data]);

  const results = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase();
    return allItems.filter(
      (item) =>
        item.name.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q) ||
        item.type.toLowerCase().includes(q)
    ).slice(0, 100);
  }, [query, allItems]);

  return (
    <div>
      <div className="page-header">
        <h2>Search</h2>
        <p>Search across {allItems.length} items — modules, services, entities, diagrams, workflows, agents, events, and queues</p>
      </div>
      <input
        className="search-bar"
        placeholder="Search everything..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        autoFocus
      />
      {query && (
        <p style={{ color: 'var(--text-dim)', marginBottom: 12, fontSize: 13 }}>
          {results.length} results for "{query}"
        </p>
      )}
      <div className="card-grid">
        {results.map((item) => (
          <a key={`${item.type}-${item.id}`} href={item.link} style={{ textDecoration: 'none' }}>
            <div className="card">
              <h3>{item.name}</h3>
              <div className="tags" style={{ marginBottom: 6 }}>
                <span className="tag blue">{item.type}</span>
              </div>
              <p>{item.description}</p>
            </div>
          </a>
        ))}
      </div>
      {!query && (
        <div className="empty-state">
          <h3>Type to search</h3>
          <p>Search across all architecture knowledge — modules, services, entities, diagrams, and more</p>
        </div>
      )}
    </div>
  );
}
