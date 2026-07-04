import { useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Box, Typography, Paper, Grid, Chip, Table, TableHead,
  TableRow, TableCell, TableBody, Skeleton, Breadcrumbs,
  Button,
} from '@mui/material';
import {
  ArrowBack, AltRoute, Storage, Widgets,
  Hub, Assignment, AccountTree, Settings,
} from '@mui/icons-material';
import { alpha } from '@mui/material/styles';
import { useKnowledgeGraph } from '../../hooks/useKnowledgeGraph';
import type { Route, Entity } from '../../types';
import WorkflowCard from '../../components/WorkflowCard/WorkflowCard';
import DiagramCard from '../../components/DiagramCard/DiagramCard';

const methodColors: Record<string, string> = {
  GET: '#10B981',
  POST: '#3B82F6',
  PUT: '#F59E0B',
  PATCH: '#8B5CF6',
  DELETE: '#EF4444',
};

function MethodChip({ method }: { method: string }) {
  const color = methodColors[method] || '#6B46C1';
  return (
    <Chip
      label={method}
      size="small"
      sx={{
        height: 20, fontSize: '0.6rem', fontWeight: 700,
        bgcolor: alpha(color, 0.12), color,
        fontFamily: '"JetBrains Mono", monospace',
      }}
    />
  );
}

