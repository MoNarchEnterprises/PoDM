import type { KnowledgeGraph } from '../types';

export default function Dashboard({ data }: { data: KnowledgeGraph }) {
  const { architecture, modules, services, entities, routes, pages, components, workflows, diagrams, relationships, externalSystems, agents, events, queues } = data;

  return (
    <div>
      <div className="page-header">
        <h2>{architecture.name}</h2>
        <p>{architecture.description}</p>
      </div>

      <div className="stats-grid">
        <Stat value={modules.length} label="Modules" sub={`${services.length} services, ${entities.length} entities`} color="var(--accent)" />
        <Stat value={routes.length} label="API Routes" sub={`${pages.length} pages, ${components.length} components`} color="var(--blue)" />
        <Stat value={workflows.length} label="Workflows" sub={`${agents.length} agents`} color="var(--green)" />
        <Stat value={diagrams.length} label="Diagrams" sub={`${relationships.length} relationships`} color="var(--yellow)" />
        <Stat value={externalSystems.length} label="External Systems" sub="" color="var(--red)" />
        <Stat value={events.length + queues.length} label="Events & Queues" sub={`${events.length} events, ${queues.length} queues`} color="var(--text-dim)" />
      </div>

      <div className="detail-panel">
        <h3>Architecture Overview</h3>
        <div className="detail-section">
          <h4>Patterns</h4>
          <div className="tags">
            {architecture.patterns.map((p) => <span key={p} className="tag blue">{p}</span>)}
          </div>
        </div>
        <div className="detail-section">
          <h4>Layers</h4>
          <ul>
            {architecture.layers.map((l) => (
              <li key={l.name}>
                <strong>{l.name}</strong> — {l.technologies.join(', ')}
              </li>
            ))}
          </ul>
        </div>
        <div className="detail-section">
          <h4>Principles</h4>
          <ul>
            {architecture.principles.map((p) => <li key={p}>{p}</li>)}
          </ul>
        </div>
      </div>

      <div className="detail-panel" style={{ marginTop: 16 }}>
        <h3>Module Dependencies</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
          {modules.map((m) => (
            <div key={m.id} className="card" style={{ cursor: 'default' }}>
              <h3>{m.name}</h3>
              <p>{m.description}</p>
              <div className="tags" style={{ marginTop: 8 }}>
                {m.dependencies.length > 0 ? m.dependencies.map((d) => <span key={d} className="tag">dep: {d}</span>) : <span className="tag green">no deps</span>}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Stat({ value, label, sub, color }: { value: number; label: string; sub: string; color: string }) {
  return (
    <div className="stat-card">
      <div className="value" style={{ color }}>{value}</div>
      <div className="label">{label}</div>
      {sub && <div className="sub" style={{ color: 'var(--text-dim)' }}>{sub}</div>}
    </div>
  );
}
