import type { FormEvent } from 'react';
import { useState } from 'react';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import {
  Box,
  TextField,
  Button,
  Alert,
  Typography,
  Link,
} from '@mui/material';
import PersonAddOutlinedIcon from '@mui/icons-material/PersonAddOutlined';
import { PublicLayout } from '@/layouts/PublicLayout';
import { useAuth } from '@/hooks/useAuth';

export function SignupPage() {
  const navigate = useNavigate();
  const { signup, isLoading, error } = useAuth();
  const [companyName, setCompanyName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [localError, setLocalError] = useState('');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLocalError('');

    if (password.length < 8) {
      setLocalError('パスワードは8文字以上で入力してください');
      return;
    }
    if (password !== passwordConfirm) {
      setLocalError('パスワードが一致しません');
      return;
    }

    try {
      await signup(companyName.trim(), email, password);
      navigate('/');
    } catch {
      // エラーはAuthContextで処理
    }
  };

  const displayError = localError || error;

  return (
    <PublicLayout title="無料トライアル登録">
      <form onSubmit={handleSubmit}>
        {displayError && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {displayError}
          </Alert>
        )}

        <Alert severity="info" sx={{ mb: 3 }}>
          14日間無料でお試しいただけます。クレジットカード不要。
        </Alert>

        <TextField
          fullWidth
          label="企業名"
          value={companyName}
          onChange={(e) => setCompanyName(e.target.value)}
          required
          autoFocus
          sx={{ mb: 2 }}
        />

        <TextField
          fullWidth
          label="メールアドレス"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoComplete="email"
          sx={{ mb: 2 }}
        />

        <TextField
          fullWidth
          label="パスワード（8文字以上）"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          autoComplete="new-password"
          sx={{ mb: 2 }}
        />

        <TextField
          fullWidth
          label="パスワード（確認）"
          type="password"
          value={passwordConfirm}
          onChange={(e) => setPasswordConfirm(e.target.value)}
          required
          autoComplete="new-password"
          sx={{ mb: 3 }}
        />

        <Button
          type="submit"
          fullWidth
          variant="contained"
          size="large"
          disabled={isLoading}
          startIcon={<PersonAddOutlinedIcon />}
          sx={{ mb: 2 }}
        >
          {isLoading ? '登録中...' : '無料で始める'}
        </Button>

        <Box sx={{ textAlign: 'center' }}>
          <Typography variant="body2" color="text.secondary">
            アカウントをお持ちの方は{' '}
            <Link component={RouterLink} to="/login" underline="hover">
              ログイン
            </Link>
          </Typography>
        </Box>
      </form>
    </PublicLayout>
  );
}
