import { useMemo, useCallback, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Box, Typography, Paper, Chip, IconButton, Tooltip,
} from '@mui/material';
import {
  Info as InfoIcon, ZoomIn, ZoomOut, FitScreen,
  Widgets, Storage,
} from '@mui/icons-material';
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
  type NodeTypes,
  type NodeProps,
  Handle,
  Position,
  MarkerType,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useKnowledgeGraph } from '../../hooks/useKnowledgeGraph';

const nodeColors: Record<string, string> = {
  auth: '#6B46C1',
  payment: '#EC4899',
  content: '#3B82F6',
  notification: '#10B981',
  admin: '#F59E0B',
  api: '#06B6D4',
  user: '#8B5CF6',
  core: '#EF4444',
};

function getNodeColor(id: string): string {
  for (const [key, color] of Object.entries(nodeColors)) {
    if (id.toLowerCase().includes(key)) return color;
  }
  return '#6B46C1';
}

function ModuleNode({ data }: NodeProps) {
  return (
    <Paper
      elevation={3}
      sx={{
        p: 1.5, minWidth: 160, borderRadius: 2,
        borderTop: 3,
        borderTopColor: data.color as string,
        cursor: 'pointer',
        '&:hover': { boxShadow: `0 4px 16px ${(data.color as string)}30` },
      }}
      onClick={() => data.onClick?.()}
    >
      <Handle type="target" position={Position.Left} style={{ background: data.color as string, width: 8, height: 8 }} />
      <Typography variant="subtitle2" sx={{ fontWeight: 700, fontSize: '0.8rem', mb: 0.5 }}>
        {data.label as string}
      </Typography>
      <Box sx={{ display: 'flex', gap: 1.5 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.25 }}>
          <Widgets sx={{ fontSize: 11, color: 'text.secondary' }} />
          <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.6rem' }}>
            {data.services as number}
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.25 }}>
          <Storage sx={{ fontSize: 11, color: 'text.secondary' }} />
          <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.6rem' }}>
            {data.entities as number}
          </Typography>
        </Box>
      </Box>
      <Handle type="source" position={Position.Right} style={{ background: data.color as string, width: 8, height: 8 }} />
    </Paper>
  );
}

const nodeTypes: NodeTypes = {
  moduleNode: ModuleNode,
};

function buildLayout(modules: any[], navigate: ReturnType<typeof useNavigate>): { nodes: Node[]; edges: Edge[] } {
  const nodes: Node[] = [];
  const edges: Edge[] = [];
  const SPACING_X = 280;
  const SPACING_Y = 120;
  const levels: Record<string, number> = {};

  function assignLevel(id: string, depth: number): number {
    if (levels[id] !== undefined) return levels[id];
    levels[id] = depth;
    const mod = modules.find((m) => m.id === id);
    if (mod) {
      for (const dep of mod.dependencies) {
        assignLevel(dep, depth + 1);
      }
    }
    return depth;
  }

  for (const mod of modules) {
    assignLevel(mod.id, 0);
  }

  const maxDepth = Math.max(...Object.values(levels), 0);
  const columns: Record<number, string[]> = {};
  for (const mod of modules) {
    const depth = levels[mod.id] || 0;
    if (!columns[depth]) columns[depth] = [];
    columns[depth].push(mod.id);
  }

  const positions: Record<string, { x: number; y: number }> = {};
  for (const mod of modules) {
    const depth = levels[mod.id] || 0;
    const col = columns[depth];
    const idx = col.indexOf(mod.id);
    const total = col.length;
    const startY = -(total - 1) * SPACING_Y / 2;
    positions[mod.id] = {
      x: depth * SPACING_X,
      y: startY + idx * SPACING_Y,
    };
  }

  for (const mod of modules) {
    const color = getNodeColor(mod.id);
    nodes.push({
      id: mod.id,
      type: 'moduleNode',
      position: positions[mod.id],
      data: {
        label: mod.name,
        color,
        services: mod.services.length,
        entities: mod.entities.length,
        onClick: () => navigate(`/modules/${mod.id}`),
      },
    });

    for (const depId of mod.dependencies) {
      if (positions[depId]) {
        edges.push({
          id: `${depId}->${mod.id}`,
          source: depId,
          target: mod.id,
          animated: true,
          style: { stroke: '#6B46C1', strokeWidth: 2 },
          markerEnd: { type: MarkerType.ArrowClosed, color: '#6B46C1' },
        });
      }
    }
  }

  return { nodes, edges };
}

