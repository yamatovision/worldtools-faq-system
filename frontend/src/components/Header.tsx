import { useState } from 'react';
import {
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Avatar,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Box,
  Divider,
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import PersonIcon from '@mui/icons-material/Person';
import LogoutIcon from '@mui/icons-material/Logout';
import { useAuth, useUser } from '@/hooks/useAuth';
import { WT_COLORS } from '@/theme';

interface HeaderProps {
  onMenuClick?: () => void;
  showMenuButton?: boolean;
}

export function Header({ onMenuClick, showMenuButton = true }: HeaderProps) {
  const user = useUser();
  const { logout } = useAuth();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = async () => {
    handleMenuClose();
    await logout();
  };

  const getInitials = (name: string) => {
    const parts = name.split(' ');
    return parts.length >= 2 ? parts[0][0] + parts[1][0] : name.slice(0, 2);
  };

  return (
    <AppBar
      position="fixed"
      sx={{
        zIndex: (theme) => theme.zIndex.drawer + 1,
        backgroundColor: '#ffffff',
        borderBottom: `1px solid ${WT_COLORS.border}`,
      }}
    >
      <Toolbar>
        {showMenuButton && (
          <IconButton
            edge="start"
            color="inherit"
            aria-label="メニューを開く"
            onClick={onMenuClick}
            sx={{ mr: 2, display: { md: 'none' } }}
          >
            <MenuIcon sx={{ color: WT_COLORS.text.primary }} />
          </IconButton>
        )}

        {/* ロゴ */}
        <Typography
          variant="h6"
          noWrap
          component="div"
          sx={{
            fontWeight: 700,
            color: WT_COLORS.primary,
            letterSpacing: '0.05em',
          }}
        >
          WorldTools
        </Typography>
        <Typography
          variant="caption"
          sx={{
            ml: 1,
            color: WT_COLORS.text.secondary,
            display: { xs: 'none', sm: 'block' },
          }}
        >
          AI FAQ
        </Typography>

        <Box sx={{ flexGrow: 1 }} />

        {/* ユーザーメニュー */}
        {user && (
          <>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <Box sx={{ mr: 2, display: { xs: 'none', sm: 'block' } }}>
                <Typography variant="body2" sx={{ color: WT_COLORS.text.primary }}>
                  {user.name}
                </Typography>
                <Typography variant="caption" sx={{ color: WT_COLORS.text.secondary }}>
                  {user.departmentName}
                </Typography>
              </Box>
              <IconButton onClick={handleMenuOpen} sx={{ p: 0 }}>
                <Avatar
                  sx={{
                    bgcolor: WT_COLORS.primary,
                    width: 36,
                    height: 36,
                    fontSize: '0.875rem',
                  }}
                >
                  {getInitials(user.name)}
                </Avatar>
              </IconButton>
            </Box>

            <Menu
              anchorEl={anchorEl}
              open={Boolean(anchorEl)}
              onClose={handleMenuClose}
              anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
              transformOrigin={{ vertical: 'top', horizontal: 'right' }}
              slotProps={{
                paper: {
                  sx: { mt: 1, minWidth: 200 },
                },
              }}
            >
              <Box sx={{ px: 2, py: 1 }}>
                <Typography variant="subtitle2">{user.name}</Typography>
                <Typography variant="caption" color="text.secondary">
                  {user.email}
                </Typography>
              </Box>
              <Divider />
              <MenuItem onClick={handleMenuClose}>
                <ListItemIcon>
                  <PersonIcon fontSize="small" />
                </ListItemIcon>
                <ListItemText>プロフィール</ListItemText>
              </MenuItem>
              <MenuItem onClick={handleLogout}>
                <ListItemIcon>
                  <LogoutIcon fontSize="small" />
                </ListItemIcon>
                <ListItemText>ログアウト</ListItemText>
              </MenuItem>
            </Menu>
          </>
        )}
      </Toolbar>
    </AppBar>
  );
}
