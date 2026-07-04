import { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Box, Typography, Paper, TextField, IconButton, Button,
  Select, MenuItem, FormControl, InputLabel, Chip, Skeleton,
  Collapse, Divider, Slider, Tooltip, Switch, FormControlLabel,
} from '@mui/material';
import {
  Send, Delete, ExpandMore, ExpandLess, Settings as SettingsIcon,
  SmartToy, Refresh, Psychology, AutoAwesome,
} from '@mui/icons-material';
import { useKnowledgeGraph } from '../../hooks/useKnowledgeGraph';
import { useSettings } from '../../hooks/useSettings';
import { useChatStore } from '../../store/chatStore';
import { ragService } from '../../services/rag';
import { ollamaClient } from '../../services/ollamaClient';
import type { OllamaModel, ChatMessage } from '../../types';
import AiChat from '../../components/AiChat/AiChat';

const suggestions = [
  'What modules exist?',
  'Show me the payment workflow',
  'Explain the auth architecture',
  'List all database entities',
  'What services does the auth module use?',
  'Show me the content upload flow',
];

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
  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

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
  }, [input, isLoading, selectedModel, messages, settings, addMessage, setLoading, setError]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

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
    </motion.div>
  );
}
