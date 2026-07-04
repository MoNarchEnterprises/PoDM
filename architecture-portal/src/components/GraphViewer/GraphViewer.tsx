import { useMemo, useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Paper, Typography, Chip, IconButton, Tooltip, FormGroup,
  FormControlLabel, Checkbox, Divider, Switch,
} from '@mui/material';
import {
  ReactFlow, ReactFlowProvider, Controls, Background, MiniMap,
  useNodesState, useEdgesState, MarkerType,
  type Node, type Edge,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import {
  ZoomIn as ZoomInIcon, ZoomOut as ZoomOutIcon, FitScreen as FitScreenIcon,
  Layers as LayersIcon, Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
} from '@mui/icons-material';
import { knowledgeGraph } from '../../services/knowledgeGraph';
import { useSettingsStore } from '../../store/settingsStore';
import type { Relationship, KnowledgeGraph } from '../../types';

const NODE_COLORS: Record<string, string> = {
  module: '#6B46C1',
  service: '#3B82F6',
  entity: '#10B981',
  route: '#F59E0B',
  api: '#06B6D4',
  event: '#EAB308',
  agent: '#EC4899',
  queue: '#6B7280',
  page: '#8B5CF6',
  component: '#F97316',
};

const NODE_TYPE_OPTIONS = Object.keys(NODE_COLORS);

function buildNodes(graph: KnowledgeGraph): Node[] {
  const nodes: Node[] = [];
  let yOffset = 0;

  const addNodes = (items: any[], type: string, labelKey: string, descKey: string) => {
    items.forEach((item, i) => {
      const col = i % 4;
      const row = Math.floor(i / 4);
      nodes.push({
        id: item.id,
        type: 'default',
        position: { x: col * 280 + 40, y: yOffset + row * 80 },
        data: {
          label: item[labelKey],
          description: item[descKey],
          nodeType: type,
        },
        style: {
          background: NODE_COLORS[type],
          color: '#fff',
          border: `2px solid ${NODE_COLORS[type]}`,
          borderRadius: 8,
          padding: '8px 14px',
          fontSize: 13,
          fontWeight: 600,
          boxShadow: `0 2px 8px ${NODE_COLORS[type]}40`,
          width: 220,
        },
      });
    });
    if (items.length > 0) {
      yOffset += (Math.floor((items.length - 1) / 4) + 1) * 80 + 60;
    }
  };

  if (graph.modules) addNodes(graph.modules, 'module', 'name', 'description');
  if (graph.services) addNodes(graph.services, 'service', 'name', 'description');
  if (graph.entities) addNodes(graph.entities, 'entity', 'name', 'description');
  if (graph.routes) addNodes(graph.routes, 'route', 'domain', 'description');
  if (graph.externalSystems) addNodes(graph.externalSystems, 'api', 'name', 'purpose');
  if (graph.events) addNodes(graph.events, 'event', 'name', 'description');
  if (graph.agents) addNodes(graph.agents, 'agent', 'name', 'purpose');
  if (graph.queues) addNodes(graph.queues, 'queue', 'name', 'purpose');
  if (graph.components) addNodes(graph.components, 'component', 'name', 'description');
  if (graph.pages) addNodes(graph.pages, 'page', 'name', 'path');

  return nodes;
}

function buildEdges(relationships: Relationship[]): Edge[] {
  return relationships.map((rel, i) => ({
    id: `edge-${i}`,
    source: rel.source,
    target: rel.target,
    label: rel.type,
    type: 'smoothstep',
    animated: true,
    markerEnd: { type: MarkerType.ArrowClosed },
    style: { stroke: '#94A3B8', strokeWidth: 2 },
    labelStyle: { fontSize: 10, fontWeight: 500 },
    labelBgStyle: { fill: 'transparent' },
  }));
}

const typeRouteMap: Record<string, string> = {
  module: '/modules',
  service: '/services',
  entity: '/entities',
  route: '/routes',
  api: '/api',
  event: '/events',
  agent: '/ai',
  queue: '/queues',
  page: '/pages',
  component: '/components',
};

function Legend() {
  return (
    <Paper
      variant="outlined"
      sx={{ p: 1.5, minWidth: 140 }}
    >
      <Typography variant="caption" sx={{ fontWeight: 700, mb: 1, display: 'block' }}>
        Legend
      </Typography>
      {Object.entries(NODE_COLORS).map(([type, color]) => (
        <Box key={type} sx={{ display: 'flex', alignItems: 'center', gap: 0.75, py: 0.25 }}>
          <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: color, flexShrink: 0 }} />
          <Typography variant="caption" sx={{ textTransform: 'capitalize' }}>
            {type}
          </Typography>
        </Box>
      ))}
    </Paper>
  );
}