export default function ModuleTree() {
  const { loaded, kg } = useKnowledgeGraph();
  const navigate = useNavigate();
  const reactFlowRef = useRef<any>(null);

  const modules = loaded ? kg.getModules() : [];

  const { nodes: layoutNodes, edges: layoutEdges } = useMemo(
    () => buildLayout(modules, navigate),
    [modules, navigate]
  );

  const [nodes, setNodes, onNodesChange] = useNodesState(layoutNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(layoutEdges);

  const fitView = useCallback(() => {
    reactFlowRef.current?.fitView({ padding: 0.3 });
  }, []);

  const zoomIn = useCallback(() => {
    const rf = reactFlowRef.current;
    if (rf) {
      const viewport = rf.getViewport();
      rf.setViewport({ ...viewport, zoom: viewport.zoom * 1.3 });
    }
  }, []);

  const zoomOut = useCallback(() => {
    const rf = reactFlowRef.current;
    if (rf) {
      const viewport = rf.getViewport();
      rf.setViewport({ ...viewport, zoom: viewport.zoom / 1.3 });
    }
  }, []);

  useEffect(() => {
    setNodes(layoutNodes);
    setEdges(layoutEdges);
  }, [layoutNodes, layoutEdges, setNodes, setEdges]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      style={{ height: 'calc(100vh - 120px)' }}
    >
      <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2, flexShrink: 0 }}>
          <Typography variant="h4" sx={{ fontWeight: 800, flexGrow: 1 }}>
            Module Dependency Tree
          </Typography>
          <Box sx={{ display: 'flex', gap: 0.5 }}>
            <Tooltip title="Zoom In">
              <IconButton size="small" onClick={zoomIn}><ZoomIn /></IconButton>
            </Tooltip>
            <Tooltip title="Zoom Out">
              <IconButton size="small" onClick={zoomOut}><ZoomOut /></IconButton>
            </Tooltip>
            <Tooltip title="Fit View">
              <IconButton size="small" onClick={fitView}><FitScreen /></IconButton>
            </Tooltip>
          </Box>
        </Box>

        <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap', flexShrink: 0 }}>
          <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, alignSelf: 'center' }}>
            Legend:
          </Typography>
          {Object.entries(nodeColors).map(([key, color]) => (
            <Chip
              key={key}
              label={key}
              size="small"
              sx={{ height: 20, fontSize: '0.6rem', bgcolor: `${color}18`, color, fontWeight: 600 }}
            />
          ))}
          <Box sx={{ flexGrow: 1 }} />
          <Typography variant="caption" sx={{ color: 'text.disabled', alignSelf: 'center' }}>
            {modules.length} modules | {edges.length} dependencies
          </Typography>
        </Box>

        <Paper sx={{ flexGrow: 1, overflow: 'hidden', position: 'relative' }}>
          {!loaded ? (
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
              <Typography color="text.secondary">Loading dependency tree...</Typography>
            </Box>
          ) : (
            <ReactFlow
              ref={reactFlowRef}
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              nodeTypes={nodeTypes}
              fitView
              attributionPosition="bottom-left"
              minZoom={0.1}
              maxZoom={3}
            >
              <Controls showInteractive={false} />
              <Background variant="dots" gap={20} size={1} />
              <MiniMap
                nodeStrokeColor="#6B46C1"
                nodeColor={(n) => (n.data?.color as string) || '#6B46C1'}
                maskColor="rgba(0,0,0,0.1)"
                style={{ border: '1px solid', borderColor: 'divider', borderRadius: 8 }}
              />
            </ReactFlow>
          )}
        </Paper>
      </Box>
    </motion.div>
  );
}
