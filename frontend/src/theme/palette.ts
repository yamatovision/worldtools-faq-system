import type { PaletteOptions } from '@mui/material/styles';

// ワールドツールブランドカラー
export const WT_COLORS = {
  primary: '#c41e3a',      // メインレッド
  primaryLight: '#e04858', // ライトレッド
  primaryDark: '#9a1830',  // ダークレッド
  secondary: '#1a1a2e',    // ダークネイビー（アクセント）
  secondaryLight: '#3d3d5c',
  secondaryDark: '#0d0d17',
  cyan: '#c41e3a',         // 統一レッド
  cyanLight: '#e04858',
  text: {
    primary: '#3c3c3c',    // メインテキスト
    secondary: '#545454',  // サブテキスト
    disabled: '#9e9e9e',
  },
  background: {
    default: '#f5f7fa',
    paper: '#ffffff',
  },
  border: '#e5e5e5',
  success: '#4db316',
  warning: '#f5a623',
  error: '#d32f2f',
  info: '#c41e3a',
} as const;

export const palette: PaletteOptions = {
  mode: 'light',
  primary: {
    main: WT_COLORS.primary,
    light: WT_COLORS.primaryLight,
    dark: WT_COLORS.primaryDark,
    contrastText: '#ffffff',
  },
  secondary: {
    main: WT_COLORS.secondary,
    light: WT_COLORS.secondaryLight,
    dark: WT_COLORS.secondaryDark,
    contrastText: '#ffffff',
  },
  text: {
    primary: WT_COLORS.text.primary,
    secondary: WT_COLORS.text.secondary,
    disabled: WT_COLORS.text.disabled,
  },
  background: {
    default: WT_COLORS.background.default,
    paper: WT_COLORS.background.paper,
  },
  success: {
    main: WT_COLORS.success,
    contrastText: '#ffffff',
  },
  warning: {
    main: WT_COLORS.warning,
    contrastText: '#ffffff',
  },
  error: {
    main: WT_COLORS.error,
    contrastText: '#ffffff',
  },
  info: {
    main: WT_COLORS.info,
    contrastText: '#ffffff',
  },
  divider: WT_COLORS.border,
};
