import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Box, Typography, Paper, Chip, Grid, Skeleton, Breadcrumbs,
  Button, IconButton, Collapse, Divider,
} from '@mui/material';
import {
  ArrowBack, ExpandMore, ExpandLess, ContentCopy,
  People, Widgets, Code as CodeIcon,
} from '@mui/icons-material';
import { alpha } from '@mui/material/styles';
import { useKnowledgeGraph } from '../../hooks/useKnowledgeGraph';
import { markdownLoader } from '../../services/markdownLoader';
import MermaidViewer from '../../components/MermaidViewer/MermaidViewer';

function buildDiagramType(type: string, spec: any): string {
  const typeMap: Record<string, string> = {
    'sequenceDiagram': 'sequenceDiagram',
    'flowchart': 'graph TD',
    'stateDiagram': 'stateDiagram-v2',
    'classDiagram': 'classDiagram',
    'entityRelationshipDiagram': 'erDiagram',
  };
  const prefix = typeMap[type] || 'graph TD';

  if (!spec) return `${prefix}\n  A[No spec data]`;

  try {
    const parts: string[] = [prefix];
    if (spec.entities) {
      for (const e of spec.entities) {
        parts.push(`  ${e.name}${e.type ? `: ${e.type}` : ''}`);
      }
    }
    if (spec.relationships) {
      for (const r of spec.relationships) {
        parts.push(`  ${r.source}${r.label ? `--${r.label}-->` : '-->'}${r.target}`);
      }
    }
    if (spec.nodes) {
      for (const n of spec.nodes) {
        parts.push(`  ${n.id}${n.label ? `[${n.label}]` : ''}`);
      }
    }
    if (spec.edges) {
      for (const e of spec.edges) {
        parts.push(`  ${e.from}${e.label ? `--${e.label}-->` : '-->'}${e.to}`);
      }
    }
    if (spec.participants) {
      for (const p of spec.participants) {
        parts.push(`  participant ${p}`);
      }
    }
    if (spec.messages) {
      for (const m of spec.messages) {
        parts.push(`  ${m.from}->>${m.to}: ${m.label || m.message || ''}`);
      }
    }
    if (spec.states) {
      for (const s of spec.states) {
        parts.push(`  state ${s}`);
      }
    }
    if (spec.transitions) {
      for (const t of spec.transitions) {
        parts.push(`  ${t.from} --> ${t.to}${t.label ? `: ${t.label}` : ''}`);
      }
    }
    return parts.join('\n');
  } catch {
    return `${prefix}\n  A[Error building diagram]`;
  }
}

