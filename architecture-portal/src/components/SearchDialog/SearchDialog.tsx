import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Dialog, DialogContent, TextField, InputAdornment, List, ListItemButton,
  ListItemText, Chip, Typography, Box, CircularProgress, Divider,
  IconButton, DialogTitle,
} from '@mui/material';
import {
  Search as SearchIcon,
  Close as CloseIcon,
  Module as ModuleIcon,
  Settings as SettingsIcon,
  Schema as SchemaIcon,
  AltRoute as AltRouteIcon,
  Api as ApiIcon,
  SmartToy as SmartToyIcon,
  Event as EventIcon,
  Widgets as WidgetsIcon,
  AccountTree as AccountTreeIcon,
} from '@mui/icons-material';
import { alpha } from '@mui/material/styles';
import { searchService } from '../../services/searchService';

interface SearchResult {
  id: string;
  type: string;
  name: string;
  description: string;
  category?: string;
}

interface SearchDialogProps {
  open: boolean;
  onClose: () => void;
}

const TYPE_COLORS: Record<string, string> = {
  module: '#6B46C1',
  service: '#3B82F6',
  entity: '#10B981',
  route: '#F59E0B',
  page: '#8B5CF6',
  component: '#F97316',
  workflow: '#EF4444',
  diagram: '#06B6D4',
  api: '#06B6D4',
  agent: '#EC4899',
  event: '#EAB308',
  queue: '#6B7280',
};

const TYPE_ICONS: Record<string, React.ReactNode> = {
  module: <WidgetsIcon fontSize="small" />,
  service: <SettingsIcon fontSize="small" />,
  entity: <SchemaIcon fontSize="small" />,
  route: <AltRouteIcon fontSize="small" />,
  api: <ApiIcon fontSize="small" />,
  agent: <SmartToyIcon fontSize="small" />,
  event: <EventIcon fontSize="small" />,
};

const TYPE_ROUTES: Record<string, string> = {
  module: '/modules',
  service: '/services',
  entity: '/entities',
  route: '/routes',
  page: '/pages',
  component: '/components',
  workflow: '/workflows',
  diagram: '/diagrams',
  api: '/api',
  agent: '/ai',
  event: '/events',
  queue: '/queues',
};

interface GroupedResults {
  [category: string]: SearchResult[];
}

