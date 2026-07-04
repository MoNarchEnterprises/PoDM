import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Box, Typography, TextField, Paper, Table, TableHead,
  TableRow, TableCell, TableBody, Chip, InputAdornment,
  FormControl, InputLabel, Select, MenuItem, Skeleton,
} from '@mui/material';
import {
  Search, AltRoute, Hub, Storage, Link as LinkIcon,
} from '@mui/icons-material';
import { alpha } from '@mui/material/styles';
import { useKnowledgeGraph } from '../../hooks/useKnowledgeGraph';

const relationshipColors: Record<string, string> = {
  'belongs_to': '#3B82F6',
  'has_many': '#10B981',
  'has_one': '#06B6D4',
  'references': '#F59E0B',
  'FK': '#F59E0B',
  'one_to_many': '#8B5CF6',
  'many_to_many': '#EC4899',
  'one_to_one': '#6B46C1',
};

function getRelColor(type: string): string {
  for (const [key, color] of Object.entries(relationshipColors)) {
    if (type.toLowerCase().includes(key)) return color;
  }
  return '#6B46C1';
}

export default function Entities() {
  const { loaded, kg } = useKnowledgeGraph();
  const [search, setSearch] = useState('');
  const [moduleFilter, setModuleFilter] = useState('all');

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
          e.table.toLowerCase().includes(q) ||
          e.relationships.some((r) => r.entity.toLowerCase().includes(q) || r.type.toLowerCase().includes(q))
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
              bgcolor: 'rgba(107, 70, 193, 0.1)', color: 'primary.main',
            }}
          >
            <Hub />
          </Box>
          <Typography variant="h3" sx={{ fontWeight: 800 }}>
            Entity Relationships
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
          <TextField
            size="small"
            placeholder="Search entities or relationships..."
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

        <Paper variant="outlined" sx={{ overflow: 'hidden' }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 700 }}>Entity</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Table</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Module</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Relationships</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4}>
                    <Typography variant="body2" sx={{ textAlign: 'center', py: 4, color: 'text.secondary' }}>
                      No entities found
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((entity) => (
                  <TableRow key={entity.id} hover>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <Storage sx={{ fontSize: 14, color: 'text.secondary' }} />
                        {entity.name}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="caption" sx={{ fontFamily: '"JetBrains Mono", monospace' }}>
                        {entity.table}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip label={entity.module} size="small" sx={{ height: 22, fontSize: '0.65rem' }} />
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                        {entity.relationships.length === 0 ? (
                          <Typography variant="caption" sx={{ color: 'text.disabled' }}>No relationships</Typography>
                        ) : (
                          entity.relationships.map((rel, i) => (
                            <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                              <Chip
                                label={rel.type}
                                size="small"
                                sx={{
                                  height: 20, fontSize: '0.6rem', fontWeight: 600,
                                  bgcolor: alpha(getRelColor(rel.type), 0.12),
                                  color: getRelColor(rel.type),
                                }}
                              />
                              <LinkIcon sx={{ fontSize: 12, color: 'text.disabled' }} />
                              <Typography variant="caption" sx={{ fontWeight: 600 }}>
                                {rel.entity}
                              </Typography>
                              {rel.description && (
                                <Typography variant="caption" sx={{ color: 'text.disabled', fontSize: '0.6rem' }}>
                                  — {rel.description}
                                </Typography>
                              )}
                            </Box>
                          ))
                        )}
                      </Box>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Paper>

        <Typography variant="caption" sx={{ display: 'block', mt: 1, color: 'text.disabled', textAlign: 'right' }}>
          {filtered.length} entit{filtered.length !== 1 ? 'ies' : 'y'}
        </Typography>
      </Box>
    </motion.div>
  );
}