function GraphContent() {
  const navigate = useNavigate();
  const [loaded, setLoaded] = useState(false);
  const [filterTypes, setFilterTypes] = useState<Set<string>>(new Set(NODE_TYPE_OPTIONS));
  const [showLabels, setShowLabels] = useState(true);
  const graph = knowledgeGraph;

  useEffect(() => {
    if (!graph.isLoaded()) {
      graph.load().then(() => setLoaded(true));
    } else {
      setLoaded(true);
    }
  }, [graph]);

  const allNodes = useMemo(() => loaded ? buildNodes(graph) : [], [loaded, graph]);
  const allEdges = useMemo(() => loaded ? buildEdges(graph.getRelationships()) : [], [loaded, graph]);

  const filteredNodes = useMemo(() => {
    return allNodes.filter((n) => filterTypes.has(n.data?.nodeType));
  }, [allNodes, filterTypes]);

  const filteredNodeIds = useMemo(() => new Set(filteredNodes.map((n) => n.id)), [filteredNodes]);

  const filteredEdges = useMemo(() => {
    return allEdges.filter((e) => filteredNodeIds.has(e.source) && filteredNodeIds.has(e.target));
  }, [allEdges, filteredNodeIds]);

  const [nodes, setNodes, onNodesChange] = useNodesState(filteredNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(filteredEdges);

  useEffect(() => {
    const updatedNodes = filteredNodes.map((n) => ({
      ...n,
      data: { ...n.data, label: showLabels ? n.data.label : '' },
    }));
    setNodes(updatedNodes);
    setEdges(filteredEdges);
  }, [filteredNodes, filteredEdges, showLabels, setNodes, setEdges]);

  const onNodeClick = useCallback((_event: any, node: Node) => {
    const basePath = typeRouteMap[node.data?.nodeType] || '/modules';
    navigate(`${basePath}/${node.id}`);
  }, [navigate]);

  const toggleType = (type: string) => {
    setFilterTypes((prev) => {
      const next = new Set(prev);
      if (next.has(type)) next.delete(type);
      else next.add(type);
      return next;
    });
  };

  const reactFlowStyle = useMemo(() => ({
    width: '100%', height: 600,
  }), []);

  if (!loaded) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 600 }}>
        <Typography color="text.secondary">Loading dependency graph...</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', gap: 2 }}>
      {/* Filter panel */}
      <Paper variant="outlined" sx={{ p: 1.5, minWidth: 160, alignSelf: 'flex-start' }}>
        <Typography variant="caption" sx={{ fontWeight: 700, mb: 1, display: 'block' }}>
          Node Filters
        </Typography>
        {NODE_TYPE_OPTIONS.map((type) => (
          <FormControlLabel
            key={type}
            control={
              <Checkbox
                size="small"
                checked={filterTypes.has(type)}
                onChange={() => toggleType(type)}
                sx={{
                  color: NODE_COLORS[type],
                  '&.Mui-checked': { color: NODE_COLORS[type] },
                }}
              />
            }
            label={
              <Typography variant="caption" sx={{ textTransform: 'capitalize' }}>
                {type}
              </Typography>
            }
            sx={{ display: 'flex', mx: 0, my: -0.25 }}
          />
        ))}
        <Divider sx={{ my: 1 }} />
        <FormControlLabel
          control={
            <Switch
              size="small"
              checked={showLabels}
              onChange={() => setShowLabels((p) => !p)}
            />
          }
          label={
            <Typography variant="caption">Labels</Typography>
          }
          sx={{ display: 'flex', mx: 0 }}
        />
        <Divider sx={{ my: 1 }} />
        <Legend />
      </Paper>

      {/* Graph */}
      <Paper variant="outlined" sx={{ flexGrow: 1, overflow: 'hidden', position: 'relative' }}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onNodeClick={onNodeClick}
          fitView
          attributionPosition="bottom-left"
          nodeDragThreshold={5}
          style={reactFlowStyle}
        >
          <Controls showInteractive={false} />
          <Background variant="dots" gap={20} size={1} />
          <MiniMap
            nodeStrokeColor="#6B46C1"
            nodeColor={(n) => NODE_COLORS[n.data?.nodeType] || '#6B46C1'}
            maskColor="rgba(0,0,0,0.1)"
            style={{ border: '1px solid', borderColor: 'divider', borderRadius: 8 }}
          />
        </ReactFlow>
      </Paper>
    </Box>
  );
}

export default function GraphViewer() {
  return (
    <ReactFlowProvider>
      <GraphContent />
    </ReactFlowProvider>
  );
}
