import { createTheme } from '@mui/material/styles';
import { COLORS } from './constants';

/**
 * MUI主题配置
 * 主色蓝色，成功绿色，错误红色
 */
const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: COLORS.PRIMARY,
      light: COLORS.PRIMARY_LIGHT,
      dark: COLORS.PRIMARY_DARK,
      contrastText: '#FFFFFF',
    },
    secondary: {
      main: COLORS.INVEST,
      light: '#FFB74D',
      dark: '#F57C00',
      contrastText: '#FFFFFF',
    },
    success: {
      main: COLORS.INCOME,
      light: '#81C784',
      dark: '#388E3C',
      contrastText: '#FFFFFF',
    },
    error: {
      main: COLORS.EXPENSE,
      light: '#E57373',
      dark: '#D32F2F',
      contrastText: '#FFFFFF',
    },
    background: {
      default: COLORS.BACKGROUND,
      paper: COLORS.SURFACE,
    },
    text: {
      primary: COLORS.TEXT_PRIMARY,
      secondary: COLORS.TEXT_SECONDARY,
    },
    divider: COLORS.DIVIDER,
  },
  typography: {
    fontFamily: '"Inter", "system-ui", "-apple-system", sans-serif',
    h4: {
      fontWeight: 700,
    },
    h5: {
      fontWeight: 600,
    },
    h6: {
      fontWeight: 600,
    },
    subtitle1: {
      fontWeight: 500,
    },
    button: {
      textTransform: 'none',
      fontWeight: 500,
    },
  },
  shape: {
    borderRadius: 12,
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          padding: '8px 20px',
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        rounded: {
          borderRadius: 16,
        },
      },
    },
    MuiTextField: {
      defaultProps: {
        variant: 'outlined',
        fullWidth: true,
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          borderRadius: 16,
        },
      },
    },
    MuiBottomNavigation: {
      styleOverrides: {
        root: {
          height: 56,
          borderTop: '1px solid #E0E0E0',
        },
      },
    },
  },
});

export default theme;
