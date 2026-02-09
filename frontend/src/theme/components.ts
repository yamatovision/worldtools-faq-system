import type { Components, Theme } from '@mui/material/styles';
import { WT_COLORS } from './palette';

export const components: Components<Omit<Theme, 'components'>> = {
  MuiCssBaseline: {
    styleOverrides: {
      body: {
        backgroundColor: WT_COLORS.background.default,
      },
    },
  },
  MuiButton: {
    styleOverrides: {
      root: {
        borderRadius: 8,
        padding: '8px 20px',
        fontWeight: 600,
        boxShadow: 'none',
        '&:hover': {
          boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
        },
      },
      contained: {
        '&:hover': {
          boxShadow: '0 4px 12px rgba(10,133,188,0.25)',
        },
      },
      outlined: {
        borderWidth: 2,
        '&:hover': {
          borderWidth: 2,
        },
      },
    },
    defaultProps: {
      disableElevation: true,
    },
  },
  MuiCard: {
    styleOverrides: {
      root: {
        borderRadius: 12,
        boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
        border: `1px solid ${WT_COLORS.border}`,
      },
    },
  },
  MuiPaper: {
    styleOverrides: {
      root: {
        backgroundImage: 'none',
      },
      rounded: {
        borderRadius: 12,
      },
      elevation1: {
        boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
      },
    },
  },
  MuiAppBar: {
    styleOverrides: {
      root: {
        backgroundColor: '#ffffff',
        color: WT_COLORS.text.primary,
        boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
      },
    },
    defaultProps: {
      elevation: 0,
    },
  },
  MuiDrawer: {
    styleOverrides: {
      paper: {
        borderRight: `1px solid ${WT_COLORS.border}`,
        backgroundColor: '#ffffff',
      },
    },
  },
  MuiTextField: {
    styleOverrides: {
      root: {
        '& .MuiOutlinedInput-root': {
          borderRadius: 8,
          '&:hover .MuiOutlinedInput-notchedOutline': {
            borderColor: WT_COLORS.primary,
          },
        },
      },
    },
    defaultProps: {
      variant: 'outlined',
      size: 'small',
    },
  },
  MuiChip: {
    styleOverrides: {
      root: {
        borderRadius: 6,
        fontWeight: 500,
      },
    },
  },
  MuiListItemButton: {
    styleOverrides: {
      root: {
        borderRadius: 8,
        marginBottom: 4,
        '&.Mui-selected': {
          backgroundColor: `${WT_COLORS.primary}14`,
          '&:hover': {
            backgroundColor: `${WT_COLORS.primary}1f`,
          },
          '& .MuiListItemIcon-root': {
            color: WT_COLORS.primary,
          },
          '& .MuiListItemText-primary': {
            color: WT_COLORS.primary,
            fontWeight: 600,
          },
        },
      },
    },
  },
  MuiTooltip: {
    styleOverrides: {
      tooltip: {
        backgroundColor: WT_COLORS.text.primary,
        fontSize: '0.75rem',
        borderRadius: 6,
      },
    },
  },
  MuiAlert: {
    styleOverrides: {
      root: {
        borderRadius: 8,
      },
      standardSuccess: {
        backgroundColor: '#e8f5e9',
        color: WT_COLORS.secondaryDark,
      },
      standardInfo: {
        backgroundColor: '#e3f2fd',
        color: WT_COLORS.primaryDark,
      },
    },
  },
  MuiAvatar: {
    styleOverrides: {
      root: {
        backgroundColor: WT_COLORS.primary,
      },
    },
  },
  MuiLinearProgress: {
    styleOverrides: {
      root: {
        borderRadius: 4,
        backgroundColor: `${WT_COLORS.primary}1f`,
      },
    },
  },
};
