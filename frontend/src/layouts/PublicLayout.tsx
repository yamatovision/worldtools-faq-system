import type { ReactNode } from 'react';
import { Box, Container, Paper, Typography } from '@mui/material';
import { WT_COLORS } from '@/theme';

interface PublicLayoutProps {
  children: ReactNode;
  maxWidth?: 'xs' | 'sm' | 'md';
  title?: string;
}

export function PublicLayout({ children, maxWidth = 'sm', title }: PublicLayoutProps) {
  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: `linear-gradient(135deg, ${WT_COLORS.background.default} 0%, #e3f2fd 100%)`,
        py: 4,
      }}
    >
      <Container maxWidth={maxWidth}>
        {/* ロゴ */}
        <Box sx={{ textAlign: 'center', mb: 4 }}>
          <Typography
            variant="h4"
            sx={{
              fontWeight: 700,
              color: WT_COLORS.primary,
              letterSpacing: '0.1em',
            }}
          >
            WorldTools
          </Typography>
          <Typography
            variant="subtitle2"
            sx={{
              color: WT_COLORS.text.secondary,
              mt: 0.5,
            }}
          >
            社内AI FAQシステム
          </Typography>
        </Box>

        {/* メインコンテンツ */}
        <Paper
          elevation={0}
          sx={{
            p: 4,
            borderRadius: 3,
            boxShadow: '0 8px 32px rgba(0,0,0,0.08)',
          }}
        >
          {title && (
            <Typography
              variant="h5"
              component="h1"
              sx={{
                textAlign: 'center',
                mb: 3,
                fontWeight: 600,
                color: WT_COLORS.text.primary,
              }}
            >
              {title}
            </Typography>
          )}
          {children}
        </Paper>
      </Container>
    </Box>
  );
}
