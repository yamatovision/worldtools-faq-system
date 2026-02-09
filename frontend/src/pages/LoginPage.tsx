import type { FormEvent } from 'react';
import { useState } from 'react';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import {
  Box,
  TextField,
  Button,
  Alert,
  Typography,
  Paper,
  Link,
} from '@mui/material';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import { PublicLayout } from '@/layouts/PublicLayout';
import { useAuth } from '@/hooks/useAuth';
import { WT_COLORS } from '@/theme';

export function LoginPage() {
  const navigate = useNavigate();
  const { login, isLoading, error } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    try {
      await login(email, password);
      navigate('/');
    } catch {
      // エラーはAuthContextで処理
    }
  };

  return (
    <PublicLayout title="ログイン">
      <form onSubmit={handleSubmit}>
        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        <TextField
          fullWidth
          label="メールアドレス"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoComplete="email"
          autoFocus
          sx={{ mb: 2 }}
        />

        <TextField
          fullWidth
          label="パスワード"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          autoComplete="current-password"
          sx={{ mb: 3 }}
        />

        <Button
          type="submit"
          fullWidth
          variant="contained"
          size="large"
          disabled={isLoading}
          startIcon={<LockOutlinedIcon />}
          sx={{ mb: 3 }}
        >
          {isLoading ? 'ログイン中...' : 'ログイン'}
        </Button>

        <Box sx={{ textAlign: 'center', mb: 3 }}>
          <Typography variant="body2" color="text.secondary">
            アカウントをお持ちでない方は{' '}
            <Link component={RouterLink} to="/signup" underline="hover">
              無料トライアル登録
            </Link>
          </Typography>
        </Box>

        {/* デモアカウント情報 */}
        <Paper
          sx={{
            p: 2,
            backgroundColor: `${WT_COLORS.primary}08`,
            border: `1px solid ${WT_COLORS.primary}20`,
          }}
        >
          <Typography variant="subtitle2" sx={{ mb: 1, color: WT_COLORS.primary }}>
            デモアカウント
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
            <Typography variant="caption" color="text.secondary">
              管理者: admin@worldtools.co.jp / worldtools2026
            </Typography>
          </Box>
        </Paper>
      </form>
    </PublicLayout>
  );
}