export default function DiagramViewer() {
  const { id } = useParams<{ id: string }>();
  const { loaded, kg } = useKnowledgeGraph();
  const [spec, setSpec] = useState<any>(null);
  const [specLoading, setSpecLoading] = useState(true);
  const [showRaw, setShowRaw] = useState(false);
  const [copied, setCopied] = useState(false);

  const diagram = loaded && id ? kg.findDiagram(id) : undefined;
  const paddedId = id?.padStart(3, '0') || '';

  useEffect(() => {
    if (!id) return;
    setSpecLoading(true);
    markdownLoader.loadDiagramSpec(id).then((data) => {
      setSpec(data);
      setSpecLoading(false);
    });
  }, [id]);

  const definition = diagram && spec ? buildDiagramType(diagram.type, spec) : '';

  const handleCopySpec = async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(spec, null, 2));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* ignore */ }
  };

  if (!loaded || specLoading) {
    return (
      <Box sx={{ p: 3 }}>
        <Skeleton variant="text" width="40%" height={40} sx={{ mb: 2 }} />
        <Skeleton variant="rectangular" height={400} sx={{ borderRadius: 2 }} />
      </Box>
    );
  }

  if (!diagram) {
    return (
      <Box sx={{ textAlign: 'center', py: 8 }}>
        <Typography variant="h3" sx={{ fontWeight: 800, mb: 2, background: 'linear-gradient(135deg, #6B46C1, #EC4899)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          404
        </Typography>
        <Typography variant="h6" sx={{ color: 'text.secondary', mb: 1 }}>
          Diagram not found
        </Typography>
        <Typography variant="body2" sx={{ color: 'text.disabled', mb: 3 }}>
          The diagram "{id}" does not exist.
        </Typography>
        <Button component={Link} to="/diagrams" variant="contained" startIcon={<ArrowBack />}>
          Back to Diagrams
        </Button>
      </Box>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Box sx={{ mb: 4 }}>
        <Breadcrumbs sx={{ mb: 2 }}>
          <Link to="/diagrams" style={{ color: 'inherit', textDecoration: 'none' }}>
            <Typography variant="body2" sx={{ color: 'text.secondary', '&:hover': { color: 'primary.main' } }}>
              Diagrams
            </Typography>
          </Link>
          <Typography variant="body2" sx={{ color: 'text.primary' }}>
            {diagram.title}
          </Typography>
        </Breadcrumbs>

        <Grid container spacing={3}>
          <Grid size={{ xs: 12, md: 9 }}>
            {definition ? (
              <MermaidViewer definition={definition} title={diagram.title} />
            ) : (
              <Paper variant="outlined" sx={{ p: 4, textAlign: 'center' }}>
                <Typography color="text.secondary">
                  {specLoading ? 'Loading diagram...' : 'No diagram definition available.'}
                </Typography>
              </Paper>
            )}
          </Grid>

          <Grid size={{ xs: 12, md: 3 }}>
            <Paper sx={{ p: 2.5, mb: 2 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5 }}>
                Diagram Info
              </Typography>
              <Box sx={{ mb: 1.5 }}>
                <Typography variant="caption" sx={{ color: 'text.disabled', display: 'block', mb: 0.25 }}>
                  Title
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  {diagram.title}
                </Typography>
              </Box>
              <Box sx={{ mb: 1.5 }}>
                <Typography variant="caption" sx={{ color: 'text.disabled', display: 'block', mb: 0.25 }}>
                  Category
                </Typography>
                <Chip label={diagram.category} size="small" sx={{ height: 22, fontSize: '0.65rem' }} />
              </Box>
              <Box sx={{ mb: 1.5 }}>
                <Typography variant="caption" sx={{ color: 'text.disabled', display: 'block', mb: 0.25 }}>
                  Type
                </Typography>
                <Chip
                  label={diagram.type}
                  size="small"
                  sx={{
                    height: 22, fontSize: '0.65rem',
                    bgcolor: alpha('#6B46C1', 0.12), color: '#6B46C1', fontWeight: 600,
                  }}
                />
              </Box>
              <Box sx={{ mb: 1.5 }}>
                <Typography variant="caption" sx={{ color: 'text.disabled', display: 'block', mb: 0.25 }}>
                  ID
                </Typography>
                <Typography variant="caption" sx={{ fontFamily: '"JetBrains Mono", monospace' }}>
                  {diagram.id}
                </Typography>
              </Box>
              <Typography variant="body2" sx={{ color: 'text.secondary', mt: 1, lineHeight: 1.6 }}>
                {diagram.description}
              </Typography>
            </Paper>

            <Paper sx={{ p: 2.5, mb: 2 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <People sx={{ fontSize: 16 }} /> Participants
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                {diagram.participants.map((p) => (
                  <Chip key={p} label={p} size="small" variant="outlined" sx={{ height: 22, fontSize: '0.65rem' }} />
                ))}
              </Box>
            </Paper>

            <Paper sx={{ p: 2.5, mb: 2 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Widgets sx={{ fontSize: 16 }} /> Modules
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                {diagram.modules.map((m) => (
                  <Chip
                    key={m}
                    label={m}
                    size="small"
                    component={Link}
                    to={`/modules/${m}`}
                    clickable
                    variant="outlined"
                    sx={{ height: 22, fontSize: '0.65rem' }}
                  />
                ))}
              </Box>
            </Paper>

            <Paper sx={{ p: 2.5 }}>
              <Box
                sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}
                onClick={() => setShowRaw(!showRaw)}
              >
                <Typography variant="subtitle2" sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <CodeIcon sx={{ fontSize: 16 }} /> Raw JSON Spec
                </Typography>
                <IconButton size="small">
                  {showRaw ? <ExpandLess fontSize="small" /> : <ExpandMore fontSize="small" />}
                </IconButton>
              </Box>
              <Collapse in={showRaw}>
                <Divider sx={{ my: 1 }} />
                <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 0.5 }}>
                  <IconButton size="small" onClick={handleCopySpec} sx={{ color: copied ? 'success.main' : 'text.secondary' }}>
                    <ContentCopy sx={{ fontSize: 14 }} />
                  </IconButton>
                </Box>
                <Box
                  component="pre"
                  sx={{
                    p: 1.5, borderRadius: 1, fontSize: '0.65rem', maxHeight: 300, overflow: 'auto',
                    bgcolor: 'background.default',
                    fontFamily: '"JetBrains Mono", monospace',
                    lineHeight: 1.5,
                    border: '1px solid',
                    borderColor: 'divider',
                  }}
                >
                  {JSON.stringify(spec, null, 2)}
                </Box>
              </Collapse>
            </Paper>
          </Grid>
        </Grid>
      </Box>
    </motion.div>
  );
}
