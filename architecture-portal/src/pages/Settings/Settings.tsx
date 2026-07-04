import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Box, Typography, Paper, TextField, Button, Slider, Select,
  MenuItem, FormControl, InputLabel, Switch, FormControlLabel,
  IconButton, Tooltip, CircularProgress, Dialog, DialogTitle,
  DialogContent, DialogContentText, DialogActions,
} from '@mui/material';
import {
  Settings as SettingsIcon, CheckCircle, Error as ErrorIcon,
  Refresh, Delete, DarkMode, LightMode, ChevronLeft, ChevronRight,
  RestartAlt,
} from '@mui/icons-material';
import { useSettings } from '../../hooks/useSettings';
import { useChatStore } from '../../store/chatStore';
import { ollamaClient } from '../../services/ollamaClient';
import type { OllamaModel } from '../../types';

export default function Settings() {
  const { settings, updateSettings, resetSettings, toggleTheme, toggleSidebar } = useSettings();
  const { clearMessages } = useChatStore();
  const [models, setModels] = useState<OllamaModel[]>([]);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<'success' | 'error' | null>(null);
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [clearChatDialogOpen, setClearChatDialogOpen] = useState(false);

  useEffect(() => {
    if (settings.ollamaUrl) {
      ollamaClient.listModels().then(setModels);
    }
  }, [settings.ollamaUrl]);

  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult(null);
    ollamaClient.setBaseUrl(settings.ollamaUrl);
    const ok = await ollamaClient.testConnection();
    setTestResult(ok ? 'success' : 'error');
    setTesting(false);
    if (ok) {
      const m = await ollamaClient.listModels();
      setModels(m);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Box sx={{ mb: 4, maxWidth: 800 }}>
        <Typography variant="h3" sx={{ fontWeight: 800, mb: 3 }}>
          Settings
        </Typography>

        <Paper sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6" sx={{ fontWeight: 700, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
            <SettingsIcon sx={{ fontSize: 20 }} /> Ollama Configuration
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
            <TextField
              fullWidth
              size="small"
              label="Ollama URL"
              value={settings.ollamaUrl}
              onChange={(e) => updateSettings({ ollamaUrl: e.target.value })}
              placeholder="http://localhost:11434"
            />
            <Button
              variant="outlined"
              onClick={handleTestConnection}
              disabled={testing}
              sx={{ minWidth: 140, flexShrink: 0 }}
              startIcon={testing ? <CircularProgress size={16} /> : <Refresh />}
              endIcon={
                testResult === 'success' ? <CheckCircle sx={{ color: 'success.main' }} /> :
                testResult === 'error' ? <ErrorIcon sx={{ color: 'error.main' }} /> :
                undefined
              }
            >
              {testing ? 'Testing...' : 'Test Connection'}
            </Button>
          </Box>
          <FormControl fullWidth size="small">
            <InputLabel>Default Model</InputLabel>
            <Select
              value={settings.defaultModel}
              label="Default Model"
              onChange={(e) => updateSettings({ defaultModel: e.target.value })}
            >
              {models.map((m) => (
                <MenuItem key={m.name} value={m.name}>{m.name}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </Paper>

        <Paper sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
            Model Settings
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Box>
              <Typography variant="caption" sx={{ fontWeight: 600, display: 'block', mb: 0.5 }}>
                Temperature: {settings.temperature.toFixed(1)}
              </Typography>
              <Slider
                value={settings.temperature}
                min={0} max={2} step={0.1}
                onChange={(_, v) => updateSettings({ temperature: v as number })}
              />
            </Box>
            <Box>
              <Typography variant="caption" sx={{ fontWeight: 600, display: 'block', mb: 0.5 }}>
                Top P: {settings.topP.toFixed(2)}
              </Typography>
              <Slider
                value={settings.topP}
                min={0} max={1} step={0.05}
                onChange={(_, v) => updateSettings({ topP: v as number })}
              />
            </Box>
            <Box>
              <Typography variant="caption" sx={{ fontWeight: 600, display: 'block', mb: 0.5 }}>
                Top K: {settings.topK}
              </Typography>
              <Slider
                value={settings.topK}
                min={1} max={100} step={1}
                onChange={(_, v) => updateSettings({ topK: v as number })}
              />
            </Box>
            <Box>
              <Typography variant="caption" sx={{ fontWeight: 600, display: 'block', mb: 0.5 }}>
                Repeat Penalty: {settings.repeatPenalty.toFixed(1)}
              </Typography>
              <Slider
                value={settings.repeatPenalty}
                min={0} max={2} step={0.1}
                onChange={(_, v) => updateSettings({ repeatPenalty: v as number })}
              />
            </Box>
            <Box>
              <Typography variant="caption" sx={{ fontWeight: 600, display: 'block', mb: 0.5 }}>
                Context Window: {settings.contextWindow}
              </Typography>
              <Slider
                value={settings.contextWindow}
                min={2048} max={32768} step={1024}
                onChange={(_, v) => updateSettings({ contextWindow: v as number })}
              />
            </Box>
            <Box>
              <Typography variant="caption" sx={{ fontWeight: 600, display: 'block', mb: 0.5 }}>
                Max Tokens: {settings.maxTokens}
              </Typography>
              <Slider
                value={settings.maxTokens}
                min={128} max={8192} step={128}
                onChange={(_, v) => updateSettings({ maxTokens: v as number })}
              />
            </Box>
            <TextField
              size="small"
              label="Keep Alive"
              value={settings.keepAlive}
              onChange={(e) => updateSettings({ keepAlive: e.target.value })}
              helperText="Duration to keep model in memory (e.g. 5m, 1h)"
            />
          </Box>
        </Paper>

        <Paper sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6" sx={{ fontWeight: 700, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
            <Settings /> System Prompt
          </Typography>
          <TextField
            fullWidth
            multiline
            minRows={6}
            maxRows={12}
            value={settings.systemPrompt}
            onChange={(e) => updateSettings({ systemPrompt: e.target.value })}
          />
        </Paper>

        <Paper sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
            Appearance
          </Typography>
          <Box sx={{ display: 'flex', gap: 3, alignItems: 'center' }}>
            <FormControlLabel
              control={
                <Switch
                  checked={settings.theme === 'dark'}
                  onChange={toggleTheme}
                />
              }
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  {settings.theme === 'dark' ? <DarkMode sx={{ fontSize: 18 }} /> : <LightMode sx={{ fontSize: 18 }} />}
                  <Typography variant="body2">{settings.theme === 'dark' ? 'Dark' : 'Light'} Mode</Typography>
                </Box>
              }
            />
            <FormControlLabel
              control={
                <Switch
                  checked={settings.sidebarOpen}
                  onChange={toggleSidebar}
                />
              }
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  {settings.sidebarOpen ? <ChevronLeft sx={{ fontSize: 18 }} /> : <ChevronRight sx={{ fontSize: 18 }} />}
                  <Typography variant="body2">Sidebar</Typography>
                </Box>
              }
            />
          </Box>
        </Paper>

        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
            Data
          </Typography>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Button
              variant="outlined"
              color="warning"
              startIcon={<Delete />}
              onClick={() => setClearChatDialogOpen(true)}
            >
              Clear Chat History
            </Button>
            <Button
              variant="outlined"
              color="error"
              startIcon={<RestartAlt />}
              onClick={() => setResetDialogOpen(true)}
            >
              Reset to Defaults
            </Button>
          </Box>
        </Paper>
      </Box>

      <Dialog open={resetDialogOpen} onClose={() => setResetDialogOpen(false)}>
        <DialogTitle>Reset Settings</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to reset all settings to their defaults? This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setResetDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={() => { resetSettings(); setResetDialogOpen(false); }}
            color="error"
            variant="contained"
          >
            Reset
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={clearChatDialogOpen} onClose={() => setClearChatDialogOpen(false)}>
        <DialogTitle>Clear Chat History</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to clear all chat messages? This cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setClearChatDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={() => { clearMessages(); setClearChatDialogOpen(false); }}
            color="warning"
            variant="contained"
          >
            Clear
          </Button>
        </DialogActions>
      </Dialog>
    </motion.div>
  );
}
