import { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Box, Typography, Paper, TextField, IconButton, Button,
  Select, MenuItem, FormControl, InputLabel, Chip, Skeleton,
  Collapse, Slider, Tooltip, Switch, FormControlLabel,
  Dialog, DialogTitle, DialogContent, DialogActions, DialogContentText,
  LinearProgress,
} from '@mui/material';
import {
  Send, Delete, ExpandMore, ExpandLess, Settings as SettingsIcon,
  SmartToy, Refresh, Psychology, AutoAwesome, CloudDownload,
  CheckCircle, ErrorOutline,
} from '@mui/icons-material';
import { useKnowledgeGraph } from '../../hooks/useKnowledgeGraph';
import { useSettings } from '../../hooks/useSettings';
import { useChatStore } from '../../store/chatStore';
import { ragService } from '../../services/rag';
import { ollamaClient } from '../../services/ollamaClient';
import { embeddingService } from '../../services/embeddingService';
import type { OllamaModel, ChatMessage, EmbeddingIndexStatus } from '../../types';
import AiChat from '../../components/AiChat/AiChat';

const suggestions = [
  'What modules exist?',
  'Show me the payment workflow',
  'Explain the auth architecture',
  'List all database entities',
  'What services does the auth module use?',
  'Show me the content upload flow',
  'Where does the fee amount get calculated?',
];

const EMBED_MODEL_SIZES: Record<string, string> = {
  'nomic-embed-text': '~274 MB',
  'mxbai-embed-large': '~670 MB',
  'all-minilm': '~120 MB',
};

