import { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import {
  Box, Paper, IconButton, Tooltip, Typography, Skeleton,
  ToggleButtonGroup, ToggleButton, ButtonGroup,
} from '@mui/material';
import {
  ZoomIn as ZoomInIcon,
  ZoomOut as ZoomOutIcon,
  FitScreen as FitScreenIcon,
  Fullscreen as FullscreenIcon,
  FullscreenExit as FullscreenExitIcon,
  ContentCopy as ContentCopyIcon,
  Download as DownloadIcon,
  Print as PrintIcon,
  Image as ImageIcon,
} from '@mui/icons-material';
import { alpha } from '@mui/material/styles';
import mermaid from 'mermaid';
import { toPng, toSvg } from 'dom-to-image-more';
import { saveAs } from 'file-saver';
import { useSettingsStore } from '../../store/settingsStore';

interface MermaidViewerProps {
  definition: string;
  title?: string;
}

export default function MermaidViewer({ definition, title }: MermaidViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgContainerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isRendering, setIsRendering] = useState(true);
  const [renderError, setRenderError] = useState<string | null>(null);
  const [svgContent, setSvgContent] = useState<string | null>(null);
  const theme = useSettingsStore((s) => s.settings.theme);

  const mermaidTheme = useMemo(() => {
    return theme === 'dark' ? 'dark' : 'default';
  }, [theme]);

  useEffect(() => {
    mermaid.initialize({
      startOnLoad: false,
      theme: mermaidTheme,
      securityLevel: 'loose',
      fontFamily: '"Inter", "Roboto", sans-serif',
      themeVariables: {
        primaryColor: '#6B46C1',
        primaryBorderColor: '#6B46C1',
        lineColor: theme === 'dark' ? '#94A3B8' : '#4A5568',
        secondaryColor: '#EC4899',
        tertiaryColor: theme === 'dark' ? '#1A1A2E' : '#F8F7FC',
        background: theme === 'dark' ? '#1A1A2E' : '#FFFFFF',
        mainBkg: theme === 'dark' ? '#1A1A2E' : '#FFFFFF',
        nodeBorder: theme === 'dark' ? '#6B46C1' : '#6B46C1',
        clusterBkg: theme === 'dark' ? '#0F0F1A' : '#F8F7FC',
        clusterBorder: theme === 'dark' ? '#6B46C1' : '#6B46C1',
        titleColor: theme === 'dark' ? '#E2E8F0' : '#1A202C',
        edgeLabelBackground: theme === 'dark' ? '#1A1A2E' : '#FFFFFF',
        nodeTextColor: theme === 'dark' ? '#E2E8F0' : '#1A202C',
      },
    });
  }, [mermaidTheme, theme]);

  useEffect(() => {
    if (!definition?.trim()) {
      setIsRendering(false);
      setRenderError('No diagram definition provided');
      return;
    }

    let cancelled = false;
    setIsRendering(true);
    setRenderError(null);
    setSvgContent(null);

    const renderId = `mermaid-${Math.random().toString(36).slice(2, 9)}`;

    mermaid.render(renderId, definition)
      .then(({ svg }) => {
        if (!cancelled) {
          setSvgContent(svg);
          setIsRendering(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setRenderError(err instanceof Error ? err.message : 'Failed to render diagram');
          setIsRendering(false);
        }
      });

    return () => { cancelled = true; };
  }, [definition]);

  useEffect(() => {
    if (!svgContent || !svgContainerRef.current) return;
    svgContainerRef.current.innerHTML = svgContent;
  }, [svgContent]);

  const zoomIn = useCallback(() => {
    setScale((prev) => Math.min(prev + 0.25, 3));
  }, []);

  const zoomOut = useCallback(() => {
    setScale((prev) => Math.max(prev - 0.25, 0.25));
  }, []);

  const resetZoom = useCallback(() => {
    setScale(1);
  }, []);

  const toggleFullscreen = useCallback(async () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      try {
        await containerRef.current.requestFullscreen();
        setIsFullscreen(true);
      } catch { /* fullscreen not supported */ }
    } else {
      await document.exitFullscreen();
      setIsFullscreen(false);
    }
  }, []);

  useEffect(() => {
    const handleFsChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  const copySource = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(definition);
    } catch { /* clipboard not available */ }
  }, [definition]);

  const downloadSvg = useCallback(async () => {
    if (!svgContainerRef.current) return;
    try {
      const svgEl = svgContainerRef.current.querySelector('svg');
      if (!svgEl) return;
      const data = new XMLSerializer().serializeToString(svgEl);
      const blob = new Blob([data], { type: 'image/svg+xml;charset=utf-8' });
      saveAs(blob, `${title || 'diagram'}.svg`);
    } catch { /* download failed */ }
  }, [title]);

  const downloadPng = useCallback(async () => {
    if (!svgContainerRef.current) return;
    try {
      const svgEl = svgContainerRef.current.querySelector('svg');
      if (!svgEl) return;
      const dataUrl = await toPng(svgEl, { quality: 1, pixelRatio: 2 });
      saveAs(dataUrl, `${title || 'diagram'}.png`);
    } catch { /* download failed */ }
  }, [title]);

  const printDiagram = useCallback(() => {
    if (!svgContainerRef.current) return;
    const svgEl = svgContainerRef.current.querySelector('svg');
    if (!svgEl) return;
    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(`
      <html><head><title>${title || 'Diagram'}</title>
      <style>body{margin:0;display:flex;justify-content:center;align-items:center;min-height:100vh}svg{max-width:100%;height:auto}</style>
      </head><body>${svgContent}</body></html>
    `);
    win.document.close();
    win.focus();
    win.print();
  }, [svgContent, title]);

  return (
    <Paper
      ref={containerRef}
      variant="outlined"
      sx={{
        position: 'relative',
        overflow: 'hidden',
        bgcolor: theme === 'dark' ? 'rgba(15, 15, 26, 0.6)' : 'rgba(248, 247, 252, 0.6)',
        ...(isFullscreen && {
          position: 'fixed',
          inset: 0,
          zIndex: 9999,
          display: 'flex',
          flexDirection: 'column',
          borderRadius: 0,
        }),
      }}
    >
      {/* Controls bar */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          px: 1.5,
          py: 0.75,
          borderBottom: '1px solid',
          borderColor: 'divider',
          bgcolor: theme === 'dark' ? 'rgba(15,15,26,0.8)' : 'rgba(248,247,252,0.8)',
          backdropFilter: 'blur(8px)',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          {title && (
            <Typography variant="subtitle2" sx={{ fontWeight: 600, mr: 1 }}>
              {title}
            </Typography>
          )}
        </Box>

        <ButtonGroup size="small" variant="outlined" sx={{ mr: 1 }}>
          <Tooltip title="Zoom In">
            <IconButton size="small" onClick={zoomIn} disabled={scale >= 3}>
              <ZoomInIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Box sx={{ display: 'flex', alignItems: 'center', px: 1 }}>
            <Typography variant="caption" sx={{ fontWeight: 600, minWidth: 40, textAlign: 'center' }}>
              {Math.round(scale * 100)}%
            </Typography>
          </Box>
          <Tooltip title="Zoom Out">
            <IconButton size="small" onClick={zoomOut} disabled={scale <= 0.25}>
              <ZoomOutIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Reset Zoom">
            <IconButton size="small" onClick={resetZoom}>
              <FitScreenIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </ButtonGroup>

        <Box sx={{ display: 'flex', gap: 0.25 }}>
          <Tooltip title="Copy Mermaid Source">
            <IconButton size="small" onClick={copySource}>
              <ContentCopyIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Download SVG">
            <IconButton size="small" onClick={downloadSvg}>
              <DownloadIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Download PNG">
            <IconButton size="small" onClick={downloadPng}>
              <ImageIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Print">
            <IconButton size="small" onClick={printDiagram}>
              <PrintIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}>
            <IconButton size="small" onClick={toggleFullscreen}>
              {isFullscreen ? <FullscreenExitIcon fontSize="small" /> : <FullscreenIcon fontSize="small" />}
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* Content area */}
      <Box
        sx={{
          flexGrow: 1,
          overflow: 'auto',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'flex-start',
          p: 2,
          minHeight: 200,
          position: 'relative',
        }}
      >
        {isRendering && (
          <Box sx={{ width: '100%' }}>
            <Skeleton variant="rectangular" height={300} sx={{ borderRadius: 1 }} />
          </Box>
        )}

        {renderError && !isRendering && (
          <Paper
            variant="outlined"
            sx={{
              p: 2, m: 2, width: '100%',
              borderColor: 'error.main',
              bgcolor: alpha('#EF4444', 0.05),
            }}
          >
            <Typography variant="subtitle2" color="error" gutterBottom>
              Diagram Render Error
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary', whiteSpace: 'pre-wrap', fontFamily: 'monospace' }}>
              {renderError}
            </Typography>
            <Typography variant="caption" sx={{ mt: 1, display: 'block', color: 'text.secondary' }}>
              Raw mermaid source:
            </Typography>
            <Box
              component="pre"
              sx={{
                mt: 1, p: 1.5, borderRadius: 1, fontSize: '0.75rem',
                bgcolor: theme === 'dark' ? '#0F0F1A' : '#F1F0F7',
                overflow: 'auto', maxHeight: 200,
                fontFamily: '"JetBrains Mono", "Fira Code", monospace',
              }}
            >
              {definition}
            </Box>
          </Paper>
        )}

        <Box
          ref={svgContainerRef}
          sx={{
            transform: `scale(${scale})`,
            transformOrigin: 'top center',
            transition: 'transform 0.2s ease',
            display: renderError || isRendering ? 'none' : 'block',
            '& svg': {
              maxWidth: '100%',
              height: 'auto',
            },
          }}
        />
      </Box>
    </Paper>
  );
}
