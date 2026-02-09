import type { TypographyVariantsOptions } from '@mui/material/styles';

export const typography: TypographyVariantsOptions = {
  fontFamily: [
    '"Noto Sans JP"',
    '"Hiragino Sans"',
    '"Hiragino Kaku Gothic ProN"',
    'Meiryo',
    'system-ui',
    '-apple-system',
    'BlinkMacSystemFont',
    '"Segoe UI"',
    'Roboto',
    'Arial',
    'sans-serif',
  ].join(','),
  h1: {
    fontSize: '2.5rem',
    fontWeight: 700,
    lineHeight: 1.3,
  },
  h2: {
    fontSize: '2rem',
    fontWeight: 700,
    lineHeight: 1.35,
  },
  h3: {
    fontSize: '1.5rem',
    fontWeight: 600,
    lineHeight: 1.4,
  },
  h4: {
    fontSize: '1.25rem',
    fontWeight: 600,
    lineHeight: 1.45,
  },
  h5: {
    fontSize: '1.125rem',
    fontWeight: 600,
    lineHeight: 1.5,
  },
  h6: {
    fontSize: '1rem',
    fontWeight: 600,
    lineHeight: 1.5,
  },
  subtitle1: {
    fontSize: '1rem',
    fontWeight: 500,
    lineHeight: 1.5,
  },
  subtitle2: {
    fontSize: '0.875rem',
    fontWeight: 500,
    lineHeight: 1.5,
  },
  body1: {
    fontSize: '1rem',
    fontWeight: 400,
    lineHeight: 1.7,
  },
  body2: {
    fontSize: '0.875rem',
    fontWeight: 400,
    lineHeight: 1.7,
  },
  button: {
    fontSize: '0.875rem',
    fontWeight: 600,
    textTransform: 'none',
  },
  caption: {
    fontSize: '0.75rem',
    fontWeight: 400,
    lineHeight: 1.5,
  },
  overline: {
    fontSize: '0.75rem',
    fontWeight: 600,
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
  },
};
