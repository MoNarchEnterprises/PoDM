import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Box, Typography, TextField, Grid2 as Grid, Paper, Chip, Collapse,
  IconButton, Table, TableHead, TableRow, TableCell, TableBody,
  FormControl, InputLabel, Select, MenuItem, InputAdornment,
  Skeleton,
} from '@mui/material';
import {
  Search, Storage, ExpandMore, ExpandLess,
  TableChart, Link as LinkIcon,
} from '@mui/icons-material';
import { useKnowledgeGraph } from '../../hooks/useKnowledgeGraph';

export default function Database() {
  const { loaded, kg } = useKnowledgeGraph();
  const [search, setSearch] = useState('');
  const [moduleFilter, setModuleFilter] = useState('all');
  const [expanded, setExpanded] = useState<string | null>(null);

  const entities = loaded ? kg.getEntities() : [];
  const modules = loaded ? kg.getModules() : [];

  const moduleOptions = useMemo(() => {
    const names = new Set(entities.map((e) => e.module));
    return modules.filter((m) => names.has(m.id));
  }, [modules, entities]);

  const filtered = useMemo(() => {
    let result = entities;
    if (moduleFilter !== 'all') {
      result = result.filter((e) => e.module === moduleFilter);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (e) =>
          e.name.toLowerCase().includes(q) ||
          e.table.toLowerCase().includes(q)
      );
    }
    return result;
  }, [entities, moduleFilter, search]);

  if (!loaded) {
    return (
      <Box sx={{ p: 3 }}>
        <Skeleton variant="text" width="30%" height={40} sx={{ mb: 3 }} />
        <Skeleton variant="rectangular" height={400} sx={{ borderRadius: 2 }} />
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
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
          <Box
            sx={{
              width: 48, height: 48, borderRadius: 2,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              bgcolor: 'rgba(16, 185, 129, 0.1)', color: '#10B981',
            }}
          >
            <Storage />
          </Box>
          <Typography variant="h3" sx={{ fontWeight: 800 }}>
            Database Schema
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
          <TextField
            size="small"
            placeholder="Search by entity or table name..."
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
            sx={{ minWidth: 280, flexGrow: 1 }}
          />
          <FormControl size="small" sx={{ minWidth: 200 }}>
            <InputLabel>Module</InputLabel>
            <Select
              value={moduleFilter}
              label="Module"
              onChange={(e) => setModuleFilter(e.target.value)}
            >
              <MenuItem value="all">All Modules</MenuItem>
              {moduleOptions.map((m) => (
                <MenuItem key={m.id} value={m.id}>{m.name}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>

        <Grid container spacing={2}>
          {filtered.length === 0 ? (
            <Grid size={{ xs: 12 }}>
              <Paper variant="outlined" sx={{ p: 4, textAlign: 'center' }}>
                <Typography color="text.secondary">No entities found</Typography>
              </Paper>
            </Grid>
          ) : (
            filtered.map((entity) => (
              <Grid size={{ xs: 12, sm: 6, md: 4 }} key={entity.id}>
                <Paper
                  variant="outlined"
                  sx={{
                    p: 2,
                    cursor: 'pointer',
                    '&:hover': { borderColor: 'primary.main' },
                    borderColor: expanded === entity.id ? 'primary.main' : undefined,
                  }}
                  onClick={() => setExpanded(expanded === entity.id ? null : entity.id)}
                >
                  <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 1 }}>
                    <Box>
                      <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                        {entity.name}
                      </Typography>
                      <Typography variant="caption" sx={{ color: 'text.disabled', fontFamily: '"JetBrains Mono", monospace' }}>
                        {entity.table}
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <Chip
                        icon={<TableChart sx={{ fontSize: 12 }} />}
                        label={`${entity.fields.length} fields`}
                        size="small"
                        variant="outlined"
                        sx={{ height: 20, fontSize: '0.6rem' }}
                      />
                      <IconButton size="small">
                        {expanded === entity.id ? <ExpandLess fontSize="small" /> : <ExpandMore fontSize="small" />}
                      </IconButton>
                    </Box>
                  </Box>

                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 1 }}>
                    <Chip label={entity.module} size="small" sx={{ height: 20, fontSize: '0.6rem' }} />
                    {entity.relationships.length > 0 && (
                      <Chip
                        icon={<LinkIcon sx={{ fontSize: 12 }} />}
                        label={`${entity.relationships.length} rels`}
                        size="small"
                        variant="outlined"
                        sx={{ height: 20, fontSize: '0.6rem' }}
                      />
                    )}
                  </Box>

                  <Collapse in={expanded === entity.id}>
                    <Box sx={{ mt: 2 }}>
                      <Typography variant="caption" sx={{ fontWeight: 700, display: 'block', mb: 1, color: 'text.secondary' }}>
                        Fields
                      </Typography>
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell sx={{ fontWeight: 700, fontSize: '0.6rem', py: 0.5 }}>Name</TableCell>
                            <TableCell sx={{ fontWeight: 700, fontSize: '0.6rem', py: 0.5 }}>Type</TableCell>
                            <TableCell sx={{ fontWeight: 700, fontSize: '0.6rem', py: 0.5 }}>Description</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {entity.fields.map((f) => (
                            <TableRow key={f.name}>
                              <TableCell sx={{ py: 0.25 }}>
                                <Typography variant="caption" sx={{ fontFamily: '"JetBrains Mono", monospace', fontSize: '0.6rem' }}>
                                  {f.name}
                                </Typography>
                              </TableCell>
                              <TableCell sx={{ py: 0.25 }}>
                                <Typography variant="caption" sx={{ color: 'primary.main', fontSize: '0.6rem' }}>
                                  {f.type}
                                </Typography>
                              </TableCell>
                              <TableCell sx={{ py: 0.25 }}>
                                <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.6rem' }}>
                                  {f.description}
                                </Typography>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>

                      {entity.relationships.length > 0 && (
                        <Box sx={{ mt: 2 }}>
                          <Typography variant="caption" sx={{ fontWeight: 700, display: 'block', mb: 0.5, color: 'text.secondary' }}>
                            Relationships
                          </Typography>
                          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                            {entity.relationships.map((r, i) => (
                              <Chip
                                key={i}
                                label={`${r.type} → ${r.entity}`}
                                size="small"
                                variant="outlined"
                                sx={{ height: 20, fontSize: '0.55rem' }}
                              />
                            ))}
                          </Box>
                        </Box>
                      )}
                    </Box>
                  </Collapse>
                </Paper>
              </Grid>
            ))
          )}
        </Grid>

        <Typography variant="caption" sx={{ display: 'block', mt: 1, color: 'text.disabled', textAlign: 'right' }}>
          {filtered.length} entit{filtered.length !== 1 ? 'ies' : 'y'}
        </Typography>
      </Box>
    </motion.div>
  );
}
