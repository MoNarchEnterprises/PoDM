import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Card, CardContent, CardActionArea, Typography, Box, Chip,
  Collapse, IconButton, Paper,
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Assignment as AssignmentIcon,
  People as PeopleIcon,
  AltRoute as AltRouteIcon,
} from '@mui/icons-material';
import { alpha } from '@mui/material/styles';
import { motion } from 'framer-motion';
import type { Workflow } from '../../types';

interface WorkflowCardProps {
  workflow: Workflow;
}

const CATEGORY_COLORS: Record<string, string> = {
  auth: '#6B46C1',
  payment: '#EC4899',
  content: '#3B82F6',
  notification: '#10B981',
  admin: '#F59E0B',
  user: '#8B5CF6',
  core: '#EF4444',
  processing: '#06B6D4',
  integration: '#F97316',
};

function getCategoryColor(category: string): string {
  for (const [key, color] of Object.entries(CATEGORY_COLORS)) {
    if (category.toLowerCase().includes(key)) return color;
  }
  return '#6B46C1';
}

export default function WorkflowCard({ workflow }: WorkflowCardProps) {
  const navigate = useNavigate();
  const [expanded, setExpanded] = useState(false);
  const categoryColor = getCategoryColor(workflow.category);

  const handleClick = () => {
    navigate(`/workflows/${workflow.id}`);
  };

  return (
    <motion.div
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
      whileTap={{ scale: 0.98 }}
      style={{ height: '100%' }}
    >
      <Card
        sx={{
          height: '100%',
          '&:hover': { boxShadow: `0 8px 24px ${categoryColor}20` },
        }}
      >
        <CardActionArea onClick={handleClick} sx={{ alignItems: 'flex-start' }}>
          <CardContent sx={{ p: 2.5, pb: 1.5 }}>
            <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1, mb: 1 }}>
              <Box
                sx={{
                  mt: 0.25, color: categoryColor, display: 'flex',
                  flexShrink: 0,
                }}
              >
                <AssignmentIcon />
              </Box>
              <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                  <Typography variant="h6" sx={{ fontWeight: 700, fontSize: '1rem', flexGrow: 1 }}>
                    {workflow.name}
                  </Typography>
                  <Chip
                    label={workflow.category}
                    size="small"
                    sx={{
                      height: 22, fontSize: '0.65rem',
                      bgcolor: alpha(categoryColor, 0.12),
                      color: categoryColor,
                      fontWeight: 600,
                    }}
                  />
                </Box>
                <Box sx={{ display: 'flex', gap: 1.5, mb: 0.75, flexWrap: 'wrap' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <PeopleIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
                    <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary' }}>
                      {workflow.actors.length} actors
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <AltRouteIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
                    <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary' }}>
                      {workflow.mainFlow.length} steps
                    </Typography>
                  </Box>
                </Box>
                <Typography
                  variant="body2"
                  sx={{
                    color: 'text.secondary',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                    lineHeight: 1.5,
                  }}
                >
                  {workflow.description}
                </Typography>
              </Box>
            </Box>
          </CardContent>
        </CardActionArea>

        {workflow.mainFlow.length > 0 && (
          <>
            <Box
              sx={{
                px: 2.5, pb: 1,
                display: 'flex',
                justifyContent: 'flex-end',
              }}
            >
              <IconButton
                size="small"
                onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }}
                sx={{ color: 'text.secondary' }}
              >
                {expanded ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
              </IconButton>
            </Box>
            <Collapse in={expanded} timeout="auto" unmountOnExit>
              <Box sx={{ px: 2.5, pb: 2 }}>
                <Typography variant="caption" sx={{ fontWeight: 700, display: 'block', mb: 1, color: 'text.secondary' }}>
                  Main Flow
                </Typography>
                <Paper variant="outlined" sx={{ p: 1.5, bgcolor: 'background.default' }}>
                  {workflow.mainFlow.map((step, i) => (
                    <Box key={i} sx={{ display: 'flex', gap: 1, py: 0.25 }}>
                      <Typography
                        variant="caption"
                        sx={{
                          fontWeight: 700, color: categoryColor, minWidth: 24,
                          fontFamily: '"JetBrains Mono", monospace',
                        }}
                      >
                        {i + 1}.
                      </Typography>
                      <Typography variant="caption" sx={{ color: 'text.secondary', lineHeight: 1.5 }}>
                        {step}
                      </Typography>
                    </Box>
                  ))}
                </Paper>
              </Box>
            </Collapse>
          </>
        )}
      </Card>
    </motion.div>
  );
}
