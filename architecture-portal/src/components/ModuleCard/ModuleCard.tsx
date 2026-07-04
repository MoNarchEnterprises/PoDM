import { useNavigate } from 'react-router-dom';
import {
  Card, CardContent, CardActionArea, Typography, Box, Chip,
} from '@mui/material';
import {
  Widgets as WidgetsIcon,
  AltRoute as AltRouteIcon,
  Storage as StorageIcon,
  Hub as HubIcon,
  AccountTree as AccountTreeIcon,
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import type { Module } from '../../types';

interface ModuleCardProps {
  module: Module;
}

const MODULE_ACCENT_COLORS: Record<string, string> = {
  auth: '#6B46C1',
  payment: '#EC4899',
  content: '#3B82F6',
  notification: '#10B981',
  admin: '#F59E0B',
  api: '#06B6D4',
  user: '#8B5CF6',
  core: '#EF4444',
};

function getAccent(id: string): string {
  for (const [key, color] of Object.entries(MODULE_ACCENT_COLORS)) {
    if (id.toLowerCase().includes(key)) return color;
  }
  return '#6B46C1';
}

export default function ModuleCard({ module: mod }: ModuleCardProps) {
  const navigate = useNavigate();
  const accentColor = getAccent(mod.id);

  const stats = [
    { label: 'Services', value: mod.services.length, icon: <WidgetsIcon fontSize="small" /> },
    { label: 'Entities', value: mod.entities.length, icon: <StorageIcon fontSize="small" /> },
    { label: 'Routes', value: mod.routes.length, icon: <AltRouteIcon fontSize="small" /> },
    { label: 'Diagrams', value: mod.diagrams.length, icon: <HubIcon fontSize="small" /> },
  ];

  return (
    <motion.div
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
      whileTap={{ scale: 0.98 }}
      style={{ height: '100%' }}
    >
      <Card
        sx={{
          height: '100%',
          position: 'relative',
          overflow: 'visible',
          '&:hover': {
            boxShadow: `0 8px 24px ${accentColor}20`,
          },
        }}
      >
        <Box
          sx={{
            position: 'absolute',
            top: 0, left: 0, right: 0,
            height: 4,
            bgcolor: accentColor,
            borderTopLeftRadius: 12,
            borderTopRightRadius: 12,
          }}
        />
        <CardActionArea onClick={() => navigate(`/modules/${mod.id}`)} sx={{ height: '100%', alignItems: 'flex-start' }}>
          <CardContent sx={{ p: 2.5, pt: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <Typography variant="h6" sx={{ fontWeight: 700, flexGrow: 1 }}>
                {mod.name}
              </Typography>
              {mod.dependencies && mod.dependencies.length > 0 && (
                <Chip
                  icon={<AccountTreeIcon sx={{ fontSize: 14 }} />}
                  label={`${mod.dependencies.length} deps`}
                  size="small"
                  variant="outlined"
                  sx={{
                    height: 22, fontSize: '0.65rem',
                    borderColor: accentColor,
                    color: accentColor,
                    fontWeight: 600,
                  }}
                />
              )}
            </Box>

            <Typography
              variant="body2"
              sx={{
                color: 'text.secondary',
                mb: 2,
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
                lineHeight: 1.5,
                minHeight: '3em',
              }}
            >
              {mod.description}
            </Typography>

            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
              {stats.map((stat) => (
                <Box key={stat.label} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <Box sx={{ color: 'text.secondary', display: 'flex' }}>
                    {stat.icon}
                  </Box>
                  <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary' }}>
                    {stat.value}
                  </Typography>
                  <Typography variant="caption" sx={{ color: 'text.disabled' }}>
                    {stat.label}
                  </Typography>
                </Box>
              ))}
            </Box>
          </CardContent>
        </CardActionArea>
      </Card>
    </motion.div>
  );
}
