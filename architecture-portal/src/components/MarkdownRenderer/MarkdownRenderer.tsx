import { useState, useEffect, useMemo, Component, type ReactNode } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import type { Components } from 'react-markdown';
import {
  Box, Paper, Typography, Chip, Table, TableHead, TableRow,
  TableCell, TableBody, List, ListItem, ListItemText, Link,
  CardMedia, Skeleton,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import { useSettingsStore } from '../../store/settingsStore';

interface MarkdownRendererProps {
  content: string;
  filePath?: string;
}

class ErrorBoundary extends Component<
  { children: ReactNode; fallback?: ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: ReactNode; fallback?: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <Paper variant="outlined" sx={{ p: 2, borderColor: 'error.main' }}>
          <Typography color="error">Failed to render markdown content.</Typography>
        </Paper>
      );
    }
    return this.props.children;
  }
}

function MarkdownContent({ content }: { content: string }) {
  const theme = useSettingsStore((s) => s.settings.theme);
  const isDark = theme === 'dark';

  const components: Components = useMemo(() => ({
    h1: ({ children, ...props }) => (
      <Typography variant="h4" {...props} sx={{ mt: 3, mb: 1.5, fontWeight: 700 }}>
        {children}
      </Typography>
    ),
    h2: ({ children, ...props }) => (
      <Typography variant="h5" {...props} sx={{ mt: 2.5, mb: 1, fontWeight: 700 }}>
        {children}
      </Typography>
    ),
    h3: ({ children, ...props }) => (
      <Typography variant="h6" {...props} sx={{ mt: 2, mb: 0.75, fontWeight: 600 }}>
        {children}
      </Typography>
    ),
    h4: ({ children, ...props }) => (
      <Typography variant="subtitle1" {...props} sx={{ mt: 1.5, mb: 0.5, fontWeight: 600 }}>
        {children}
      </Typography>
    ),
    h5: ({ children, ...props }) => (
      <Typography variant="subtitle2" {...props} sx={{ mt: 1.5, mb: 0.5, fontWeight: 600 }}>
        {children}
      </Typography>
    ),
    h6: ({ children, ...props }) => (
      <Typography variant="body1" {...props} sx={{ mt: 1.5, mb: 0.5, fontWeight: 600 }}>
        {children}
      </Typography>
    ),
    p: ({ children, ...props }) => (
      <Typography variant="body1" {...props} sx={{ mb: 1.5, lineHeight: 1.7 }}>
        {children}
      </Typography>
    ),
    code: ({ className, children, ...props }) => {
      const isInline = !className;
      if (isInline) {
        return (
          <Chip
            label={children}
            size="small"
            sx={{
              height: 22, fontSize: '0.8rem',
              fontFamily: '"JetBrains Mono", "Fira Code", monospace',
              bgcolor: isDark ? 'rgba(107, 70, 193, 0.15)' : 'rgba(107, 70, 193, 0.08)',
              color: isDark ? '#E2E8F0' : '#1A202C',
              fontWeight: 500,
              borderRadius: 0.5,
              verticalAlign: 'middle',
              mx: 0.25,
            }}
          />
        );
      }
      return null;
    },
    pre: ({ children }) => (
      <Paper
        variant="outlined"
        sx={{
          p: 2, mb: 2, borderRadius: 1.5,
          bgcolor: isDark ? '#0F0F1A' : '#F1F0F7',
          borderColor: isDark ? 'rgba(107, 70, 193, 0.15)' : 'rgba(107, 70, 193, 0.1)',
          overflow: 'auto',
          '& pre': { m: 0, fontFamily: '"JetBrains Mono", "Fira Code", monospace', fontSize: '0.85rem', lineHeight: 1.6 },
          '& code': { bgcolor: 'transparent', p: 0, fontSize: '0.85rem' },
        }}
      >
        {children}
      </Paper>
    ),
    table: ({ children }) => (
      <Table sx={{ mb: 2 }} size="small">
        {children}
      </Table>
    ),
    thead: ({ children }) => <TableHead>{children}</TableHead>,
    tbody: ({ children }) => <TableBody>{children}</TableBody>,
    tr: ({ children }) => <TableRow>{children}</TableRow>,
    th: ({ children }) => (
      <TableCell sx={{ fontWeight: 700, bgcolor: isDark ? 'rgba(107, 70, 193, 0.08)' : alpha('#6B46C1', 0.04) }}>
        <Typography variant="caption" sx={{ fontWeight: 700 }}>{children}</Typography>
      </TableCell>
    ),
    td: ({ children }) => (
      <TableCell>
        <Typography variant="body2">{children}</Typography>
      </TableCell>
    ),
    ul: ({ children }) => <List sx={{ mb: 1.5, pl: 2, listStyle: 'disc' }}>{children}</List>,
    ol: ({ children }) => <List sx={{ mb: 1.5, pl: 2, listStyle: 'decimal' }}>{children}</List>,
    li: ({ children }) => (
      <ListItem sx={{ display: 'list-item', py: 0.25, px: 0 }}>
        <ListItemText primary={children} primaryTypographyProps={{ variant: 'body1' }} />
      </ListItem>
    ),
    a: ({ href, children }) => (
      <Link href={href} target="_blank" rel="noopener noreferrer" underline="hover" sx={{ color: 'primary.main', fontWeight: 500 }}>
        {children}
      </Link>
    ),
    blockquote: ({ children }) => (
      <Paper
        variant="outlined"
        sx={{
          pl: 2, pr: 2, py: 1, mb: 2,
          borderLeft: 4,
          borderLeftColor: 'primary.main',
          borderColor: 'divider',
          bgcolor: isDark ? 'rgba(107, 70, 193, 0.04)' : alpha('#6B46C1', 0.02),
          '& p:last-child': { mb: 0 },
        }}
      >
        {children}
      </Paper>
    ),
    img: ({ src, alt }) => (
      <CardMedia
        component="img"
        image={src}
        alt={alt || ''}
        sx={{
          maxWidth: '100%', mb: 2, borderRadius: 1.5,
          border: '1px solid',
          borderColor: 'divider',
        }}
      />
    ),
    hr: () => (
      <Box sx={{ my: 3, borderTop: '1px solid', borderColor: 'divider' }} />
    ),
  }), [isDark]);

  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      rehypePlugins={[rehypeHighlight]}
      components={components}
    >
      {content}
    </ReactMarkdown>
  );
}

