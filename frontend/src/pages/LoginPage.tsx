import type { FormEvent } from 'react';
import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams, Link as RouterLink } from 'react-router-dom';
import {
  Box,
  TextField,
  Button,
  Alert,
  Typography,
  Divider,
  Paper,
  Link,
  CircularProgress,
} from '@mui/material';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import { PublicLayout } from '@/layouts/PublicLayout';
import { useAuth } from '@/hooks/useAuth';
import { authService } from '@/services/api/auth';
import { WT_COLORS } from '@/theme';

export function LoginPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { login, isLoading, error } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [oktaLoading, setOktaLoading] = useState(false);
  const [oktaError, setOktaError] = useState('');

  // Oktaコールバック処理: ?code=xxx&state=yyy
  const callbackCalledRef = useRef(false);
  useEffect(() => {
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    if (!code || !state || callbackCalledRef.current) return;
    callbackCalledRef.current = true;

    setOktaLoading(true);
    setOktaError('');
    authService.oktaCallback(code, state)
      .then(() => { window.location.href = '/'; })
      .catch((err: Error) => {
        setOktaError(err.message || 'Okta認証に失敗しました');
        setOktaLoading(false);
        callbackCalledRef.current = false;
      });
  }, [searchParams, navigate]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    try {
      await login(email, password);
      navigate('/');
    } catch {
      // エラーはAuthContextで処理
    }
  };

  const handleOktaLogin = async () => {
    try {
      setOktaLoading(true);
      setOktaError('');
      const url = await authService.getOktaAuthorizeUrl();
      window.location.href = url;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Okta SSO認証の開始に失敗しました';
      setOktaError(msg);
      setOktaLoading(false);
    }
  };

  // コールバック処理中はローディング表示
  if (oktaLoading && searchParams.get('code')) {
    return (
      <PublicLayout title="ログイン">
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 4, gap: 2 }}>
          <CircularProgress />
          <Typography color="text.secondary">Okta認証処理中...</Typography>
        </Box>
      </PublicLayout>
    );
  }

  return (
    <PublicLayout title="ログイン">
      <form onSubmit={handleSubmit}>
        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}
        {oktaError && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {oktaError}
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
          sx={{ mb: 2 }}
        >
          {isLoading ? 'ログイン中...' : 'ログイン'}
        </Button>

        <Divider sx={{ my: 3 }}>
          <Typography variant="caption" color="text.secondary">
            または
          </Typography>
        </Divider>

        <Button
          fullWidth
          variant="outlined"
          size="large"
          onClick={handleOktaLogin}
          disabled={oktaLoading}
          sx={{ mb: 3 }}
        >
          {oktaLoading ? 'リダイレクト中...' : 'Okta SSOでログイン'}
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
              一般ユーザー: demo@example.com / demo123
            </Typography>
            <Typography variant="caption" color="text.secondary">
              管理者: admin@example.com / admin123
            </Typography>
          </Box>
        </Paper>
      </form>
    </PublicLayout>
  );
}
