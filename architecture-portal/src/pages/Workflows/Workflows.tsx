import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Box, Typography, Tabs, Tab, TextField, Grid2 as Grid, Skeleton,
  InputAdornment,
} from '@mui/material';
import { Search } from '@mui/icons-material';
import { useKnowledgeGraph } from '../../hooks/useKnowledgeGraph';
import WorkflowCard from '../../components/WorkflowCard/WorkflowCard';

const categories = [
  'All', 'A-System', 'B-Auth', 'C-Payments', 'D-Content',
  'E-RealTime', 'F-Data', 'G-Admin', 'H-Frontend',
  'I-Infrastructure', 'J-CrossCutting', 'K-Testing',
];

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

export default function Workflows() {
  const { loaded, kg } = useKnowledgeGraph();
  const [tab, setTab] = useState(0);
  const [search, setSearch] = useState('');

  const workflows = loaded ? kg.getWorkflows() : [];

  const filtered = useMemo(() => {
    let result = workflows;
    if (tab > 0) {
      const cat = categories[tab];
      result = result.filter((w) => w.category === cat);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (w) =>
          w.name.toLowerCase().includes(q) ||
          w.description.toLowerCase().includes(q)
      );
    }
    return result;
  }, [workflows, tab, search]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Box sx={{ mb: 4 }}>
        <Typography variant="h3" sx={{ fontWeight: 800, mb: 3 }}>
          Workflows
        </Typography>

        <Tabs
          value={tab}
          onChange={(_, v) => setTab(v)}
          variant="scrollable"
          scrollButtons="auto"
          sx={{ mb: 2, '& .MuiTab-root': { fontSize: '0.75rem', minHeight: 36, py: 0.5 } }}
        >
          {categories.map((cat) => (
            <Tab key={cat} label={cat} />
          ))}
        </Tabs>

        <TextField
          fullWidth
          size="small"
          placeholder="Search workflows..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <Search sx={{ color: 'text.secondary', fontSize: 20 }} />
                </InputAdornment>
              ),
            },
          }}
          sx={{ mb: 3 }}
        />

        {!loaded ? (
          <Grid container spacing={2}>
            {Array.from({ length: 6 }).map((_, i) => (
              <Grid size={{ xs: 12, sm: 6, md: 4 }} key={i}>
                <Skeleton variant="rectangular" height={180} sx={{ borderRadius: 2 }} />
              </Grid>
            ))}
          </Grid>
        ) : filtered.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 8 }}>
            <Typography variant="h6" sx={{ color: 'text.secondary', mb: 1 }}>
              No workflows found
            </Typography>
            <Typography variant="body2" sx={{ color: 'text.disabled' }}>
              {search ? 'Try a different search term.' : 'No workflows match the selected category.'}
            </Typography>
          </Box>
        ) : (
          <motion.div variants={containerVariants} initial="hidden" animate="visible">
            <Grid container spacing={2}>
              {filtered.map((wf) => (
                <Grid size={{ xs: 12, sm: 6, md: 4 }} key={wf.id}>
                  <motion.div variants={itemVariants} style={{ height: '100%' }}>
                    <WorkflowCard workflow={wf} />
                  </motion.div>
                </Grid>
              ))}
            </Grid>
          </motion.div>
        )}
      </Box>
    </motion.div>
  );
}