export default function MarkdownRenderer({ content, filePath }: MarkdownRendererProps) {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 100);
    return () => clearTimeout(timer);
  }, [content]);

  if (!content) {
    return (
      <Paper variant="outlined" sx={{ p: 4, textAlign: 'center' }}>
        <Typography color="text.secondary">No content available</Typography>
      </Paper>
    );
  }

  return (
    <ErrorBoundary>
      <Box>
        {filePath && (
          <Typography variant="caption" sx={{ color: 'text.disabled', mb: 1, display: 'block' }}>
            Source: {filePath}
          </Typography>
        )}

        {isLoading ? (
          <Box>
            <Skeleton variant="text" width="60%" height={32} sx={{ mb: 1 }} />
            <Skeleton variant="text" width="90%" height={20} sx={{ mb: 0.5 }} />
            <Skeleton variant="text" width="85%" height={20} sx={{ mb: 0.5 }} />
            <Skeleton variant="text" width="70%" height={20} sx={{ mb: 2 }} />
            <Skeleton variant="rectangular" height={120} sx={{ borderRadius: 1, mb: 2 }} />
            <Skeleton variant="text" width="95%" height={20} sx={{ mb: 0.5 }} />
            <Skeleton variant="text" width="50%" height={20} />
          </Box>
        ) : (
          <MarkdownContent content={content} />
        )}
      </Box>
    </ErrorBoundary>
  );
}
