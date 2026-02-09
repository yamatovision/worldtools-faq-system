import type { ThemeOptions } from '@mui/material/styles';
import { createTheme } from '@mui/material/styles';
import { palette } from './palette';
import { typography } from './typography';
import { components } from './components';

const themeOptions: ThemeOptions = {
  palette,
  typography,
  components,
  shape: {
    borderRadius: 8,
  },
  spacing: 8,
};

export const theme = createTheme(themeOptions);

export { WT_COLORS } from './palette';
