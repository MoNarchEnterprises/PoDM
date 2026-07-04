import { type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Card, CardContent, Typography, Box, CardActionArea,
} from '@mui/material';
import { motion } from 'framer-motion';

interface StatCardProps {
  icon: ReactNode;
  label: string;
  value: number;
  color?: string;
  href?: string;
  description?: string;
}

export default function StatCard({
  icon, label, value, color = '#6B46C1', href, description,
}: StatCardProps) {
  const navigate = useNavigate();

  const handleClick = () => {
    if (href) navigate(href);
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
          transition: 'box-shadow 0.2s ease, transform 0.2s ease',
          '&:hover': {
            boxShadow: `0 8px 24px ${color}20`,
          },
          cursor: href ? 'pointer' : 'default',
        }}
      >
        <CardActionArea
          onClick={handleClick}
          disabled={!href}
          sx={{ height: '100%', p: 0 }}
        >
          <CardContent sx={{ p: 2.5 }}>
            <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 48,
                  height: 48,
                  borderRadius: 2,
                  bgcolor: `${color}14`,
                  color: color,
                  flexShrink: 0,
                }}
              >
                {icon}
              </Box>
              <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                <Typography variant="h3" sx={{ fontWeight: 800, color, lineHeight: 1.1, mb: 0.25 }}>
                  {value.toLocaleString()}
                </Typography>
                <Typography variant="body2" sx={{ color: 'text.primary', fontWeight: 600 }}>
                  {label}
                </Typography>
                {description && (
                  <Typography
                    variant="caption"
                    sx={{ color: 'text.secondary', mt: 0.5, display: 'block', lineHeight: 1.4 }}
                  >
                    {description}
                  </Typography>
                )}
              </Box>
            </Box>
          </CardContent>
        </CardActionArea>
      </Card>
    </motion.div>
  );
}
