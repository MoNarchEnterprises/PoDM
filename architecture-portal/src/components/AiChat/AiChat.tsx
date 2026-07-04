import { useState, useEffect, useRef, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { Components } from 'react-markdown';
import {
  Box, Paper, Typography, Chip, IconButton, Tooltip, Link,
} from '@mui/material';
import {
  ContentCopy as ContentCopyIcon,
  CheckCircleOutline as CheckIcon,
  SmartToy as BotIcon,
  Person as PersonIcon,
  Info as InfoIcon,
} from '@mui/icons-material';
import { alpha } from '@mui/material/styles';
import { useSettingsStore } from '../../store/settingsStore';
import type { ChatMessage } from '../../types';

interface AiChatProps {
  message: ChatMessage;
}

function formatTime(timestamp: number): string {
  const date = new Date(timestamp);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  const time = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  if (isToday) return time;
  return `${date.toLocaleDateString([], { month: 'short', day: 'numeric' })} ${time}`;
}

function MarkdownContent({ content }: { content: string }) {
  const theme = useSettingsStore((s) => s.settings.theme);
  const isDark = theme === 'dark';

  const components: Components = {
    p: ({ children }) => (
      <Typography variant="body2" sx={{ mb: 1, lineHeight: 1.7, '&:last-child': { mb: 0 } }}>
        {children}
      </Typography>
    ),
    code: ({ className, children }) => {
      const isInline = !className;
      if (isInline) {
        return (
          <Box
            component="code"
            sx={{
              fontFamily: '"JetBrains Mono", monospace',
              fontSize: '0.8rem',
              bgcolor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
              px: 0.5, py: 0.125, borderRadius: 0.5,
            }}
          >
            {children}
          </Box>
        );
      }
      return null;
    },
    pre: ({ children }) => (
      <Box
        sx={{
          p: 1.5, mb: 1.5, borderRadius: 1,
          bgcolor: isDark ? '#0F0F1A' : '#F1F0F7',
          overflow: 'auto',
          fontFamily: '"JetBrains Mono", monospace',
          fontSize: '0.8rem',
          lineHeight: 1.5,
          '& code': { bgcolor: 'transparent', p: 0, fontSize: '0.8rem' },
        }}
      >
        {children}
      </Box>
    ),
    ul: ({ children }) => (
      <Box component="ul" sx={{ mb: 1, pl: 2.5, '& li': { mb: 0.25 } }}>
        {children}
      </Box>
    ),
    ol: ({ children }) => (
      <Box component="ol" sx={{ mb: 1, pl: 2.5, '& li': { mb: 0.25 } }}>
        {children}
      </Box>
    ),
    li: ({ children }) => (
      <Typography component="li" variant="body2" sx={{ lineHeight: 1.7 }}>
        {children}
      </Typography>
    ),
    a: ({ href, children }) => (
      <Link href={href} target="_blank" rel="noopener noreferrer" underline="hover" sx={{ fontWeight: 500 }}>
        {children}
      </Link>
    ),
    strong: ({ children }) => <strong>{children}</strong>,
    em: ({ children }) => <em>{children}</em>,
    h1: ({ children }) => <Typography variant="h6" sx={{ mt: 1.5, mb: 0.5, fontWeight: 700 }}>{children}</Typography>,
    h2: ({ children }) => <Typography variant="subtitle1" sx={{ mt: 1.25, mb: 0.5, fontWeight: 700 }}>{children}</Typography>,
    h3: ({ children }) => <Typography variant="subtitle2" sx={{ mt: 1, mb: 0.25, fontWeight: 700 }}>{children}</Typography>,
    blockquote: ({ children }) => (
      <Box sx={{ pl: 1.5, borderLeft: 3, borderColor: 'primary.main', mb: 1, opacity: 0.8 }}>
        {children}
      </Box>
    ),
    hr: () => <Box sx={{ my: 1.5, borderTop: '1px solid', borderColor: 'divider' }} />,
    table: ({ children }) => (
      <Box sx={{ overflow: 'auto', mb: 1.5, '& table': { width: '100%', borderCollapse: 'collapse' } }}>
        {children}
      </Box>
    ),
  };

  return (
    <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
      {content}
    </ReactMarkdown>
  );
}

function TypewriterText({ content, speed = 15 }: { content: string; speed?: number }) {
  const [displayed, setDisplayed] = useState('');
  const indexRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setInterval>>();

  useEffect(() => {
    indexRef.current = 0;
    setDisplayed('');

    timerRef.current = setInterval(() => {
      if (indexRef.current < content.length) {
        setDisplayed(content.slice(0, indexRef.current + 1));
        indexRef.current++;
      } else {
        clearInterval(timerRef.current);
      }
    }, speed);

    return () => clearInterval(timerRef.current);
  }, [content, speed]);

  return <MarkdownContent content={displayed} />;
}

export default function AiChat({ message }: AiChatProps) {
  const theme = useSettingsStore((s) => s.settings.theme);
  const isDark = theme === 'dark';
  const [copied, setCopied] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);

  useEffect(() => {
    if (message.role === 'assistant' && message.content.length > 100) {
      setIsStreaming(true);
      const timer = setTimeout(() => setIsStreaming(false), message.content.length * 15 + 500);
      return () => clearTimeout(timer);
    }
    setIsStreaming(false);
  }, [message.content, message.role]);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* clipboard not available */ }
  }, [message.content]);

  if (message.role === 'system') {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 1 }}>
        <Box
          sx={{
            display: 'flex', alignItems: 'center', gap: 0.75,
            px: 2, py: 0.75, borderRadius: 2,
            bgcolor: isDark ? 'rgba(107, 70, 193, 0.08)' : alpha('#6B46C1', 0.04),
          }}
        >
          <InfoIcon sx={{ fontSize: 14, color: 'text.disabled' }} />
          <Typography variant="caption" sx={{ color: 'text.disabled', fontStyle: 'italic' }}>
            {message.content}
          </Typography>
        </Box>
      </Box>
    );
  }

  const isUser = message.role === 'user';

  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: isUser ? 'flex-end' : 'flex-start',
        mb: 1.5,
        px: 1,
      }}
    >
      <Box
        sx={{
          display: 'flex',
          flexDirection: isUser ? 'row-reverse' : 'row',
          gap: 1,
          maxWidth: '85%',
        }}
      >
        {/* Avatar */}
        <Box
          sx={{
            width: 32, height: 32, borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0, mt: 0.5,
            bgcolor: isUser ? 'primary.main' : (isDark ? 'rgba(107,70,193,0.2)' : alpha('#6B46C1', 0.1)),
            color: isUser ? '#fff' : 'primary.main',
          }}
        >
          {isUser ? <PersonIcon sx={{ fontSize: 18 }} /> : <BotIcon sx={{ fontSize: 18 }} />}
        </Box>

        {/* Message bubble */}
        <Box>
          <Paper
            elevation={0}
            sx={{
              p: 1.5,
              borderRadius: 2,
              bgcolor: isUser
                ? 'primary.main'
                : (isDark ? 'background.paper' : '#FFFFFF'),
              color: isUser ? '#fff' : 'text.primary',
              border: isUser ? 'none' : '1px solid',
              borderColor: isUser ? 'transparent' : 'divider',
              position: 'relative',
            }}
          >
            {isUser ? (
              <Typography variant="body2" sx={{ lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                {message.content}
              </Typography>
            ) : (
              <>
                {isStreaming ? (
                  <TypewriterText content={message.content} />
                ) : (
                  <MarkdownContent content={message.content} />
                )}

                {/* Copy button for assistant */}
                <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 0.5 }}>
                  <Tooltip title={copied ? 'Copied' : 'Copy'}>
                    <IconButton
                      size="small"
                      onClick={handleCopy}
                      sx={{
                        width: 24, height: 24,
                        color: copied ? 'success.main' : 'text.disabled',
                        '&:hover': { color: 'text.primary' },
                      }}
                    >
                      {copied ? <CheckIcon sx={{ fontSize: 14 }} /> : <ContentCopyIcon sx={{ fontSize: 14 }} />}
                    </IconButton>
                  </Tooltip>
                </Box>
              </>
            )}
          </Paper>

          {/* Sources */}
          {message.sources && message.sources.length > 0 && (
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 0.5, px: 0.5 }}>
              {message.sources.map((source, i) => (
                <Chip
                  key={i}
                  label={source.title}
                  size="small"
                  component="a"
                  href={source.path}
                  target="_blank"
                  rel="noopener noreferrer"
                  clickable
                  variant="outlined"
                  sx={{
                    height: 22, fontSize: '0.65rem',
                    borderColor: 'divider',
                    fontWeight: 500,
                    '&:hover': {
                      borderColor: 'primary.main',
                      color: 'primary.main',
                    },
                  }}
                />
              ))}
            </Box>
          )}

          {/* Timestamp */}
          <Typography
            variant="caption"
            sx={{
              display: 'block',
              mt: 0.25,
              px: 0.5,
              color: 'text.disabled',
              textAlign: isUser ? 'right' : 'left',
              fontSize: '0.65rem',
            }}
          >
            {formatTime(message.timestamp)}
          </Typography>
        </Box>
      </Box>
    </Box>
  );
}