export default function SearchDialog({ open, onClose }: SearchDialogProps) {
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isReady, setIsReady] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);

  useEffect(() => {
    if (open) {
      setQuery('');
      setResults([]);
      setSelectedIndex(-1);
      setTimeout(() => inputRef.current?.focus(), 100);

      if (!isReady) {
        searchService.initialize().then(() => setIsReady(true));
      }
    }
  }, [open, isReady]);

  useEffect(() => {
    if (!query.trim() || !isReady) {
      setResults([]);
      setSelectedIndex(-1);
      return;
    }

    const timer = setTimeout(() => {
      const searchResults = searchService.search(query.trim(), 50);
      setResults(searchResults);
      setSelectedIndex(-1);
    }, 300);

    return () => clearTimeout(timer);
  }, [query, isReady]);

  const groupedResults = useMemo<GroupedResults>(() => {
    const groups: GroupedResults = {};
    for (const r of results) {
      const cat = r.category || r.type;
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(r);
    }
    return groups;
  }, [results]);

  const flatResults = useMemo(() => {
    const flat: { category: string; item: SearchResult }[] = [];
    for (const [cat, items] of Object.entries(groupedResults)) {
      for (const item of items) {
        flat.push({ category: cat, item });
      }
    }
    return flat;
  }, [groupedResults]);

  const handleSelect = useCallback((result: SearchResult) => {
    const basePath = TYPE_ROUTES[result.type] || '/modules';
    navigate(`${basePath}/${result.id}`);
    onClose();
  }, [navigate, onClose]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => Math.min(prev + 1, flatResults.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter' && selectedIndex >= 0 && flatResults[selectedIndex]) {
      handleSelect(flatResults[selectedIndex].item);
    }
  }, [flatResults, selectedIndex, handleSelect]);

  const handleClose = useCallback(() => {
    setQuery('');
    setResults([]);
    onClose();
  }, [onClose]);

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      fullWidth
      maxWidth="md"
      PaperProps={{
        sx: {
          borderRadius: 2,
          minHeight: 400,
          maxHeight: '80vh',
          overflow: 'hidden',
        },
      }}
    >
      <DialogTitle sx={{ p: 0 }}>
        <TextField
          ref={inputRef}
          fullWidth
          placeholder="Search modules, services, routes, entities, workflows..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          variant="outlined"
          autoComplete="off"
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ color: 'text.secondary' }} />
                </InputAdornment>
              ),
              endAdornment: query && (
                <InputAdornment position="end">
                  <IconButton size="small" onClick={() => setQuery('')}>
                    <CloseIcon fontSize="small" />
                  </IconButton>
                </InputAdornment>
              ),
              sx: {
                fontSize: '1.1rem',
                '& fieldset': { border: 'none' },
                '&:focus-within': { boxShadow: 'none' },
              },
            },
          }}
          sx={{
            '& .MuiOutlinedInput-root': {
              borderRadius: 0,
              bgcolor: 'transparent',
            },
          }}
        />
      </DialogTitle>

      <Divider />

      <DialogContent sx={{ p: 0, overflowY: 'auto' }}>
        {!isReady && (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 8 }}>
            <CircularProgress size={24} sx={{ mr: 1.5 }} />
            <Typography color="text.secondary">Loading search index...</Typography>
          </Box>
        )}

        {isReady && !query.trim() && (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 8 }}>
            <SearchIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1.5 }} />
            <Typography color="text.secondary" variant="body1">
              Type to search...
            </Typography>
            <Typography variant="caption" color="text.disabled" sx={{ mt: 0.5 }}>
              Search across all architecture documentation
            </Typography>
          </Box>
        )}

        {isReady && query.trim() && results.length === 0 && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
            <Typography color="text.secondary">
              No results found for "{query}"
            </Typography>
          </Box>
        )}

        {isReady && results.length > 0 && (
          <Box sx={{ py: 1 }}>
            {Object.entries(groupedResults).map(([category, items]) => (
              <Box key={category}>
                <Typography
                  variant="caption"
                  sx={{
                    px: 2.5, py: 0.75, display: 'block',
                    color: 'text.secondary', fontWeight: 700,
                    textTransform: 'uppercase', letterSpacing: 0.5, fontSize: '0.7rem',
                    bgcolor: alpha('#6B46C1', 0.04),
                  }}
                >
                  {category}
                </Typography>
                <List dense disablePadding>
                  {items.map((result) => {
                    const idx = flatResults.findIndex(
                      (f) => f.item.id === result.id && f.category === category
                    );
                    return (
                      <ListItemButton
                        key={`${result.type}-${result.id}`}
                        selected={selectedIndex === idx}
                        onClick={() => handleSelect(result)}
                        sx={{
                          px: 2.5, py: 1,
                          '&.Mui-selected': {
                            bgcolor: alpha('#6B46C1', 0.1),
                          },
                        }}
                      >
                        <Box sx={{ mr: 1.5, color: TYPE_COLORS[result.type] || 'text.secondary', display: 'flex' }}>
                          {TYPE_ICONS[result.type] || <AccountTreeIcon fontSize="small" />}
                        </Box>
                        <ListItemText
                          primary={
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                {result.name}
                              </Typography>
                              <Chip
                                label={result.type}
                                size="small"
                                sx={{
                                  height: 20, fontSize: '0.65rem',
                                  bgcolor: alpha(TYPE_COLORS[result.type] || '#6B46C1', 0.12),
                                  color: TYPE_COLORS[result.type] || '#6B46C1',
                                  fontWeight: 600,
                                }}
                              />
                            </Box>
                          }
                          secondary={result.description}
                          secondaryTypographyProps={{
                            variant: 'caption',
                            sx: {
                              color: 'text.secondary',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                              maxWidth: 600,
                              display: 'block',
                            },
                          }}
                        />
                      </ListItemButton>
                    );
                  })}
                </List>
              </Box>
            ))}
          </Box>
        )}
      </DialogContent>

      {results.length > 0 && (
        <Box
          sx={{
            px: 2.5, py: 1,
            borderTop: '1px solid',
            borderColor: 'divider',
            display: 'flex',
            gap: 2,
          }}
        >
          <Typography variant="caption" color="text.disabled">
            ↑↓ Navigate
          </Typography>
          <Typography variant="caption" color="text.disabled">
            ↵ Select
          </Typography>
          <Typography variant="caption" color="text.disabled">
            Esc Close
          </Typography>
        </Box>
      )}
    </Dialog>
  );
}
