import { useState } from 'react';
import type { KnowledgeGraph, Entity } from '../types';

export default function Entities({ data }: { data: KnowledgeGraph }) {
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Entity | null>(null);

  const filtered = data.entities.filter((e) =>
    e.name.toLowerCase().includes(search.toLowerCase()) ||
    e.table.toLowerCase().includes(search.toLowerCase())
  );

  const moduleMap = new Map(data.modules.map((m) => [m.id, m.name]));

  return (
    <div>
      <div className="page-header">
        <h2>Entities</h2>
        <p>{data.entities.length} entities — database tables and their schemas</p>
      </div>
      <input className="search-bar" placeholder="Search entities..." value={search} onChange={(e) => setSearch(e.target.value)} />
      <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
        <div className="card-grid" style={{ flex: 1 }}>
          {filtered.map((e) => (
            <div key={e.id} className="card" onClick={() => setSelected(e)} style={{ borderColor: selected?.id === e.id ? 'var(--accent)' : undefined }}>
              <h3>{e.name}</h3>
              <p>Table: <code>{e.table}</code></p>
              <div className="tags">
                <span className="tag">{e.fields.length} fields</span>
                <span className="tag blue">{moduleMap.get(e.module) || e.module}</span>
                <span className="tag yellow">{e.relationships.length} relationships</span>
              </div>
            </div>
          ))}
        </div>
        {selected && (
          <div className="detail-panel" style={{ flex: '0 0 420px', position: 'sticky', top: 32, maxHeight: 'calc(100vh - 100px)', overflowY: 'auto' }}>
            <h3>{selected.name}</h3>
            <p style={{ color: 'var(--text-dim)', marginBottom: 16, fontSize: 13 }}>
              Table: <code>{selected.table}</code> — Module: {moduleMap.get(selected.module) || selected.module}
            </p>
            <div className="detail-section">
              <h4>Fields ({selected.fields.length})</h4>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border)', textAlign: 'left' }}>
                      <th style={{ padding: '6px 8px', color: 'var(--text-dim)' }}>Name</th>
                      <th style={{ padding: '6px 8px', color: 'var(--text-dim)' }}>Type</th>
                      <th style={{ padding: '6px 8px', color: 'var(--text-dim)' }}>Description</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selected.fields.map((f) => (
                      <tr key={f.name} style={{ borderBottom: '1px solid var(--border)' }}>
                        <td style={{ padding: '4px 8px' }}><code>{f.name}</code></td>
                        <td style={{ padding: '4px 8px' }}><span className="tag">{f.type}</span></td>
                        <td style={{ padding: '4px 8px', color: 'var(--text-dim)' }}>{f.description}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="detail-section">
              <h4>Relationships ({selected.relationships.length})</h4>
              <ul>
                {selected.relationships.map((r) => (
                  <li key={r.entity}>
                    <span className="tag" style={{ marginRight: 6 }}>{r.type}</span>
                    {r.entity} — {r.description}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