export default function AiAssistant() {
  const { loaded: kgLoaded } = useKnowledgeGraph();
  const { settings, updateSettings } = useSettings();
  const { messages, isLoading, error, addMessage, setLoading, setError, clearMessages } = useChatStore();
  const [input, setInput] = useState('');
  const [models, setModels] = useState<OllamaModel[]>([]);
  const [selectedModel, setSelectedModel] = useState(settings.defaultModel || '');
  const [showSystemPrompt, setShowSystemPrompt] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [contextVisible, setContextVisible] = useState(true);
  const [embeddingStatus, setEmbeddingStatus] = useState<EmbeddingIndexStatus | null>(null);
  const [pullDialogOpen, setPullDialogOpen] = useState(false);
  const [pullStatus, setPullStatus] = useState<string>('');
  const [pulling, setPulling] = useState(false);
  const [pendingQuery, setPendingQuery] = useState<string | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    embeddingService.setModel(settings.embeddingModel);
  }, [settings.embeddingModel]);

  useEffect(() => {
    const unsub = embeddingService.onStatus(setEmbeddingStatus);
    return unsub;
  }, []);

  useEffect(() => {
    if (kgLoaded) embeddingService.checkModel().catch(() => undefined);
  }, [kgLoaded]);

  useEffect(() => {
    ollamaClient.listModels().then((m) => {
      setModels(m);
      if (!selectedModel && m.length > 0) {
        setSelectedModel(m[0].name);
      }
    });
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const ensureIndexed = useCallback(async (query: string): Promise<string | null> => {
    if (embeddingStatus?.indexing) return null;
    if (embeddingStatus?.indexed && embeddingStatus.chunks > 0) return null;
    if (!kgLoaded) return null;

    if (!embeddingStatus?.modelAvailable) {
      setPendingQuery(query);
      setPullDialogOpen(true);
      return null;
    }

    embeddingService.index().catch((err) => console.warn('Indexing failed', err));
    return null;
  }, [embeddingStatus, kgLoaded]);

  useEffect(() => {
    if (pulling || !pendingQuery || !embeddingStatus?.modelAvailable) return;
    if (embeddingStatus?.indexed) {
      const q = pendingQuery;
      setPendingQuery(null);
      void q;
    }
  }, [pulling, pendingQuery, embeddingStatus]);

  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text || isLoading || !selectedModel) return;
    setInput('');

    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: text,
      timestamp: Date.now(),
    };
    addMessage(userMsg);
    setLoading(true);
    setError(null);

    try {
      if (kgLoaded && !embeddingService.isIndexing()) {
        if (!embeddingService.isIndexed() && embeddingService.isModelAvailable()) {
          embeddingService.index().catch((err) => console.warn('Background index failed', err));
        } else if (!embeddingService.isModelAvailable()) {
          ensureIndexed(text);
        }
      }

      const context = await ragService.retrieveContext(text);
      const chatHistory = messages
        .filter((m) => m.role !== 'system')
        .slice(-10)
        .map((m) => ({ role: m.role, content: m.content }));

      const systemContent = settings.systemPrompt +
        '\n\nRelevant documentation context:\n' + context.content;

      const request = {
        model: selectedModel,
        messages: [
          { role: 'system' as const, content: systemContent },
          ...chatHistory,
          { role: 'user' as const, content: text },
        ],
        options: {
          temperature: settings.temperature,
          top_p: settings.topP,
          top_k: settings.topK,
          repeat_penalty: settings.repeatPenalty,
          num_predict: settings.maxTokens,
          num_ctx: settings.contextWindow,
          keep_alive: settings.keepAlive,
        },
      };

      let responseText = '';

      if (settings.streaming) {
        const stream = await ollamaClient.chatStream(request);
        const reader = stream.getReader();
        const decoder = new TextDecoder();
        let done = false;
        const assistantId = crypto.randomUUID();

        addMessage({
          id: assistantId,
          role: 'assistant',
          content: '',
          timestamp: Date.now(),
          sources: context.sources,
        });

        while (!done) {
          const { value, done: doneReading } = await reader.read();
          done = doneReading;
          if (value) {
            const chunk = decoder.decode(value, { stream: true });
            const lines = chunk.split('\n').filter(Boolean);
            for (const line of lines) {
              try {
                const parsed = JSON.parse(line);
                if (parsed.message?.content) {
                  responseText += parsed.message.content;
                  const store = useChatStore.getState();
                  const msgs = store.messages;
                  const idx = msgs.findIndex((m) => m.id === assistantId);
                  if (idx >= 0) {
                    msgs[idx] = { ...msgs[idx], content: responseText };
                    useChatStore.setState({ messages: [...msgs] });
                  }
                }
              } catch { /* JSON parse error - skip */ }
            }
          }
        }
      } else {
        const response = await ollamaClient.chat(request);
        responseText = response.message?.content || '';
        addMessage({
          id: crypto.randomUUID(),
          role: 'assistant',
          content: responseText,
          timestamp: Date.now(),
          sources: context.sources,
        });
      }
    } catch (err: any) {
      setError(err.message || 'Failed to get response from Ollama');
    } finally {
      setLoading(false);
    }
  }, [input, isLoading, selectedModel, messages, settings, addMessage, setLoading, setError, kgLoaded, ensureIndexed]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handlePullConfirm = useCallback(async () => {
    setPulling(true);
    setPullStatus('pulling...');
    try {
      await ollamaClient.pullModel(settings.embeddingModel, (status) => {
        setPullStatus(status);
      });
      setPullStatus('Model ready!');
      await embeddingService.checkModel();
      setPullDialogOpen(false);
      setPulling(false);
      setPullStatus('');
      if (pendingQuery) {
        embeddingService.index().catch(() => undefined);
      }
    } catch (err: any) {
      setPullStatus(`Failed: ${err.message}`);
      setPulling(false);
    }
  }, [settings.embeddingModel, pendingQuery]);

  const handlePullCancel = useCallback(() => {
    setPullDialogOpen(false);
    setPendingQuery(null);
    setPullStatus('');
    setPulling(false);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      style={{ height: 'calc(100vh - 120px)', display: 'flex', flexDirection: 'column' }}
    >
      <Box sx={{ display: 'flex', height: '100%', gap: 2, overflow: 'hidden' }}>
        <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          <Paper sx={{ p: 1.5, mb: 1, display: 'flex', alignItems: 'center', gap: 1, flexShrink: 0 }}>
            <SmartToy sx={{ color: 'primary.main' }} />
            <Typography variant="h6" sx={{ fontWeight: 700, flexGrow: 1 }}>
              AI Assistant
            </Typography>
            <FormControl size="small" sx={{ minWidth: 160 }}>
              <Select
                value={selectedModel}
                onChange={(e) => {
                  setSelectedModel(e.target.value);
                  updateSettings({ defaultModel: e.target.value });
                }}
                displayEmpty
              >
                {models.length === 0 && <MenuItem value="">No models</MenuItem>}
                {models.map((m) => (
                  <MenuItem key={m.name} value={m.name}>{m.name}</MenuItem>
                ))}
              </Select>
            </FormControl>

            {embeddingStatus && (
              <Tooltip title={
                embeddingStatus.indexing
                  ? `Indexing knowledge: ${embeddingStatus.progress.done}/${embeddingStatus.progress.total}`
                  : embeddingStatus.indexed
                    ? `${embeddingStatus.chunks} chunks indexed via ${embeddingStatus.model}`
                    : embeddingStatus.modelAvailable
                      ? 'Embeddings ready — index on first query'
                      : `Embedding model "${embeddingStatus.model}" not available`
              }>
                <Chip
                  size="small"
                  icon={
                    embeddingStatus.indexing ? <Refresh sx={{ fontSize: 14 }} /> :
                    embeddingStatus.indexed ? <CheckCircle sx={{ fontSize: 14 }} /> :
                    embeddingStatus.modelAvailable ? <CloudDownload sx={{ fontSize: 14 }} /> :
                    <ErrorOutline sx={{ fontSize: 14 }} />
                  }
                  label={
                    embeddingStatus.indexing
                      ? `${Math.round(embeddingStatus.progress.done / Math.max(1, embeddingStatus.progress.total) * 100)}%`
                      : embeddingStatus.indexed
                        ? `${embeddingStatus.chunks}`
                        : embeddingStatus.modelAvailable
                          ? 'Idle'
                          : 'No model'
                  }
                  variant="outlined"
                  color={embeddingStatus.indexed ? 'success' : embeddingStatus.modelAvailable ? 'info' : 'warning'}
                  sx={{ height: 24, fontWeight: 500, fontSize: '0.7rem' }}
                />
              </Tooltip>
            )}

            <Tooltip title="Settings">
              <IconButton size="small" onClick={() => setShowSettings(!showSettings)}>
                <SettingsIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title="Clear chat">
              <IconButton size="small" onClick={clearMessages} color="error">
                <Delete />
              </IconButton>
            </Tooltip>
          </Paper>

          <Collapse in={showSettings}>
            <Paper sx={{ p: 2, mb: 1 }}>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                <Box sx={{ minWidth: 120, flex: 1 }}>
                  <Typography variant="caption" sx={{ fontWeight: 600, display: 'block', mb: 0.5 }}>
                    Temperature: {settings.temperature.toFixed(1)}
                  </Typography>
                  <Slider
                    size="small"
                    value={settings.temperature}
                    min={0} max={2} step={0.1}
                    onChange={(_, v) => updateSettings({ temperature: v as number })}
                  />
                </Box>
                <Box sx={{ minWidth: 120, flex: 1 }}>
                  <Typography variant="caption" sx={{ fontWeight: 600, display: 'block', mb: 0.5 }}>
                    Top P: {settings.topP.toFixed(2)}
                  </Typography>
                  <Slider
                    size="small"
                    value={settings.topP}
                    min={0} max={1} step={0.05}
                    onChange={(_, v) => updateSettings({ topP: v as number })}
                  />
                </Box>
                <Box sx={{ minWidth: 120, flex: 1 }}>
                  <Typography variant="caption" sx={{ fontWeight: 600, display: 'block', mb: 0.5 }}>
                    Max Tokens: {settings.maxTokens}
                  </Typography>
                  <Slider
                    size="small"
                    value={settings.maxTokens}
                    min={128} max={8192} step={128}
                    onChange={(_, v) => updateSettings({ maxTokens: v as number })}
                  />
                </Box>
                <FormControlLabel
                  control={
                    <Switch
                      checked={settings.streaming}
                      onChange={(e) => updateSettings({ streaming: e.target.checked })}
                    />
                  }
                  label={
                    <Typography variant="caption" sx={{ fontWeight: 600 }}>Streaming</Typography>
                  }
                />
              </Box>

              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mt: 1 }}>
                <FormControl size="small" sx={{ minWidth: 180 }}>
                  <InputLabel id="embed-model-label" sx={{ fontSize: '0.75rem' }}>Embedding Model</InputLabel>
                  <Select
                    labelId="embed-model-label"
                    value={settings.embeddingModel}
                    label="Embedding Model"
                    onChange={(e) => updateSettings({ embeddingModel: e.target.value })}
                    sx={{ fontSize: '0.8rem' }}
                  >
                    <MenuItem value="nomic-embed-text">nomic-embed-text (~274MB)</MenuItem>
                    <MenuItem value="mxbai-embed-large">mxbai-embed-large (~670MB)</MenuItem>
                    <MenuItem value="all-minilm">all-minilm (~120MB)</MenuItem>
                  </Select>
                </FormControl>
                <Box sx={{ display: 'flex', alignItems: 'flex-end', gap: 1 }}>
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={() => embeddingService.index({ force: true }).catch(() => undefined)}
                    disabled={embeddingStatus?.indexing || !embeddingStatus?.modelAvailable}
                    startIcon={<Refresh />}
                    sx={{ fontSize: '0.7rem' }}
                  >
                    Re-index
                  </Button>
                  <Button
                    size="small"
                    variant="text"
                    color="error"
                    onClick={() => { embeddingService.clear(); }}
                    disabled={!embeddingStatus?.indexed}
                    sx={{ fontSize: '0.7rem' }}
                  >
                    Clear cache
                  </Button>
                </Box>
              </Box>

              {embeddingStatus?.indexing && (
                <Box sx={{ mt: 1.5 }}>
                  <Typography variant="caption" sx={{ fontWeight: 600, display: 'block', mb: 0.5 }}>
                    Indexing knowledge graph... {embeddingStatus.progress.done} / {embeddingStatus.progress.total}
                  </Typography>
                  <LinearProgress
                    variant="determinate"
                    value={embeddingStatus.progress.total > 0
                      ? (embeddingStatus.progress.done / embeddingStatus.progress.total) * 100
                      : 0}
                  />
                </Box>
              )}
              <Box sx={{ mt: 1 }}>
                <Box
                  sx={{ display: 'flex', alignItems: 'center', gap: 0.5, cursor: 'pointer' }}
                  onClick={() => setShowSystemPrompt(!showSystemPrompt)}
                >
                  <Psychology sx={{ fontSize: 16 }} />
                  <Typography variant="caption" sx={{ fontWeight: 600 }}>
                    System Prompt
                  </Typography>
                  {showSystemPrompt ? <ExpandLess fontSize="small" /> : <ExpandMore fontSize="small" />}
                </Box>
                <Collapse in={showSystemPrompt}>
                  <TextField
                    fullWidth
                    multiline
                    size="small"
                    minRows={3}
                    maxRows={8}
                    value={settings.systemPrompt}
                    onChange={(e) => updateSettings({ systemPrompt: e.target.value })}
                    sx={{ mt: 1 }}
                  />
                </Collapse>
              </Box>
            </Paper>
          </Collapse>

          <Box sx={{ flexGrow: 1, overflow: 'auto', mb: 1 }}>
            {messages.length === 0 && (
              <Box sx={{ textAlign: 'center', py: 6, px: 2 }}>
                <AutoAwesome sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />
                <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
                  Ask me about the architecture
                </Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary', mb: 3 }}>
                  I can answer questions about modules, workflows, diagrams, services, and more.
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 1 }}>
                  {suggestions.map((s) => (
                    <Chip
                      key={s}
                      label={s}
                      size="small"
                      clickable
                      variant="outlined"
                      onClick={() => {
                        setInput(s);
                        inputRef.current?.focus();
                      }}
                      sx={{ height: 28, fontSize: '0.75rem', '&:hover': { borderColor: 'primary.main' } }}
                    />
                  ))}
                </Box>
              </Box>
            )}

            {messages.map((msg) => (
              <AiChat key={msg.id} message={msg} />
            ))}

            {isLoading && (
              <Box sx={{ px: 2, py: 1 }}>
                <Skeleton variant="text" width="60%" height={20} />
                <Skeleton variant="text" width="40%" height={20} />
              </Box>
            )}

            {error && (
              <Paper
                variant="outlined"
                sx={{
                  mx: 2, p: 1.5, mb: 1, display: 'flex', alignItems: 'center', gap: 1,
                  borderColor: 'error.main',
                }}
              >
                <Typography variant="caption" color="error" sx={{ flexGrow: 1 }}>
                  {error}
                </Typography>
                <Button size="small" variant="outlined" color="error" onClick={handleSend} startIcon={<Refresh />}>
                  Retry
                </Button>
              </Paper>
            )}

            <div ref={chatEndRef} />
          </Box>

          <Paper sx={{ p: 1.5, display: 'flex', gap: 1, flexShrink: 0 }}>
            <TextField
              ref={inputRef}
              fullWidth
              size="small"
              placeholder="Ask about the architecture..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isLoading || !selectedModel}
              multiline
              maxRows={3}
            />
            <IconButton
              color="primary"
              onClick={handleSend}
              disabled={!input.trim() || isLoading || !selectedModel}
              sx={{ alignSelf: 'flex-end' }}
            >
              <Send />
            </IconButton>
          </Paper>
        </Box>

        {contextVisible && (
          <Paper
            sx={{
              width: 300, flexShrink: 0, display: 'flex', flexDirection: 'column',
              overflow: 'hidden',
            }}
          >
            <Box
              sx={{
                p: 1.5, display: 'flex', alignItems: 'center', gap: 1,
                borderBottom: '1px solid', borderColor: 'divider',
                cursor: 'pointer',
              }}
              onClick={() => setContextVisible(false)}
            >
              <Psychology sx={{ fontSize: 18, color: 'primary.main' }} />
              <Typography variant="subtitle2" sx={{ fontWeight: 700, flexGrow: 1 }}>
                Knowledge Context
              </Typography>
              <IconButton size="small">
                <ExpandMore fontSize="small" />
              </IconButton>
            </Box>
            <Box sx={{ flexGrow: 1, overflow: 'auto', p: 1.5 }}>
              {messages.length === 0 ? (
                <Typography variant="caption" sx={{ color: 'text.disabled' }}>
                  Context will appear here when you ask a question.
                </Typography>
              ) : (
                messages.filter((m) => m.sources && m.sources.length > 0).slice(-1).map((msg) => (
                  <Box key={msg.id}>
                    <Typography variant="caption" sx={{ fontWeight: 700, display: 'block', mb: 1, color: 'text.secondary' }}>
                      Source Documents
                    </Typography>
                    {msg.sources?.map((src, i) => (
                      <Paper
                        key={i}
                        variant="outlined"
                        sx={{
                          p: 1, mb: 0.75, borderLeft: 3,
                          borderLeftColor: src.relevance > 0.8 ? '#10B981' : src.relevance > 0.6 ? '#F59E0B' : '#6B7280',
                        }}
                      >
                        <Typography variant="caption" sx={{ fontWeight: 600, display: 'block', mb: 0.25 }}>
                          {src.title}
                        </Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <Box
                            sx={{
                              width: 40, height: 4, borderRadius: 2,
                              bgcolor: src.relevance > 0.8 ? '#10B981' : src.relevance > 0.6 ? '#F59E0B' : '#6B7280',
                            }}
                          />
                          <Typography variant="caption" sx={{ color: 'text.disabled', fontSize: '0.6rem' }}>
                            {Math.round(src.relevance * 100)}% relevant
                          </Typography>
                        </Box>
                      </Paper>
                    ))}
                  </Box>
                ))
              )}
            </Box>
          </Paper>
        )}
      </Box>

      <Dialog open={pullDialogOpen} onClose={handlePullCancel} maxWidth="xs" fullWidth>
        <DialogTitle>Download Embedding Model</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>
            The architecture AI needs an embedding model ({settings.embeddingModel}{' '}
            {EMBED_MODEL_SIZES[settings.embeddingModel] || ''})
            to index documentation for semantic search. Download it now?
          </DialogContentText>
          {pulling && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <LinearProgress />
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                {pullStatus}
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handlePullCancel} disabled={pulling} size="small">Skip</Button>
          <Button
            onClick={handlePullConfirm}
            disabled={pulling}
            variant="contained"
            size="small"
            startIcon={<CloudDownload />}
          >
            {pulling ? 'Downloading...' : 'Download'}
          </Button>
        </DialogActions>
      </Dialog>
    </motion.div>
  );
}
