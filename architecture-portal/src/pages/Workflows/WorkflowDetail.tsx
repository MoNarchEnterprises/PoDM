import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Box, Typography, Paper, Chip, Grid, Skeleton, Breadcrumbs,
  Button, Stepper, Step, StepLabel, Accordion, AccordionSummary,
  AccordionDetails, List, ListItem, ListItemText,
} from '@mui/material';
import {
  ArrowBack, ExpandMore, People, Error as ErrorIcon,
  Assignment, Redo, Hub, Api, Storage, Bolt, SmartToy,
} from '@mui/icons-material';
import { alpha } from '@mui/material/styles';
import { useKnowledgeGraph } from '../../hooks/useKnowledgeGraph';
import MermaidViewer from '../../components/MermaidViewer/MermaidViewer';

function getCategoryColor(category: string): string {
  const colors: Record<string, string> = {
    'A-System': '#6B46C1', 'B-Auth': '#8B5CF6', 'C-Payments': '#EC4899',
    'D-Content': '#3B82F6', 'E-RealTime': '#10B981', 'F-Data': '#06B6D4',
    'G-Admin': '#F59E0B', 'H-Frontend': '#F97316', 'I-Infrastructure': '#EF4444',
    'J-CrossCutting': '#6B7280', 'K-Testing': '#84CC16',
  };
  return colors[category] || '#6B46C1';
}

function buildFlowchartDefinition(workflow: { name: string; actors: string[]; mainFlow: string[]; alternativeFlows: { condition: string; steps: string[] }[]; errorPaths: { condition: string; steps: string[] }[] }): string {
  const lines: string[] = ['graph TD'];
  lines.push(`  A[Start] --> B{${workflow.actors.join(', ')}}`);
  workflow.mainFlow.forEach((step, i) => {
    const nodeId = `S${i + 1}`;
    const label = step.length > 50 ? step.slice(0, 50) + '...' : step;
    lines.push(`  ${i === 0 ? 'B' : `S${i}`} -->|"${i + 1}"| ${nodeId}["${label}"]`);
  });
  const lastStep = `S${workflow.mainFlow.length}`;
  lines.push(`  ${lastStep} --> E([End])`);
  workflow.alternativeFlows.forEach((alt, i) => {
    const altId = `ALT${i + 1}`;
    lines.push(`  B -.->|"${alt.condition.slice(0, 30)}"| ${altId}["Alt: ${alt.steps[0]?.slice(0, 40) || ''}"]`);
    lines.push(`  ${altId} --> E`);
  });
  workflow.errorPaths.forEach((err, i) => {
    const errId = `ERR${i + 1}`;
    lines.push(`  B -.->|"${err.condition.slice(0, 30)}"| ${errId}["❌ ${err.steps[0]?.slice(0, 40) || ''}"]`);
    lines.push(`  ${errId} --> E`);
  });
  return lines.join('\n');
}

