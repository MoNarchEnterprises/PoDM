import { useMemo, useState, useCallback } from 'react';
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  MarkerType,
  type Node,
  type Edge,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import type { KnowledgeGraph } from '../types';

const NODE_COLORS: Record<string, string> = {
  module: '#6c63ff',
  service: '#34d399',
  entity: '#60a5fa',
  route: '#fbbf24',
  diagram: '#f87171',
  externalSystem: '#a78bfa',
  agent: '#f472b6',
  event: '#fb923c',
  queue: '#2dd4bf',
};

export default function Graph({ data }: { data: KnowledgeGraph }) {
  const [filter, setFilter] = useState('');

  const moduleMap = useMemo(() => new Map(data.modules.map((m) => [m.id, m])), [data]);

  const { nodes: allNodes, edges: allEdges } = useMemo(() => {
    const nodes: Node[] = [];
    const edges: Edge[] = [];
    let y = 0;

    data.modules.forEach((m) => {
      nodes.push({
        id: `module-${m.id}`,
        type: 'default',
        position: { x: 0, y },
        data: { label: m.name },
        style: { background: NODE_COLORS.module, color: '#fff', border: 'none', borderRadius: 8, padding: '8px 16px', fontWeight: 600, fontSize: 13 },
      });
      y += 60;

      m.services.forEach((s) => {
        nodes.push({
          id: `service-${s}`,
          type: 'default',
          position: { x: 250, y },
          data: { label: s },
          style: { background: NODE_COLORS.service, color: '#000', border: 'none', borderRadius: 6, padding: '6px 12px', fontSize: 12 },
        });
        edges.push({ id: `e-module-${m.id}-service-${s}`, source: `module-${m.id}`, target: `service-${s}`, style: { stroke: '#555' }, markerEnd: { type: MarkerType.ArrowClosed } });
        y += 50;
      });
    });

    data.modules.forEach((m) => {
      m.dependencies.forEach((dep) => {
        if (moduleMap.has(dep)) {
          edges.push({
            id: `e-dep-${dep}-${m.id}`,
            source: `module-${dep}`,
            target: `module-${m.id}`,
            style: { stroke: '#fbbf24', strokeWidth: 2, strokeDasharray: '5 5' },
            animated: true,
            markerEnd: { type: MarkerType.ArrowClosed, color: '#fbbf24' },
          });
        }
      });
    });

    return { nodes, edges };
  }, [data, moduleMap]);

  const [nodes, setNodes, onNodesChange] = useNodesState(allNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(allEdges);

  const filteredNodes = useMemo(() => {
    if (!filter) return nodes;
    return nodes.filter((n) => (n.data.label as string).toLowerCase().includes(filter.toLowerCase()));
  }, [nodes, filter]);

  return (
    <div>
      <div className="page-header">
        <h2>Knowledge Graph</h2>
        <p>Visual exploration of the architecture — modules, services, entities, and their dependencies</p>
      </div>
      <input
        className="search-bar"
        placeholder="Filter nodes..."
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
      />
      <div className="graph-container">
        <ReactFlow
          nodes={filteredNodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          fitView
          attributionPosition="bottom-left"
        >
          <Controls />
          <MiniMap style={{ background: '#1a1b23' }} nodeColor={(n) => n.style?.background as string || '#555'} />
          <Background color="#2a2b36" gap={20} />
        </ReactFlow>
      </div>
      <div style={{ marginTop: 12, display: 'flex', gap: 16, flexWrap: 'wrap', fontSize: 12, color: 'var(--text-dim)' }}>
        <span><span style={{ color: NODE_COLORS.module, fontWeight: 700 }}>●</span> Modules</span>
        <span><span style={{ color: NODE_COLORS.service, fontWeight: 700 }}>●</span> Services</span>
        <span><span style={{ color: '#fbbf24', fontWeight: 700 }}>➜</span> Dependencies</span>
      </div>
    </div>
  );
}
