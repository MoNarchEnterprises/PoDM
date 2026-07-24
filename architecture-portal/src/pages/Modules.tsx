import { useState } from 'react';
import type { KnowledgeGraph, Module } from '../types';

export default function Modules({ data }: { data: KnowledgeGraph }) {
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Module | null>(null);

  const filtered = data.modules.filter((m) =>
    m.name.toLowerCase().includes(search.toLowerCase()) ||
    m.description.toLowerCase().includes(search.toLowerCase())
  );

  const moduleMap = new Map(data.modules.map((m) => [m.id, m]));

  return (
    <div>
      <div className="page-header">
        <h2>Modules</h2>
        <p>{data.modules.length} modules — the building blocks of the platform</p>
      </div>
      <input className="search-bar" placeholder="Search modules..." value={search} onChange={(e) => setSearch(e.target.value)} />
      <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
        <div className="card-grid" style={{ flex: 1 }}>
          {filtered.map((m) => (
            <div key={m.id} className="card" onClick={() => setSelected(m)} style={{ borderColor: selected?.id === m.id ? 'var(--accent)' : undefined }}>
              <h3>{m.name}</h3>
              <p>{m.description}</p>
              <div className="tags">
                <span className="tag blue">{m.services.length} services</span>
                <span className="tag green">{m.entities.length} entities</span>
                <span className="tag">{m.diagrams.length} diagrams</span>
              </div>
            </div>
          ))}
        </div>
        {selected && (
          <div className="detail-panel" style={{ flex: '0 0 380px', position: 'sticky', top: 32 }}>
            <h3>{selected.name}</h3>
            <p style={{ color: 'var(--text-dim)', marginBottom: 16, fontSize: 13 }}>{selected.description}</p>
            <Section title="Services" items={selected.services} map={moduleMap} />
            <Section title="Entities" items={selected.entities} />
            <Section title="Diagrams" items={selected.diagrams} />
            <Section title="Workflows" items={selected.workflows} />
            <Section title="APIs" items={selected.apis} />
            <Section title="Agents" items={selected.agents} />
            <Section title="Events" items={selected.events} />
            <Section title="Queues" items={selected.queues} />
            <div className="detail-section">
              <h4>Dependencies</h4>
              <div className="tags">
                {selected.dependencies.length > 0
                  ? selected.dependencies.map((d) => <span key={d} className="tag yellow">{moduleMap.get(d)?.name || d}</span>)
                  : <span className="tag green">None</span>}
              </div>
            </div>
            <div className="detail-section">
              <h4>Dependents</h4>
              <div className="tags">
                {selected.dependents.map((d) => <span key={d} className="tag blue">{moduleMap.get(d)?.name || d}</span>)}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Section({ title, items, map }: { title: string; items: string[]; map?: Map<string, { name: string }> }) {
  if (items.length === 0) return null;
  return (
    <div className="detail-section">
      <h4>{title}</h4>
      <ul>
        {items.map((item) => (
          <li key={item}>{map?.get(item)?.name || item}</li>
        ))}
      </ul>
    </div>
  );
}
