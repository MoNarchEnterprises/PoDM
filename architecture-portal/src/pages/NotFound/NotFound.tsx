import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Box, Typography, Button,
} from '@mui/material';
import { Dashboard as DashboardIcon } from '@mui/icons-material';

export default function NotFound() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 'calc(100vh - 160px)',
      }}
    >
      <Box sx={{ textAlign: 'center' }}>
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.1, duration: 0.4 }}
        >
          <Typography
            variant="h1"
            sx={{
              fontSize: '8rem',
              fontWeight: 900,
              lineHeight: 1,
              mb: 1,
              background: 'linear-gradient(135deg, #6B46C1, #EC4899)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            404
          </Typography>
        </motion.div>

        <motion.div
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.3 }}
        >
          <Typography variant="h5" sx={{ fontWeight: 600, mb: 1 }}>
            Page not found
          </Typography>
          <Typography variant="body1" sx={{ color: 'text.secondary', mb: 4, maxWidth: 400, mx: 'auto' }}>
            The page you are looking for does not exist or has been moved.
          </Typography>
        </motion.div>

        <motion.div
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.3 }}
        >
          <Button
            component={Link}
            to="/"
            variant="contained"
            size="large"
            startIcon={<DashboardIcon />}
            sx={{ px: 4, py: 1.5 }}
          >
            Back to Dashboard
          </Button>
        </motion.div>
      </Box>
    </motion.div>
  );
}
