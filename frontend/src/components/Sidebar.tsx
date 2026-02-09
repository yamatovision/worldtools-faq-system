import { useLocation, useNavigate } from 'react-router-dom';
import {
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Divider,
  Box,
  Typography,
} from '@mui/material';
import ChatIcon from '@mui/icons-material/Chat';
import HistoryIcon from '@mui/icons-material/History';
import DescriptionIcon from '@mui/icons-material/Description';
import VerifiedIcon from '@mui/icons-material/Verified';
import GroupsIcon from '@mui/icons-material/Groups';
import PersonIcon from '@mui/icons-material/Person';
import SettingsIcon from '@mui/icons-material/Settings';
import StorageIcon from '@mui/icons-material/Storage';
import SourceIcon from '@mui/icons-material/Source';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import InsightsIcon from '@mui/icons-material/Insights';
import BusinessIcon from '@mui/icons-material/Business';
import DashboardIcon from '@mui/icons-material/Dashboard';
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh';
import { useIsAdmin } from '@/hooks/useAuth';
import { WT_COLORS } from '@/theme';

const DRAWER_WIDTH = 240;

interface NavItem {
  label: string;
  path: string;
  icon: React.ReactNode;
}

interface MenuCategory {
  label: string;
  icon: React.ReactNode;
  items: NavItem[];
}

const appCategory: MenuCategory = {
  label: 'アプリケーション',
  icon: <SmartToyIcon fontSize="small" />,
  items: [
    { label: 'AIに質問', path: '/', icon: <ChatIcon /> },
    { label: '質問履歴', path: '/history', icon: <HistoryIcon /> },
  ],
};

const adminCategories: MenuCategory[] = [
  {
    label: 'データ基盤',
    icon: <StorageIcon fontSize="small" />,
    items: [
      { label: 'ダッシュボード', path: '/admin/dashboard', icon: <DashboardIcon /> },
    ],
  },
  {
    label: 'ナレッジ構築',
    icon: <SourceIcon fontSize="small" />,
    items: [
      { label: 'ドキュメント管理', path: '/admin/documents', icon: <DescriptionIcon /> },
    ],
  },
  {
    label: '分析',
    icon: <InsightsIcon fontSize="small" />,
    items: [
      { label: '回答品質', path: '/admin/quality', icon: <VerifiedIcon /> },
      { label: 'ドキュメント提案', path: '/admin/doc-assistant', icon: <AutoFixHighIcon /> },
    ],
  },
  {
    label: '組織管理',
    icon: <BusinessIcon fontSize="small" />,
    items: [
      { label: '部門管理', path: '/admin/departments', icon: <GroupsIcon /> },
      { label: 'ユーザー管理', path: '/admin/users', icon: <PersonIcon /> },
      { label: 'システム設定', path: '/admin/settings', icon: <SettingsIcon /> },
    ],
  },
];

interface SidebarProps {
  open: boolean;
  onClose: () => void;
  variant?: 'temporary' | 'permanent';
}

export function Sidebar({ open, onClose, variant = 'permanent' }: SidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const isAdmin = useIsAdmin();

  const handleNavigation = (path: string) => {
    navigate(path);
    if (variant === 'temporary') {
      onClose();
    }
  };

  const isSelected = (path: string) => {
    if (path === '/') {
      return location.pathname === '/';
    }
    return location.pathname.startsWith(path);
  };

  const renderCategory = (category: MenuCategory) => (
    <Box key={category.label}>
      <Divider sx={{ my: 1.5 }} />
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, px: 2, mb: 0.5 }}>
        <Box sx={{ color: WT_COLORS.text.secondary, display: 'flex' }}>{category.icon}</Box>
        <Typography
          variant="overline"
          sx={{ color: WT_COLORS.text.secondary, fontSize: '0.68rem', lineHeight: 1.5 }}
        >
          {category.label}
        </Typography>
      </Box>
      <List disablePadding>
        {category.items.map((item) => (
          <ListItem key={item.path} disablePadding>
            <ListItemButton
              selected={isSelected(item.path)}
              onClick={() => handleNavigation(item.path)}
              sx={{ py: 0.75 }}
            >
              <ListItemIcon sx={{ minWidth: 40 }}>{item.icon}</ListItemIcon>
              <ListItemText primary={item.label} primaryTypographyProps={{ fontSize: '0.875rem' }} />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
    </Box>
  );

  const drawerContent = (
    <>
      <Toolbar />
      <Box sx={{ overflow: 'auto', px: 1, py: 1 }}>
        {/* 管理者: データ基盤を最初に表示 */}
        {isAdmin && adminCategories.slice(0, 2).map(renderCategory)}

        {/* アプリケーション（全ユーザー共通） */}
        {renderCategory(appCategory)}

        {/* 管理者: 分析 + 組織管理 */}
        {isAdmin && adminCategories.slice(2).map(renderCategory)}
      </Box>
    </>
  );

  if (variant === 'temporary') {
    return (
      <Drawer
        variant="temporary"
        open={open}
        onClose={onClose}
        ModalProps={{ keepMounted: true }}
        sx={{
          display: { xs: 'block', md: 'none' },
          '& .MuiDrawer-paper': {
            boxSizing: 'border-box',
            width: DRAWER_WIDTH,
          },
        }}
      >
        {drawerContent}
      </Drawer>
    );
  }

  return (
    <Drawer
      variant="permanent"
      sx={{
        display: { xs: 'none', md: 'block' },
        width: DRAWER_WIDTH,
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          boxSizing: 'border-box',
          width: DRAWER_WIDTH,
        },
      }}
      open
    >
      {drawerContent}
    </Drawer>
  );
}
