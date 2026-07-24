import { useState, lazy, Suspense } from 'react';
import type { KnowledgeGraph, Diagram } from '../types';

const MermaidDiagram = lazy(() => import('../components/MermaidDiagram'));

const categoryColors: Record<string, string> = {
  A: 'blue', B: 'blue', C: 'green', D: 'green',
  E: 'yellow', F: 'yellow', G: 'red', H: 'red',
  I: '', J: '', K: '',
};

export default function Diagrams({ data }: { data: KnowledgeGraph & { mermaidBySpecPrefix?: Record<string, string>; mermaidByCategoryId?: Record<string, string> } }) {
  const [search, setSearch] = useState('');
  const [filterCat, setFilterCat] = useState('');
  const [selected, setSelected] = useState<Diagram | null>(null);

  const cats = [...new Set(data.diagrams.map((d) => d.category))].sort();

  const filtered = data.diagrams.filter((d) => {
    if (filterCat && d.category !== filterCat) return false;
    if (search && !d.title.toLowerCase().includes(search.toLowerCase()) && !d.description.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const moduleMap = new Map(data.modules.map((m) => [m.id, m.name]));

  const mermaidSource = selected
    ? data.mermaidBySpecPrefix?.[selected.id] || null
    : null;

  const totalWithMermaid = Object.keys(data.mermaidBySpecPrefix || {}).length;

  return (
    <div>
      <div className="page-header">
        <h2>Diagrams</h2>
        <p>{data.diagrams.length} diagrams across {cats.length} categories (A–K) — {totalWithMermaid} have rendered Mermaid source — click any diagram to view it</p>
      </div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        <input className="search-bar" style={{ flex: 1, marginBottom: 0 }} placeholder="Search diagrams..." value={search} onChange={(e) => setSearch(e.target.value)} />
        <select
          style={{
            padding: '12px 16px', background: 'var(--surface)', border: '1px solid var(--border)',
            borderRadius: 'var(--radius)', color: 'var(--text)', fontSize: 14, outline: 'none',
          }}
          value={filterCat}
          onChange={(e) => setFilterCat(e.target.value)}
        >
          <option value="">All categories</option>
          {cats.map((c) => <option key={c} value={c}>Category {c}</option>)}
        </select>
      </div>
      <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
        <div className="card-grid" style={{ flex: '0 0 320px' }}>
          {filtered.map((d) => {
            const hasMermaid = !!data.mermaidBySpecPrefix?.[d.id];
            return (
              <div key={d.id} className="card" onClick={() => setSelected(d)} style={{ borderColor: selected?.id === d.id ? 'var(--accent)' : undefined, opacity: hasMermaid ? 1 : 0.6 }}>
                <h3>{d.title}</h3>
                <p>{d.description}</p>
                <div className="tags">
                  <span className={`tag ${categoryColors[d.category] || ''}`}>Cat {d.category}</span>
                  <span className="tag">{d.type}</span>
                  {hasMermaid ? <span className="tag green">▶ view</span> : <span className="tag">no render</span>}
                </div>
              </div>
            );
          })}
        </div>
        {selected && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="detail-panel">
              <h3>{selected.title}</h3>
              <p style={{ color: 'var(--text-dim)', marginBottom: 16, fontSize: 13 }}>{selected.description}</p>
              <div className="detail-section">
                <h4>Details</h4>
                <ul>
                  <li>Category: {selected.category}</li>
                  <li>Type: {selected.type}</li>
                  <li>File: <code style={{ wordBreak: 'break-all' }}>{selected.file}</code></li>
                  <li>ID: {selected.id}</li>
                </ul>
              </div>
              <div className="detail-section">
                <h4>Participants ({selected.participants.length})</h4>
                <div className="tags">
                  {selected.participants.map((p) => <span key={p} className="tag">{p}</span>)}
                </div>
              </div>
              <div className="detail-section">
                <h4>Modules</h4>
                <div className="tags">
                  {selected.modules.map((m) => <span key={m} className="tag blue">{moduleMap.get(m) || m}</span>)}
                </div>
              </div>
            </div>
            <div className="detail-panel">
              <h3>Diagram</h3>
              {mermaidSource ? (
                <Suspense fallback={<div style={{ padding: 24, textAlign: 'center', color: 'var(--text-dim)' }}>Loading Mermaid renderer...</div>}>
                  <MermaidDiagram source={mermaidSource} />
                </Suspense>
              ) : (
                <div className="empty-state">
                  <h3>No Mermaid source available</h3>
                  <p>Diagram ID "{selected.id}" has no matching Mermaid file in <code>docs/flowcharts/</code> or <code>docs/diagrams/</code>.</p>
                </div>
              )}
            </div>
          </div>
        )}
        {!selected && (
          <div className="empty-state" style={{ flex: 1 }}>
            <h3>Select a diagram</h3>
            <p>Click any diagram card to view the rendered Mermaid visualization</p>
          </div>
        )}
      </div>
    </div>
  );
}
