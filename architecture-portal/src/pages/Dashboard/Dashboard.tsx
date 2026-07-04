import { motion } from 'framer-motion';
import {
  Box, Grid, Typography, Paper, Skeleton,
} from '@mui/material';
import {
  Widgets, Settings, AltRoute, Storage, Web, Code,
  Assignment, Hub, Api, SmartToy, Bolt, Queue,
} from '@mui/icons-material';
import { useKnowledgeGraph } from '../../hooks/useKnowledgeGraph';
import StatCard from '../../components/StatCard/StatCard';
import ModuleCard from '../../components/ModuleCard/ModuleCard';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.05 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
};

const statsConfig = [
  { label: 'Total Modules', icon: <Widgets />, color: '#6B46C1', href: '/modules', key: 'modules' as const },
  { label: 'Services', icon: <Settings />, color: '#3B82F6', href: '/services', key: 'services' as const },
  { label: 'Routes', icon: <AltRoute />, color: '#F59E0B', href: '/api', key: 'routes' as const },
  { label: 'Database Entities', icon: <Storage />, color: '#10B981', href: '/entities', key: 'entities' as const },
  { label: 'Pages', icon: <Web />, color: '#06B6D4', href: '/modules', key: 'pages' as const },
  { label: 'Components', icon: <Code />, color: '#0891B2', href: '/modules', key: 'components' as const },
  { label: 'Workflows', icon: <Assignment />, color: '#EC4899', href: '/workflows', key: 'workflows' as const },
  { label: 'Diagrams', icon: <Hub />, color: '#6B46C1', href: '/diagrams', key: 'diagrams' as const },
  { label: 'External APIs', icon: <Api />, color: '#EF4444', href: '/api', key: 'externalApis' as const },
  { label: 'AI Agents', icon: <SmartToy />, color: '#EC4899', href: '/modules', key: 'agents' as const },
  { label: 'Events', icon: <Bolt />, color: '#EAB308', href: '/modules', key: 'events' as const },
  { label: 'Queues', icon: <Queue />, color: '#6B7280', href: '/modules', key: 'queues' as const },
];

export default function Dashboard() {
  const { loaded, error, kg, getStats } = useKnowledgeGraph();

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography color="error">Failed to load knowledge graph: {error}</Typography>
      </Box>
    );
  }

  const stats = loaded ? getStats() : null;
  const modules = loaded ? kg.getModules() : [];
  const architecture = loaded ? kg.getArchitecture() : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Box sx={{ mb: 4 }}>
        <Typography variant="h3" sx={{ fontWeight: 800, mb: 0.5 }}>
          Architecture Intelligence Platform
        </Typography>
        <Typography variant="body1" sx={{ color: 'text.secondary', mb: 3 }}>
          PoDM Architecture Intelligence Platform
        </Typography>

        <motion.div variants={containerVariants} initial="hidden" animate="visible">
          <Grid container spacing={2} sx={{ mb: 4 }}>
            {statsConfig.map((cfg) => (
              <Grid size={{ xs: 6, sm: 4, md: 3, lg: 2 }} key={cfg.key}>
                <motion.div variants={itemVariants} style={{ height: '100%' }}>
                  {loaded ? (
                    <StatCard
                      icon={cfg.icon}
                      label={cfg.label}
                      value={stats?.[cfg.key] ?? 0}
                      color={cfg.color}
                      href={cfg.href}
                    />
                  ) : (
                    <Skeleton variant="rectangular" height={100} sx={{ borderRadius: 2 }} />
                  )}
                </motion.div>
              </Grid>
            ))}
          </Grid>
        </motion.div>

        {architecture && (
          <Paper sx={{ p: 3, mb: 4 }}>
            <Typography variant="h5" sx={{ fontWeight: 700, mb: 2 }}>
              Architecture Overview
            </Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
              {architecture.description}
            </Typography>
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mb: 2 }}>
              {architecture.patterns.map((p) => (
                <Typography
                  key={p}
                  variant="caption"
                  sx={{
                    px: 1.5, py: 0.5, borderRadius: 1,
                    bgcolor: 'rgba(107, 70, 193, 0.1)',
                    color: 'primary.main', fontWeight: 600,
                  }}
                >
                  {p}
                </Typography>
              ))}
            </Box>
            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.5 }}>
                Principles
              </Typography>
              <Box component="ul" sx={{ m: 0, pl: 2 }}>
                {architecture.principles.map((pr) => (
                  <Typography component="li" key={pr} variant="caption" sx={{ color: 'text.secondary', mb: 0.25 }}>
                    {pr}
                  </Typography>
                ))}
              </Box>
            </Box>
          </Paper>
        )}

        <Typography variant="h5" sx={{ fontWeight: 700, mb: 2 }}>
          Modules
        </Typography>
        <Grid container spacing={2}>
          {loaded
            ? modules.map((mod) => (
                <Grid size={{ xs: 12, sm: 6, md: 4 }} key={mod.id}>
                  <ModuleCard module={mod} />
                </Grid>
              ))
            : Array.from({ length: 6 }).map((_, i) => (
                <Grid size={{ xs: 12, sm: 6, md: 4 }} key={i}>
                  <Skeleton variant="rectangular" height={160} sx={{ borderRadius: 2 }} />
                </Grid>
              ))}
        </Grid>
      </Box>
    </motion.div>
  );
}
