import { useState, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  AppBar, Toolbar, IconButton, Typography, Box, Tooltip,
} from '@mui/material';
import {
  Menu as MenuIcon,
  Search as SearchIcon,
  DarkMode as DarkModeIcon,
  LightMode as LightModeIcon,
  Settings as SettingsIcon,
} from '@mui/icons-material';
import { useSettingsStore } from '../../store/settingsStore';
import SearchDialog from '../SearchDialog/SearchDialog';

const breadcrumbNames: Record<string, string> = {
  '/': 'Dashboard',
  '/module-tree': 'Module Tree',
  '/modules': 'Modules',
  '/services': 'Services',
  '/routes': 'Routes',
  '/database': 'Database',
  '/entities': 'Entities',
  '/workflows': 'Workflows',
  '/diagrams': 'Diagrams',
  '/api': 'API Reference',
  '/ai': 'AI Assistant',
  '/settings': 'Settings',
};

export default function Header() {
  const navigate = useNavigate();
  const location = useLocation();
  const { settings, toggleSidebar, toggleTheme } = useSettingsStore();
  const [searchOpen, setSearchOpen] = useState(false);

  const currentPage = breadcrumbNames[location.pathname] || 'Unknown';

  const handleOpenSearch = useCallback(() => setSearchOpen(true), []);
  const handleCloseSearch = useCallback(() => setSearchOpen(false), []);

  return (
    <>
      <AppBar position="fixed" elevation={0} sx={{ zIndex: (t) => t.zIndex.drawer + 1 }}>
        <Toolbar>
          <IconButton
            edge="start"
            color="inherit"
            aria-label="toggle sidebar"
            onClick={toggleSidebar}
            sx={{ mr: 1 }}
          >
            <MenuIcon />
          </IconButton>

          <Box>
            <Typography
              variant="h6"
              noWrap
              sx={{
                fontWeight: 700,
                fontSize: '1.05rem',
                background: 'linear-gradient(135deg, #6B46C1, #EC4899)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              PoDM Architecture Intelligence Platform
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 500 }}>
              {currentPage}
            </Typography>
          </Box>

          <Box sx={{ flexGrow: 1 }} />

          <Tooltip title="Search (Ctrl+K)">
            <IconButton color="inherit" onClick={handleOpenSearch} sx={{ mr: 0.5 }}>
              <SearchIcon />
            </IconButton>
          </Tooltip>

          <Tooltip title={settings.theme === 'dark' ? 'Light mode' : 'Dark mode'}>
            <IconButton color="inherit" onClick={toggleTheme} sx={{ mr: 0.5 }}>
              {settings.theme === 'dark' ? <LightModeIcon /> : <DarkModeIcon />}
            </IconButton>
          </Tooltip>

          <Tooltip title="Settings">
            <IconButton color="inherit" onClick={() => navigate('/settings')}>
              <SettingsIcon />
            </IconButton>
          </Tooltip>
        </Toolbar>
      </AppBar>

      <SearchDialog open={searchOpen} onClose={handleCloseSearch} />
    </>
  );
}
