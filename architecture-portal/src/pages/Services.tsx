import { useState } from 'react';
import type { KnowledgeGraph, Service } from '../types';

export default function Services({ data }: { data: KnowledgeGraph }) {
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Service | null>(null);

  const filtered = data.services.filter((s) =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.description.toLowerCase().includes(search.toLowerCase())
  );

  const moduleMap = new Map(data.modules.map((m) => [m.id, m]));

  return (
    <div>
      <div className="page-header">
        <h2>Services</h2>
        <p>{data.services.length} services — business logic layer</p>
      </div>
      <input className="search-bar" placeholder="Search services..." value={search} onChange={(e) => setSearch(e.target.value)} />
      <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
        <div className="card-grid" style={{ flex: 1 }}>
          {filtered.map((s) => (
            <div key={s.id} className="card" onClick={() => setSelected(s)} style={{ borderColor: selected?.id === s.id ? 'var(--accent)' : undefined }}>
              <h3>{s.name}</h3>
              <p>{s.description}</p>
              <div className="tags">
                <span className="tag">{s.methods.length} methods</span>
                {s.module && <span className="tag blue">{moduleMap.get(s.module)?.name || s.module}</span>}
              </div>
            </div>
          ))}
        </div>
        {selected && (
          <div className="detail-panel" style={{ flex: '0 0 400px', position: 'sticky', top: 32 }}>
            <h3>{selected.name}</h3>
            <p style={{ color: 'var(--text-dim)', marginBottom: 16, fontSize: 13 }}>{selected.description}</p>
            <div className="detail-section">
              <h4>Module</h4>
              <p style={{ fontSize: 13 }}>{moduleMap.get(selected.module)?.name || selected.module}</p>
            </div>
            <div className="detail-section">
              <h4>Methods ({selected.methods.length})</h4>
              <ul>
                {selected.methods.map((m) => <li key={m}><code>{m}</code></li>)}
              </ul>
            </div>
            <div className="detail-section">
              <h4>Dependencies</h4>
              <div className="tags">
                {selected.dependencies.length > 0
                  ? selected.dependencies.map((d) => <span key={d} className="tag yellow">{moduleMap.get(d)?.name || d}</span>)
                  : <span className="tag green">None</span>}
              </div>
            </div>
            <div className="detail-section">
              <h4>Events</h4>
              <div className="tags">
                {selected.events.length > 0
                  ? selected.events.map((e) => <span key={e} className="tag">{e}</span>)
                  : <span className="tag green">None</span>}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
