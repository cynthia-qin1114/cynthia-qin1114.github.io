import { createTheme } from '@mui/material/styles';
import { COLORS, SERIF_FONT } from './constants';

/**
 * MUI 主题配置 — 暖光纸感·私人银行风（暖纸底 + 深墨字 + 哑光黄铜金）
 * 抛弃深色霓虹/玻璃拟态：改用 warm paper 背景、墨色高对比文本、黄铜金强调、
 * 细发丝边 + 克制柔和阴影、衬线展示数字（私人银行签名感）。
 */
const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: COLORS.PRIMARY,
      light: COLORS.PRIMARY_LIGHT,
      dark: COLORS.PRIMARY_DARK,
      contrastText: '#FBF8F1',
    },
    secondary: {
      main: COLORS.INVEST,
      light: '#C0904A',
      dark: '#7E561F',
      contrastText: '#FBF8F1',
    },
    success: {
      main: COLORS.INCOME,
      light: '#5B9B75',
      dark: '#1F5B3A',
      contrastText: '#FBF8F1',
    },
    error: {
      main: COLORS.EXPENSE,
      light: '#C9695C',
      dark: '#8C2A20',
      contrastText: '#FBF8F1',
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
    fontFamily:
      '"Inter", system-ui, -apple-system, "PingFang SC", "Microsoft YaHei", sans-serif',
    h4: { fontWeight: 600, fontFamily: SERIF_FONT, letterSpacing: '-0.01em' },
    h5: { fontWeight: 600 },
    h6: { fontWeight: 600 },
    subtitle1: { fontWeight: 600 },
    subtitle2: { fontWeight: 600, letterSpacing: 0.1 },
    body1: { fontWeight: 400 },
    body2: { fontWeight: 400 },
    caption: { fontWeight: 500 },
    button: {
      textTransform: 'none',
      fontWeight: 600,
    },
  },
  shape: {
    borderRadius: 12,
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 10,
          padding: '9px 20px',
          boxShadow: 'none',
        },
        containedPrimary: {
          // 哑光黄铜主按钮：克制阴影 + hover 微下沉，无霓虹发光
          background: `linear-gradient(180deg, ${COLORS.BRASS} 0%, ${COLORS.PRIMARY} 100%)`,
          color: '#FBF8F1',
          boxShadow: '0 2px 8px rgba(156,107,46,0.28)',
          transition: 'box-shadow 0.2s ease, transform 0.15s ease, filter 0.2s ease',
          '&:hover': {
            boxShadow: '0 4px 14px rgba(156,107,46,0.36)',
            filter: 'brightness(1.04)',
            transform: 'translateY(-1px)',
          },
          '&:active': {
            transform: 'translateY(0)',
          },
        },
        contained: {
          boxShadow: 'none',
        },
        outlinedPrimary: {
          borderColor: 'rgba(156,107,46,0.45)',
          color: COLORS.PRIMARY_DARK,
          '&:hover': {
            borderColor: COLORS.PRIMARY,
            background: 'rgba(156,107,46,0.08)',
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          // 暖纸卡片：暖白面 + 发丝边 + 柔和投影（无玻璃模糊、无霓虹）
          background: COLORS.SURFACE,
          backgroundImage: 'none',
          boxShadow: '0 1px 2px rgba(33,31,26,0.04), 0 8px 24px rgba(33,31,26,0.06)',
          border: '1px solid rgba(33,31,26,0.07)',
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        rounded: {
          borderRadius: 16,
        },
        root: {
          backgroundImage: 'none',
        },
      },
    },
    MuiTextField: {
      defaultProps: {
        variant: 'outlined',
        fullWidth: true,
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          // 暖灰边框 + focus 黄铜细环
          backgroundColor: '#FCFAF5',
          '& fieldset': {
            borderColor: 'rgba(33,31,26,0.16)',
          },
          '&:hover fieldset': {
            borderColor: 'rgba(156,107,46,0.5)',
          },
          '&.Mui-focused fieldset': {
            borderColor: COLORS.PRIMARY,
            boxShadow: '0 0 0 3px rgba(156,107,46,0.14)',
          },
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          borderRadius: 20,
          background: COLORS.SURFACE,
          backgroundImage: 'none',
          border: '1px solid rgba(156,107,46,0.22)',
          boxShadow: '0 24px 60px rgba(33,31,26,0.18)',
        },
      },
    },
    MuiBottomNavigation: {
      styleOverrides: {
        root: {
          height: 60,
          borderTop: '1px solid rgba(33,31,26,0.08)',
          backgroundColor: 'rgba(247,243,234,0.92)',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
          boxShadow: '0 -1px 0 rgba(33,31,26,0.04), 0 -6px 20px rgba(33,31,26,0.05)',
        },
      },
    },
    MuiTooltip: {
      styleOverrides: {
        tooltip: {
          borderRadius: 8,
          fontSize: 12,
          padding: '4px 8px',
        },
      },
    },
    MuiListItemButton: {
      styleOverrides: {
        root: {
          borderRadius: 10,
        },
      },
    },
  },
});

export default theme;