export default function WorkflowDetail() {
  const { id } = useParams<{ id: string }>();
  const { loaded, kg } = useKnowledgeGraph();
  const [showDiagram, setShowDiagram] = useState(true);

  const workflow = loaded && id ? kg.findWorkflow(id) : undefined;

  if (!loaded) {
    return (
      <Box sx={{ p: 3 }}>
        <Skeleton variant="text" width="40%" height={40} sx={{ mb: 2 }} />
        <Skeleton variant="rectangular" height={200} sx={{ borderRadius: 2, mb: 2 }} />
        <Skeleton variant="rectangular" height={300} sx={{ borderRadius: 2 }} />
      </Box>
    );
  }

  if (!workflow) {
    return (
      <Box sx={{ textAlign: 'center', py: 8 }}>
        <Typography variant="h3" sx={{ fontWeight: 800, mb: 2, background: 'linear-gradient(135deg, #6B46C1, #EC4899)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          404
        </Typography>
        <Typography variant="h6" sx={{ color: 'text.secondary', mb: 1 }}>
          Workflow not found
        </Typography>
        <Typography variant="body2" sx={{ color: 'text.disabled', mb: 3 }}>
          The workflow "{id}" does not exist.
        </Typography>
        <Button component={Link} to="/workflows" variant="contained" startIcon={<ArrowBack />}>
          Back to Workflows
        </Button>
      </Box>
    );
  }

  const catColor = getCategoryColor(workflow.category);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Box sx={{ mb: 4 }}>
        <Breadcrumbs sx={{ mb: 2 }}>
          <Link to="/workflows" style={{ color: 'inherit', textDecoration: 'none' }}>
            <Typography variant="body2" sx={{ color: 'text.secondary', '&:hover': { color: 'primary.main' } }}>
              Workflows
            </Typography>
          </Link>
          <Typography variant="body2" sx={{ color: 'text.primary' }}>
            {workflow.name}
          </Typography>
        </Breadcrumbs>

        <Paper sx={{ p: 3, mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2, mb: 1 }}>
            <Box sx={{ color: catColor, mt: 0.5, display: 'flex' }}>
              <Assignment />
            </Box>
            <Box sx={{ flexGrow: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <Typography variant="h4" sx={{ fontWeight: 800 }}>
                  {workflow.name}
                </Typography>
                <Chip
                  label={workflow.category}
                  size="small"
                  sx={{ bgcolor: alpha(catColor, 0.12), color: catColor, fontWeight: 700, fontSize: '0.7rem' }}
                />
              </Box>
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                {workflow.description}
              </Typography>
            </Box>
          </Box>
        </Paper>

        <Paper sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
            Summary
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary', lineHeight: 1.7 }}>
            {workflow.description}
          </Typography>
        </Paper>

        <Paper sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6" sx={{ fontWeight: 700, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
            <People sx={{ fontSize: 20 }} /> Actors
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
            {workflow.actors.map((actor) => (
              <Chip key={actor} label={actor} size="small" sx={{ height: 24, fontWeight: 600 }} />
            ))}
          </Box>
        </Paper>

        <Paper sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
            Preconditions
          </Typography>
          {workflow.preconditions.length === 0 ? (
            <Typography variant="caption" sx={{ color: 'text.disabled' }}>None</Typography>
          ) : (
            <Box component="ol" sx={{ m: 0, pl: 2 }}>
              {workflow.preconditions.map((pc, i) => (
                <Typography component="li" key={i} variant="body2" sx={{ color: 'text.secondary', mb: 0.5 }}>
                  {pc}
                </Typography>
              ))}
            </Box>
          )}
        </Paper>

        <Paper sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
            Main Flow
          </Typography>
          <Stepper orientation="vertical" nonLinear>
            {workflow.mainFlow.map((step, i) => (
              <Step key={i} active completed>
                <StepLabel
                  slotProps={{
                    stepIcon: {
                      sx: { color: catColor, '&.Mui-completed': { color: catColor } },
                    },
                    label: {
                      sx: { '& .MuiTypography-root': { fontWeight: 500 } },
                    },
                  }}
                >
                  <Typography variant="body2">{step}</Typography>
                </StepLabel>
              </Step>
            ))}
          </Stepper>
        </Paper>

        {workflow.alternativeFlows.length > 0 && (
          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
              Alternative Flows
            </Typography>
            {workflow.alternativeFlows.map((alt, i) => (
              <Accordion key={i} variant="outlined" sx={{ mb: 1, '&:before': { display: 'none' } }}>
                <AccordionSummary expandIcon={<ExpandMore />}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                    {alt.condition}
                  </Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Box component="ol" sx={{ m: 0, pl: 2 }}>
                    {alt.steps.map((step, j) => (
                      <Typography component="li" key={j} variant="body2" sx={{ color: 'text.secondary', mb: 0.25 }}>
                        {step}
                      </Typography>
                    ))}
                  </Box>
                </AccordionDetails>
              </Accordion>
            ))}
          </Paper>
        )}

        {workflow.errorPaths.length > 0 && (
          <Paper sx={{ p: 3, mb: 3, borderColor: alpha('#EF4444', 0.2) }}>
            <Typography variant="h6" sx={{ fontWeight: 700, mb: 2, display: 'flex', alignItems: 'center', gap: 1, color: '#EF4444' }}>
              <ErrorIcon sx={{ fontSize: 20 }} /> Error Paths
            </Typography>
            {workflow.errorPaths.map((err, i) => (
              <Accordion
                key={i}
                variant="outlined"
                sx={{
                  mb: 1, '&:before': { display: 'none' },
                  borderColor: alpha('#EF4444', 0.3),
                }}
              >
                <AccordionSummary expandIcon={<ExpandMore />}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#EF4444' }}>
                    {err.condition}
                  </Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Box component="ol" sx={{ m: 0, pl: 2 }}>
                    {err.steps.map((step, j) => (
                      <Typography component="li" key={j} variant="body2" sx={{ color: 'text.secondary', mb: 0.25 }}>
                        {step}
                      </Typography>
                    ))}
                  </Box>
                </AccordionDetails>
              </Accordion>
            ))}
          </Paper>
        )}

        {workflow.retryPaths.length > 0 && (
          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" sx={{ fontWeight: 700, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
              <Redo sx={{ fontSize: 20 }} /> Retry Paths
            </Typography>
            <List dense>
              {workflow.retryPaths.map((rp, i) => (
                <ListItem key={i}>
                  <ListItemText primary={rp} primaryTypographyProps={{ variant: 'body2' }} />
                </ListItem>
              ))}
            </List>
          </Paper>
        )}

        <Paper sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
            Related
          </Typography>
          <Grid container spacing={2}>
            {workflow.modules.length > 0 && (
              <Grid size={{ xs: 6, sm: 4, md: 2 }}>
                <Typography variant="caption" sx={{ fontWeight: 700, display: 'block', mb: 0.5, color: 'text.secondary' }}>
                  Modules
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                  {workflow.modules.map((m) => (
                    <Chip key={m} icon={<Hub sx={{ fontSize: 12 }} />} label={m} size="small" variant="outlined" sx={{ height: 22, fontSize: '0.65rem' }} />
                  ))}
                </Box>
              </Grid>
            )}
            {workflow.apis.length > 0 && (
              <Grid size={{ xs: 6, sm: 4, md: 2 }}>
                <Typography variant="caption" sx={{ fontWeight: 700, display: 'block', mb: 0.5, color: 'text.secondary' }}>
                  APIs
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                  {workflow.apis.map((a) => (
                    <Chip key={a} icon={<Api sx={{ fontSize: 12 }} />} label={a} size="small" variant="outlined" sx={{ height: 22, fontSize: '0.65rem' }} />
                  ))}
                </Box>
              </Grid>
            )}
            {workflow.tables.length > 0 && (
              <Grid size={{ xs: 6, sm: 4, md: 2 }}>
                <Typography variant="caption" sx={{ fontWeight: 700, display: 'block', mb: 0.5, color: 'text.secondary' }}>
                  Tables
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                  {workflow.tables.map((t) => (
                    <Chip key={t} icon={<Storage sx={{ fontSize: 12 }} />} label={t} size="small" variant="outlined" sx={{ height: 22, fontSize: '0.65rem' }} />
                  ))}
                </Box>
              </Grid>
            )}
            {workflow.events.length > 0 && (
              <Grid size={{ xs: 6, sm: 4, md: 2 }}>
                <Typography variant="caption" sx={{ fontWeight: 700, display: 'block', mb: 0.5, color: 'text.secondary' }}>
                  Events
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                  {workflow.events.map((e) => (
                    <Chip key={e} icon={<Bolt sx={{ fontSize: 12 }} />} label={e} size="small" variant="outlined" sx={{ height: 22, fontSize: '0.65rem' }} />
                  ))}
                </Box>
              </Grid>
            )}
            {workflow.agents.length > 0 && (
              <Grid size={{ xs: 6, sm: 4, md: 2 }}>
                <Typography variant="caption" sx={{ fontWeight: 700, display: 'block', mb: 0.5, color: 'text.secondary' }}>
                  Agents
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                  {workflow.agents.map((a) => (
                    <Chip key={a} icon={<SmartToy sx={{ fontSize: 12 }} />} label={a} size="small" variant="outlined" sx={{ height: 22, fontSize: '0.65rem' }} />
                  ))}
                </Box>
              </Grid>
            )}
          </Grid>
        </Paper>

        {showDiagram && (
          <Box sx={{ mb: 3 }}>
            <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
              Flow Diagram
            </Typography>
            <MermaidViewer
              definition={buildFlowchartDefinition(workflow)}
              title={workflow.name}
            />
          </Box>
        )}
      </Box>
    </motion.div>
  );
}
