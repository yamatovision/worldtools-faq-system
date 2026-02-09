import type { ReactNode } from 'react';
import { useState } from 'react';
import { Box, Toolbar } from '@mui/material';
import { Header } from '@/components/Header';
import { Sidebar } from '@/components/Sidebar';

const DRAWER_WIDTH = 240;

interface MainLayoutProps {
  children: ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <Header onMenuClick={handleDrawerToggle} />

      {/* モバイル用サイドバー */}
      <Sidebar variant="temporary" open={mobileOpen} onClose={handleDrawerToggle} />

      {/* デスクトップ用サイドバー */}
      <Sidebar variant="permanent" open={true} onClose={() => {}} />

      {/* メインコンテンツ */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          width: { md: `calc(100% - ${DRAWER_WIDTH}px)` },
          minHeight: '100vh',
          backgroundColor: 'background.default',
        }}
      >
        <Toolbar />
        {children}
      </Box>
    </Box>
  );
}
