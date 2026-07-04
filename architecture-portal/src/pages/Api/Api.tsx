import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Box, Typography, Paper, Skeleton,
} from '@mui/material';
import { Api as ApiIcon } from '@mui/icons-material';
import { markdownLoader } from '../../services/markdownLoader';
import MarkdownRenderer from '../../components/MarkdownRenderer/MarkdownRenderer';

export default function Api() {
  const [content, setContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    markdownLoader.loadApiDoc()
      .then((text) => {
        setContent(text);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message || 'Failed to load API documentation');
        setLoading(false);
      });
  }, []);

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
              bgcolor: 'rgba(239, 68, 68, 0.1)', color: '#EF4444',
            }}
          >
            <ApiIcon />
          </Box>
          <Typography variant="h3" sx={{ fontWeight: 800 }}>
            API Reference
          </Typography>
        </Box>

        {loading ? (
          <Paper variant="outlined" sx={{ p: 3 }}>
            <Skeleton variant="text" width="60%" height={32} sx={{ mb: 1 }} />
            <Skeleton variant="text" width="90%" height={20} sx={{ mb: 0.5 }} />
            <Skeleton variant="text" width="85%" height={20} sx={{ mb: 0.5 }} />
            <Skeleton variant="text" width="70%" height={20} sx={{ mb: 2 }} />
            <Skeleton variant="rectangular" height={200} sx={{ borderRadius: 1, mb: 2 }} />
            <Skeleton variant="text" width="95%" height={20} sx={{ mb: 0.5 }} />
            <Skeleton variant="text" width="50%" height={20} />
          </Paper>
        ) : error ? (
          <Paper variant="outlined" sx={{ p: 4, textAlign: 'center', borderColor: 'error.main' }}>
            <Typography color="error" variant="h6" sx={{ mb: 1 }}>
              Failed to load API documentation
            </Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              {error}
            </Typography>
          </Paper>
        ) : (
          <Paper variant="outlined" sx={{ p: 3 }}>
            <MarkdownRenderer content={content || ''} filePath="docs/api/README.md" />
          </Paper>
        )}
      </Box>
    </motion.div>
  );
}
