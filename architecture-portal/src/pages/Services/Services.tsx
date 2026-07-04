import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Box, Typography, TextField, Table, TableHead, TableRow,
  TableCell, TableBody, Paper, Chip, Collapse, IconButton,
  FormControl, InputLabel, Select, MenuItem, InputAdornment,
  Skeleton,
} from '@mui/material';
import {
  Search, ExpandMore, ExpandLess, Widgets,
} from '@mui/icons-material';
import { useKnowledgeGraph } from '../../hooks/useKnowledgeGraph';

export default function Services() {
  const { loaded, kg } = useKnowledgeGraph();
  const [search, setSearch] = useState('');
  const [moduleFilter, setModuleFilter] = useState('all');
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  const services = loaded ? kg.getServices() : [];
  const modules = loaded ? kg.getModules() : [];

  const moduleOptions = useMemo(() => {
    const names = new Set(services.map((s) => s.module));
    return modules.filter((m) => names.has(m.id));
  }, [modules, services]);

  const filtered = useMemo(() => {
    let result = services;
    if (moduleFilter !== 'all') {
      result = result.filter((s) => s.module === moduleFilter);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          s.description.toLowerCase().includes(q) ||
          s.module.toLowerCase().includes(q)
      );
    }
    return result;
  }, [services, moduleFilter, search]);

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
        <Typography variant="h3" sx={{ fontWeight: 800, mb: 3 }}>
          Services
        </Typography>

        <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
          <TextField
            size="small"
            placeholder="Search services..."
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
                <TableCell sx={{ fontWeight: 700, width: 30 }} />
                <TableCell sx={{ fontWeight: 700 }}>Name</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Module</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Description</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Methods</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Dependencies</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6}>
                    <Typography variant="body2" sx={{ textAlign: 'center', py: 4, color: 'text.secondary' }}>
                      No services found
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((svc) => (
                  <>
                    <TableRow
                      key={svc.id}
                      hover
                      sx={{ cursor: 'pointer', '&:last-child td': { border: 0 } }}
                      onClick={() => setExpandedRow(expandedRow === svc.id ? null : svc.id)}
                    >
                      <TableCell>
                        <IconButton size="small">
                          {expandedRow === svc.id ? <ExpandLess fontSize="small" /> : <ExpandMore fontSize="small" />}
                        </IconButton>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {svc.name}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={svc.module}
                          size="small"
                          variant="outlined"
                          sx={{ height: 22, fontSize: '0.65rem' }}
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                          {svc.description}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="caption" sx={{ fontWeight: 600 }}>
                          {svc.methods.length}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.25 }}>
                          {svc.dependencies.length === 0 ? (
                            <Typography variant="caption" sx={{ color: 'text.disabled' }}>None</Typography>
                          ) : (
                            svc.dependencies.slice(0, 3).map((dep) => (
                              <Chip key={dep} label={dep} size="small" variant="outlined" sx={{ height: 18, fontSize: '0.55rem' }} />
                            ))
                          )}
                          {svc.dependencies.length > 3 && (
                            <Typography variant="caption" sx={{ color: 'text.disabled' }}>
                              +{svc.dependencies.length - 3}
                            </Typography>
                          )}
                        </Box>
                      </TableCell>
                    </TableRow>
                    <TableRow key={`${svc.id}-detail`}>
                      <TableCell sx={{ py: 0, border: 0 }} colSpan={6}>
                        <Collapse in={expandedRow === svc.id}>
                          <Box sx={{ py: 2, px: 1 }}>
                            <Typography variant="caption" sx={{ fontWeight: 700, display: 'block', mb: 1, color: 'text.secondary' }}>
                              Methods
                            </Typography>
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                              {svc.methods.map((m) => (
                                <Chip key={m} label={m} size="small" sx={{ height: 22, fontSize: '0.65rem' }} />
                              ))}
                            </Box>
                            {svc.dependencies.length > 0 && (
                              <>
                                <Typography variant="caption" sx={{ fontWeight: 700, display: 'block', mb: 1, mt: 2, color: 'text.secondary' }}>
                                  Dependencies
                                </Typography>
                                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                  {svc.dependencies.map((dep) => (
                                    <Chip key={dep} label={dep} size="small" variant="outlined" sx={{ height: 22, fontSize: '0.65rem' }} />
                                  ))}
                                </Box>
                              </>
                            )}
                            {svc.events && svc.events.length > 0 && (
                              <>
                                <Typography variant="caption" sx={{ fontWeight: 700, display: 'block', mb: 1, mt: 2, color: 'text.secondary' }}>
                                  Events
                                </Typography>
                                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                  {svc.events.map((e) => (
                                    <Chip key={e} label={e} size="small" variant="outlined" sx={{ height: 22, fontSize: '0.65rem' }} />
                                  ))}
                                </Box>
                              </>
                            )}
                          </Box>
                        </Collapse>
                      </TableCell>
                    </TableRow>
                  </>
                ))
              )}
            </TableBody>
          </Table>
        </Paper>

        <Typography variant="caption" sx={{ display: 'block', mt: 1, color: 'text.disabled', textAlign: 'right' }}>
          {filtered.length} service{filtered.length !== 1 ? 's' : ''}
        </Typography>
      </Box>
    </motion.div>
  );
}
