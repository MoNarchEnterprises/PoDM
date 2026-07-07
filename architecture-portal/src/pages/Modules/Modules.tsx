import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Box, Grid2 as Grid, Typography, TextField, Skeleton, InputAdornment,
} from '@mui/material';
import { Search } from '@mui/icons-material';
import { useKnowledgeGraph } from '../../hooks/useKnowledgeGraph';
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

export default function Modules() {
  const { loaded, kg } = useKnowledgeGraph();
  const [search, setSearch] = useState('');

  const modules = loaded ? kg.getModules() : [];

  const filtered = useMemo(() => {
    if (!search.trim()) return modules;
    const q = search.toLowerCase();
    return modules.filter(
      (m) =>
        m.name.toLowerCase().includes(q) ||
        m.description.toLowerCase().includes(q) ||
        m.path.toLowerCase().includes(q)
    );
  }, [modules, search]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Box sx={{ mb: 4 }}>
        <Typography variant="h3" sx={{ fontWeight: 800, mb: 3 }}>
          Modules
        </Typography>

        <TextField
          fullWidth
          size="small"
          placeholder="Search modules..."
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
                <Skeleton variant="rectangular" height={160} sx={{ borderRadius: 2 }} />
              </Grid>
            ))}
          </Grid>
        ) : filtered.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 8 }}>
            <Typography variant="h6" sx={{ color: 'text.secondary', mb: 1 }}>
              No modules found
            </Typography>
            <Typography variant="body2" sx={{ color: 'text.disabled' }}>
              {search ? 'Try a different search term.' : 'No modules are available.'}
            </Typography>
          </Box>
        ) : (
          <motion.div variants={containerVariants} initial="hidden" animate="visible">
            <Grid container spacing={2}>
              {filtered.map((mod) => (
                <Grid size={{ xs: 12, sm: 6, md: 4 }} key={mod.id}>
                  <motion.div variants={itemVariants} style={{ height: '100%' }}>
                    <ModuleCard module={mod} />
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
