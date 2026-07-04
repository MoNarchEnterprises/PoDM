import { createTheme, type ThemeOptions } from '@mui/material/styles';

const brandPurple = '#6B46C1';
const brandPink = '#EC4899';
const brandPurpleDark = '#553C9A';

export const getTheme = (mode: 'dark' | 'light') => createTheme({
  palette: {
    mode,
    primary: {
      main: brandPurple,
      dark: brandPurpleDark,
      light: '#9F7AEA',
      contrastText: '#FFFFFF',
    },
    secondary: {
      main: brandPink,
      light: '#F472B6',
      dark: '#DB2777',
      contrastText: '#FFFFFF',
    },
    ...(mode === 'dark'
      ? {
          background: {
            default: '#0F0F1A',
            paper: '#1A1A2E',
          },
          text: {
            primary: '#E2E8F0',
            secondary: '#94A3B8',
          },
          divider: 'rgba(107, 70, 193, 0.2)',
        }
      : {
          background: {
            default: '#F8F7FC',
            paper: '#FFFFFF',
          },
          text: {
            primary: '#1A202C',
            secondary: '#4A5568',
          },
          divider: 'rgba(107, 70, 193, 0.15)',
        }),
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    h1: { fontWeight: 800, fontSize: '2.25rem' },
    h2: { fontWeight: 700, fontSize: '1.875rem' },
    h3: { fontWeight: 700, fontSize: '1.5rem' },
    h4: { fontWeight: 600, fontSize: '1.25rem' },
    h5: { fontWeight: 600, fontSize: '1.1rem' },
    h6: { fontWeight: 600, fontSize: '1rem' },
    body1: { fontSize: '0.9375rem' },
    body2: { fontSize: '0.875rem' },
    caption: { fontSize: '0.75rem', fontWeight: 500 },
  },
  shape: {
    borderRadius: 10,
  },
  components: {
    MuiCard: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          borderRadius: 12,
          border: `1px solid ${mode === 'dark' ? 'rgba(107, 70, 193, 0.15)' : 'rgba(107, 70, 193, 0.1)'}`,
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          borderRight: `1px solid ${mode === 'dark' ? 'rgba(107, 70, 193, 0.15)' : 'rgba(107, 70, 193, 0.1)'}`,
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          backdropFilter: 'blur(12px)',
          backgroundColor: mode === 'dark'
            ? 'rgba(15, 15, 26, 0.85)'
            : 'rgba(248, 247, 252, 0.85)',
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 600,
          borderRadius: 8,
        },
        contained: {
          boxShadow: 'none',
          '&:hover': {
            boxShadow: `0 4px 14px ${brandPurple}40`,
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          fontWeight: 500,
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: {
          borderBottom: `1px solid ${mode === 'dark' ? 'rgba(107, 70, 193, 0.1)' : 'rgba(107, 70, 193, 0.08)'}`,
        },
      },
    },
  },
});
