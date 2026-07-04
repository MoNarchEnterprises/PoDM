import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Card, CardContent, CardActionArea, Typography, Box, Chip,
} from '@mui/material';
import {
  Hub as HubIcon,
  AccountTree as AccountTreeIcon,
  AltRoute as AltRouteIcon,
  Storage as StorageIcon,
  Schema as SchemaIcon,
  Timeline as TimelineIcon,
  Lan as LanIcon,
  People as PeopleIcon,
  Widgets as WidgetsIcon,
} from '@mui/icons-material';
import { alpha } from '@mui/material/styles';
import { motion } from 'framer-motion';
import type { Diagram } from '../../types';

interface DiagramCardProps {
  diagram: Diagram;
}

const TYPE_ICONS: Record<string, React.ReactNode> = {
  'C4 Context': <HubIcon />,
  'C4 Container': <AccountTreeIcon />,
  'Sequence': <TimelineIcon />,
  'Flowchart': <AltRouteIcon />,
  'Entity Relationship': <SchemaIcon />,
  'State': <AltRouteIcon />,
  'Deployment': <LanIcon />,
  'Component': <WidgetsIcon />,
  'Class': <SchemaIcon />,
};

const TYPE_COLORS: Record<string, string> = {
  'C4 Context': '#6B46C1',
  'C4 Container': '#8B5CF6',
  'Sequence': '#3B82F6',
  'Flowchart': '#10B981',
  'Entity Relationship': '#EC4899',
  'State': '#F59E0B',
  'Deployment': '#06B6D4',
  'Component': '#F97316',
  'Class': '#EF4444',
};

function getIcon(type: string): React.ReactNode {
  for (const [key, icon] of Object.entries(TYPE_ICONS)) {
    if (type.toLowerCase().includes(key.toLowerCase())) return icon;
  }
  return <HubIcon />;
}

function getColor(type: string): string {
  for (const [key, color] of Object.entries(TYPE_COLORS)) {
    if (type.toLowerCase().includes(key.toLowerCase())) return color;
  }
  return '#6B46C1';
}

function getPreviewPath(category: string, type: string): string {
  const base = '/docs/diagrams';
  const cat = category.toLowerCase().replace(/\s+/g, '-');
  const t = type.toLowerCase().replace(/\s+/g, '-');
  return `${base}/${cat}-${t}.svg`;
}

export default function DiagramCard({ diagram }: DiagramCardProps) {
  const navigate = useNavigate();
  const typeColor = useMemo(() => getColor(diagram.type), [diagram.type]);
  const icon = useMemo(() => getIcon(diagram.type), [diagram.type]);

  return (
    <motion.div
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
      whileTap={{ scale: 0.98 }}
      style={{ height: '100%' }}
    >
      <Card
        sx={{
          height: '100%',
          '&:hover': { boxShadow: `0 8px 24px ${typeColor}20` },
        }}
      >
        <CardActionArea onClick={() => navigate(`/diagrams/${diagram.id}`)} sx={{ height: '100%', alignItems: 'flex-start' }}>
          <CardContent sx={{ p: 2.5, display: 'flex', flexDirection: 'column', height: '100%' }}>
            <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5, mb: 1 }}>
              <Box
                sx={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  width: 40, height: 40, borderRadius: 1.5,
                  bgcolor: alpha(typeColor, 0.1),
                  color: typeColor,
                  flexShrink: 0,
                  mt: 0.25,
                }}
              >
                {icon}
              </Box>
              <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.5 }}>
                  {diagram.title}
                </Typography>
                <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                  <Chip
                    label={diagram.type}
                    size="small"
                    sx={{
                      height: 20, fontSize: '0.6rem',
                      bgcolor: alpha(typeColor, 0.12),
                      color: typeColor,
                      fontWeight: 600,
                    }}
                  />
                  <Chip
                    label={diagram.category}
                    size="small"
                    variant="outlined"
                    sx={{
                      height: 20, fontSize: '0.6rem',
                      borderColor: 'divider',
                      fontWeight: 500,
                    }}
                  />
                </Box>
              </Box>
            </Box>

            <Typography
              variant="body2"
              sx={{
                color: 'text.secondary',
                mb: 1.5,
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
                lineHeight: 1.5,
                flexGrow: 1,
              }}
            >
              {diagram.description}
            </Typography>

            <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', mt: 'auto' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <PeopleIcon sx={{ fontSize: 14, color: 'text.disabled' }} />
                <Typography variant="caption" sx={{ color: 'text.disabled', fontWeight: 600 }}>
                  {diagram.participants.length}
                </Typography>
                <Typography variant="caption" sx={{ color: 'text.disabled' }}>
                  participants
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <WidgetsIcon sx={{ fontSize: 14, color: 'text.disabled' }} />
                <Typography variant="caption" sx={{ color: 'text.disabled', fontWeight: 600 }}>
                  {diagram.modules.length}
                </Typography>
                <Typography variant="caption" sx={{ color: 'text.disabled' }}>
                  modules
                </Typography>
              </Box>
            </Box>
          </CardContent>
        </CardActionArea>
      </Card>
    </motion.div>
  );
}
