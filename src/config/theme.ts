import { createTheme } from '@mui/material/styles';
import { COLORS } from './constants';

/**
 * MUI 主题配置 — 暗色科技风（深海军蓝底 + 霓虹青光晕 + 玻璃拟态卡片）
 * 主色：科技蓝 #2563EB；霓虹青 #06B6D4；暗底高对比文本；发光边框；柔和深色阴影。
 * palette.mode='dark'；背景/文本/分隔线用暗色值；统一圆角与等宽数字字体。
 */
const theme = createTheme({
  palette: {
    mode: 'dark',
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
    fontFamily: '"Inter", system-ui, -apple-system, "PingFang SC", "Microsoft YaHei", sans-serif',
    h4: { fontWeight: 700 },
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
    borderRadius: 14,
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
          // 发光主按钮
          boxShadow: '0 0 20px rgba(37,99,235,0.4)',
          transition: 'box-shadow 0.25s ease, transform 0.2s ease',
          '&:hover': {
            boxShadow: '0 0 28px rgba(37,99,235,0.65)',
            transform: 'translateY(-1px)',
          },
        },
        contained: {
          boxShadow: 'none',
        },
        outlinedPrimary: {
          borderColor: 'rgba(37,99,235,0.5)',
          '&:hover': {
            borderColor: COLORS.PRIMARY,
            boxShadow: '0 0 16px rgba(37,99,235,0.3)',
            background: 'rgba(37,99,235,0.08)',
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          // 真玻璃拟态：半透明面 + 背景模糊 + 顶部高光 + 霓虹细边
          background: 'rgba(30,41,59,0.55)',
          backdropFilter: 'blur(14px)',
          WebkitBackdropFilter: 'blur(14px)',
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.08), 0 8px 30px rgba(0,0,0,0.45)',
          border: '1px solid rgba(148,163,184,0.14)',
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        rounded: {
          borderRadius: 16,
        },
        root: {
          // 关闭 MUI 暗色 Paper 默认渐变，露出干净的玻璃面底色
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
          // 暗色边框 + focus 发光
          '& fieldset': {
            borderColor: 'rgba(148,163,184,0.25)',
          },
          '&:hover fieldset': {
            borderColor: 'rgba(37,99,235,0.5)',
          },
          '&.Mui-focused fieldset': {
            borderColor: COLORS.PRIMARY,
            boxShadow: '0 0 0 3px rgba(37,99,235,0.18)',
          },
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          borderRadius: 20,
          background: 'rgba(30,41,59,0.94)',
          backgroundImage: 'none',
          border: '1px solid rgba(37,99,235,0.25)',
          boxShadow: '0 0 40px rgba(37,99,235,0.18), 0 24px 60px rgba(0,0,0,0.6)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
        },
      },
    },
    MuiBottomNavigation: {
      styleOverrides: {
        root: {
          height: 60,
          borderTop: '1px solid rgba(37,99,235,0.18)',
          backgroundColor: 'rgba(17,24,39,0.9)',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
          boxShadow: '0 -2px 18px rgba(0,0,0,0.45), 0 0 16px rgba(37,99,235,0.12)',
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
  },
});

export default theme;
