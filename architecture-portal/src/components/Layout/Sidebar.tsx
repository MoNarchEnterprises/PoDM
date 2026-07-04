import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Box, Drawer, List, ListItemButton, ListItemIcon, ListItemText,
  Typography, Collapse, Divider, IconButton, Tooltip,
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  AccountTree as AccountTreeIcon,
  Widgets as WidgetsIcon,
  Settings as SettingsIcon,
  AltRoute as AltRouteIcon,
  Storage as StorageIcon,
  Schema as SchemaIcon,
  Assignment as AssignmentIcon,
  Hub as HubIcon,
  Api as ApiIcon,
  SmartToy as SmartToyIcon,
  ExpandLess, ExpandMore,
  ChevronLeft,
} from '@mui/icons-material';
import { useSettingsStore } from '../../store/settingsStore';

const DRAWER_WIDTH = 240;

interface NavItem {
  label: string;
  path: string;
  icon: React.ReactNode;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

const navSections: NavSection[] = [
  {
    title: 'Overview',
    items: [
      { label: 'Dashboard', path: '/', icon: <DashboardIcon /> },
      { label: 'Module Tree', path: '/module-tree', icon: <AccountTreeIcon /> },
    ],
  },
  {
    title: 'Architecture',
    items: [
      { label: 'Modules', path: '/modules', icon: <WidgetsIcon /> },
      { label: 'Services', path: '/services', icon: <SettingsIcon /> },
      { label: 'Routes', path: '/routes', icon: <AltRouteIcon /> },
      { label: 'Database', path: '/database', icon: <StorageIcon /> },
      { label: 'Entities', path: '/entities', icon: <SchemaIcon /> },
    ],
  },
  {
    title: 'Content',
    items: [
      { label: 'Workflows', path: '/workflows', icon: <AssignmentIcon /> },
      { label: 'Diagrams', path: '/diagrams', icon: <HubIcon /> },
      { label: 'API Reference', path: '/api', icon: <ApiIcon /> },
    ],
  },
  {
    title: 'Intelligence',
    items: [
      { label: 'AI Assistant', path: '/ai', icon: <SmartToyIcon /> },
      { label: 'Settings', path: '/settings', icon: <SettingsIcon /> },
    ],
  },
];

export default function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { settings, toggleSidebar } = useSettingsStore();
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    for (const section of navSections) {
      initial[section.title] = section.items.some(
        (item) => item.path !== '/' && location.pathname.startsWith(item.path)
      );
    }
    return initial;
  });

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  const toggleSection = (title: string) => {
    setExpandedSections((prev) => ({ ...prev, [title]: !prev[title] }));
  };

  const handleNavigate = (path: string) => {
    navigate(path);
  };

  return (
    <Drawer
      variant="permanent"
      sx={{
        width: settings.sidebarOpen ? DRAWER_WIDTH : 0,
        flexShrink: 0,
        whiteSpace: 'nowrap',
        '& .MuiDrawer-paper': {
          width: DRAWER_WIDTH,
          overflowX: 'hidden',
          transition: 'width 0.3s ease, transform 0.3s ease',
          transform: settings.sidebarOpen ? 'translateX(0)' : `translateX(-${DRAWER_WIDTH}px)`,
          bgcolor: 'background.paper',
          borderRight: '1px solid',
          borderColor: 'divider',
        },
      }}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          px: 2,
          py: 2.5,
          minHeight: '64px',
        }}
      >
        <Box>
          <Typography
            variant="h5"
            sx={{
              fontWeight: 800,
              background: 'linear-gradient(135deg, #6B46C1, #EC4899)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              lineHeight: 1.2,
            }}
          >
            PoDM
          </Typography>
          <Typography
            variant="caption"
            sx={{ color: 'text.secondary', fontWeight: 500, letterSpacing: 0.5 }}
          >
            Architecture Portal
          </Typography>
        </Box>
        <Tooltip title="Close sidebar">
          <IconButton size="small" onClick={toggleSidebar} sx={{ color: 'text.secondary' }}>
            <ChevronLeft fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>

      <Divider sx={{ mx: 1 }} />

      <Box sx={{ flexGrow: 1, overflowY: 'auto', py: 1, px: 1 }}>
        {navSections.map((section) => {
          const sectionActive = section.items.some((item) => isActive(item.path));
          const isExpanded = expandedSections[section.title] ?? sectionActive;
          const needsCollapse = section.items.length > 3;

          return (
            <Box key={section.title} sx={{ mb: 0.5 }}>
              <ListItemButton
                onClick={() => needsCollapse && toggleSection(section.title)}
                sx={{
                  px: 1.5,
                  py: 0.75,
                  borderRadius: 1,
                  '&:hover': { bgcolor: 'action.hover' },
                }}
              >
                <ListItemText
                  primary={section.title}
                  primaryTypographyProps={{
                    variant: 'caption',
                    sx: {
                      fontWeight: 700,
                      color: 'text.secondary',
                      textTransform: 'uppercase',
                      letterSpacing: 1,
                      fontSize: '0.7rem',
                    },
                  }}
                />
                {needsCollapse && (
                  isExpanded ? <ExpandLess fontSize="small" sx={{ color: 'text.secondary' }} />
                    : <ExpandMore fontSize="small" sx={{ color: 'text.secondary' }} />
                )}
              </ListItemButton>

              <Collapse in={!needsCollapse || isExpanded} timeout="auto" unmountOnExit>
                <List disablePadding dense>
                  {section.items.map((item) => (
                    <ListItemButton
                      key={item.path}
                      selected={isActive(item.path)}
                      onClick={() => handleNavigate(item.path)}
                      sx={{
                        mx: 0.5,
                        borderRadius: 1.5,
                        mb: 0.25,
                        py: 0.75,
                        '&.Mui-selected': {
                          bgcolor: 'rgba(107, 70, 193, 0.12)',
                          '&:hover': { bgcolor: 'rgba(107, 70, 193, 0.18)' },
                          '& .MuiListItemIcon-root': { color: 'primary.main' },
                          '& .MuiListItemText-primary': {
                            color: 'primary.main',
                            fontWeight: 600,
                          },
                        },
                      }}
                    >
                      <ListItemIcon
                        sx={{
                          minWidth: 36,
                          color: isActive(item.path) ? 'primary.main' : 'text.secondary',
                        }}
                      >
                        {item.icon}
                      </ListItemIcon>
                      <ListItemText
                        primary={item.label}
                        primaryTypographyProps={{
                          variant: 'body2',
                          sx: {
                            fontWeight: isActive(item.path) ? 600 : 500,
                            color: isActive(item.path) ? 'primary.main' : 'text.primary',
                          },
                        }}
                      />
                    </ListItemButton>
                  ))}
                </List>
              </Collapse>
            </Box>
          );
        })}
      </Box>
    </Drawer>
  );
}