export default function ModuleDetail() {
  const { id } = useParams<{ id: string }>();
  const { loaded, kg } = useKnowledgeGraph();

  const mod = loaded && id ? kg.findModule(id) : undefined;

  const services = useMemo(() => (mod ? kg.getModuleServices(mod.id) : []), [mod, kg]);
  const entities = useMemo(() => (mod ? kg.getModuleEntities(mod.id) : []), [mod, kg]);
  const routes = useMemo(() => (mod ? kg.getModuleRoutes(mod.id) : []), [mod, kg]);
  const workflows = useMemo(() => (mod ? kg.getModuleWorkflows(mod.id) : []), [mod, kg]);
  const diagrams = useMemo(() => (mod ? kg.getModuleDiagrams(mod.id) : []), [mod, kg]);
  const dependencies = useMemo(() => (mod ? kg.getDependencies(mod.id) : []), [mod, kg]);
  const dependents = useMemo(() => (mod ? kg.getDependents(mod.id) : []), [mod, kg]);
  const relationships = useMemo(() => (mod && loaded ? kg.findEverythingRelatedTo(mod.id) : []), [mod, loaded, kg]);

  if (!loaded) {
    return (
      <Box sx={{ p: 3 }}>
        <Skeleton variant="text" width="40%" height={40} sx={{ mb: 2 }} />
        <Skeleton variant="rectangular" height={200} sx={{ borderRadius: 2, mb: 2 }} />
        <Skeleton variant="rectangular" height={200} sx={{ borderRadius: 2 }} />
      </Box>
    );
  }

  if (!mod) {
    return (
      <Box sx={{ textAlign: 'center', py: 8 }}>
        <Typography variant="h3" sx={{ fontWeight: 800, mb: 2, background: 'linear-gradient(135deg, #6B46C1, #EC4899)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          404
        </Typography>
        <Typography variant="h6" sx={{ color: 'text.secondary', mb: 1 }}>
          Module not found
        </Typography>
        <Typography variant="body2" sx={{ color: 'text.disabled', mb: 3 }}>
          The module "{id}" does not exist in the knowledge graph.
        </Typography>
        <Button component={Link} to="/modules" variant="contained" startIcon={<ArrowBack />}>
          Back to Modules
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
          <Link to="/modules" style={{ color: 'inherit', textDecoration: 'none' }}>
            <Typography variant="body2" sx={{ color: 'text.secondary', '&:hover': { color: 'primary.main' } }}>
              Modules
            </Typography>
          </Link>
          <Typography variant="body2" sx={{ color: 'text.primary' }}>
            {mod.name}
          </Typography>
        </Breadcrumbs>

        <Paper sx={{ p: 3, mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2, mb: 2 }}>
            <Box
              sx={{
                width: 48, height: 48, borderRadius: 2,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                bgcolor: 'rgba(107, 70, 193, 0.1)', color: 'primary.main',
                flexShrink: 0,
              }}
            >
              <Widgets />
            </Box>
            <Box>
              <Typography variant="h4" sx={{ fontWeight: 800, mb: 0.5 }}>
                {mod.name}
              </Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary', mb: 1 }}>
                {mod.description}
              </Typography>
              <Typography variant="caption" sx={{ color: 'text.disabled', fontFamily: '"JetBrains Mono", monospace' }}>
                {mod.path}
              </Typography>
            </Box>
          </Box>
        </Paper>

        <Paper sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
            Overview
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
            {mod.description}
          </Typography>
          <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
            Source Files
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
            {mod.sourceFiles.map((f) => (
              <Chip
                key={f}
                label={f}
                size="small"
                variant="outlined"
                sx={{ height: 22, fontSize: '0.65rem', fontFamily: '"JetBrains Mono", monospace' }}
              />
            ))}
          </Box>
        </Paper>

        {services.length > 0 && (
          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" sx={{ fontWeight: 700, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
              <Settings sx={{ fontSize: 20 }} /> Services ({services.length})
            </Typography>
            <Grid container spacing={2}>
              {services.map((svc) => (
                <Grid size={{ xs: 12, sm: 6, md: 4 }} key={svc.id}>
                  <Paper variant="outlined" sx={{ p: 2 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.5 }}>
                      {svc.name}
                    </Typography>
                    <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 1 }}>
                      {svc.description}
                    </Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {svc.methods.map((m) => (
                        <Chip key={m} label={m} size="small" sx={{ height: 20, fontSize: '0.6rem' }} />
                      ))}
                    </Box>
                  </Paper>
                </Grid>
              ))}
            </Grid>
          </Paper>
        )}

        {entities.length > 0 && (
          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" sx={{ fontWeight: 700, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
              <Storage sx={{ fontSize: 20 }} /> Entities ({entities.length})
            </Typography>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700 }}>Name</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Table</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Fields</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {entities.map((e) => (
                  <TableRow key={e.id}>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>{e.name}</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="caption" sx={{ fontFamily: '"JetBrains Mono", monospace' }}>
                        {e.table}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                        {e.fields.length} fields
                      </Typography>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Paper>
        )}

        {routes.length > 0 && (
          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" sx={{ fontWeight: 700, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
              <AltRoute sx={{ fontSize: 20 }} /> Routes ({routes.length})
            </Typography>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700 }}>Method</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Path</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Description</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {routes.map((r: Route) => (
                  <TableRow key={r.id}>
                    <TableCell>
                      <MethodChip method={r.methods} />
                    </TableCell>
                    <TableCell>
                      <Typography variant="caption" sx={{ fontFamily: '"JetBrains Mono", monospace' }}>
                        {r.path}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                        {r.description}
                      </Typography>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Paper>
        )}

        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid size={{ xs: 12, md: 6 }}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                <AccountTree sx={{ fontSize: 20 }} /> Dependencies ({dependencies.length})
              </Typography>
              {dependencies.length === 0 ? (
                <Typography variant="caption" sx={{ color: 'text.disabled' }}>No dependencies</Typography>
              ) : (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                  {dependencies.map((dep) => (
                    <Chip
                      key={dep.id}
                      label={dep.name}
                      size="small"
                      component={Link}
                      to={`/modules/${dep.id}`}
                      clickable
                      variant="outlined"
                      sx={{ height: 22, fontSize: '0.65rem' }}
                    />
                  ))}
                </Box>
              )}
            </Paper>
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                <AccountTree sx={{ fontSize: 20 }} /> Dependents ({dependents.length})
              </Typography>
              {dependents.length === 0 ? (
                <Typography variant="caption" sx={{ color: 'text.disabled' }}>No dependents</Typography>
              ) : (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                  {dependents.map((dep) => (
                    <Chip
                      key={dep.id}
                      label={dep.name}
                      size="small"
                      component={Link}
                      to={`/modules/${dep.id}`}
                      clickable
                      variant="outlined"
                      sx={{ height: 22, fontSize: '0.65rem' }}
                    />
                  ))}
                </Box>
              )}
            </Paper>
          </Grid>
        </Grid>

        {workflows.length > 0 && (
          <Box sx={{ mb: 3 }}>
            <Typography variant="h6" sx={{ fontWeight: 700, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
              <Assignment sx={{ fontSize: 20 }} /> Workflows ({workflows.length})
            </Typography>
            <Grid container spacing={2}>
              {workflows.map((wf) => (
                <Grid size={{ xs: 12, sm: 6, md: 4 }} key={wf.id}>
                  <WorkflowCard workflow={wf} />
                </Grid>
              ))}
            </Grid>
          </Box>
        )}

        {diagrams.length > 0 && (
          <Box sx={{ mb: 3 }}>
            <Typography variant="h6" sx={{ fontWeight: 700, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
              <Hub sx={{ fontSize: 20 }} /> Diagrams ({diagrams.length})
            </Typography>
            <Grid container spacing={2}>
              {diagrams.map((d) => (
                <Grid size={{ xs: 12, sm: 6, md: 4 }} key={d.id}>
                  <DiagramCard diagram={d} />
                </Grid>
              ))}
            </Grid>
          </Box>
        )}

        {relationships.length > 0 && (
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
              Relationships ({relationships.length})
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
              {relationships.map((rel: any, i: number) => (
                <Chip
                  key={i}
                  label={rel.name || rel.id || 'related'}
                  size="small"
                  variant="outlined"
                  sx={{ height: 22, fontSize: '0.65rem' }}
                />
              ))}
            </Box>
          </Paper>
        )}
      </Box>
    </motion.div>
  );
}


