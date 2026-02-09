import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  TextField,
  Button,
  Divider,
  Grid,
  Switch,
  FormControlLabel,
  Alert,
  Snackbar,
  Card,
  CardContent,
  CircularProgress,
} from '@mui/material';
import SettingsIcon from '@mui/icons-material/Settings';
import CloudSyncIcon from '@mui/icons-material/CloudSync';
import SaveIcon from '@mui/icons-material/Save';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import SyncIcon from '@mui/icons-material/Sync';
import { MainLayout } from '@/layouts/MainLayout';
import { adminSettingsService, adminBoxService, type UpdateSettingsRequest } from '@/services/api/admin';

interface LocalSettings {
  companyName: string;
  // Okta SSO
  oktaDomain: string;
  oktaClientId: string;
  oktaClientSecret: string;
  // BOX連携
  boxClientId: string;
  boxClientSecret: string;
  boxEnterpriseId: string;
  boxJwtKeyId: string;
  boxPrivateKey: string;
  boxPrivateKeyPassphrase: string;
  boxWatchedFolderId: string;
  boxPollEnabled: boolean;
}

const defaultSettings: LocalSettings = {
  companyName: '',
  oktaDomain: '',
  oktaClientId: '',
  oktaClientSecret: '',
  boxClientId: '',
  boxClientSecret: '',
  boxEnterpriseId: '',
  boxJwtKeyId: '',
  boxPrivateKey: '',
  boxPrivateKeyPassphrase: '',
  boxWatchedFolderId: '',
  boxPollEnabled: false,
};

export function SettingsPage() {
  const [settings, setSettings] = useState<LocalSettings>(defaultSettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });
  const [isDirty, setIsDirty] = useState(false);
  const [boxTesting, setBoxTesting] = useState(false);
  const [boxPolling, setBoxPolling] = useState(false);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const data = await adminSettingsService.get();
        setSettings({
          companyName: data.companyName || '',
          oktaDomain: data.oktaDomain || '',
          oktaClientId: data.oktaClientId || '',
          oktaClientSecret: data.oktaClientSecret || '',
          boxClientId: data.boxClientId || '',
          boxClientSecret: data.boxClientSecret || '',
          boxEnterpriseId: data.boxEnterpriseId || '',
          boxJwtKeyId: data.boxJwtKeyId || '',
          boxPrivateKey: data.boxPrivateKey || '',
          boxPrivateKeyPassphrase: data.boxPrivateKeyPassphrase || '',
          boxWatchedFolderId: data.boxWatchedFolderId || '',
          boxPollEnabled: data.boxPollEnabled || false,
        });
      } catch (err) {
        console.error('Failed to fetch settings:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, []);

  const handleChange = <K extends keyof LocalSettings>(key: K, value: LocalSettings[K]) => {
    setSettings(prev => ({ ...prev, [key]: value }));
    setIsDirty(true);
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const request: UpdateSettingsRequest = {
        company_name: settings.companyName,
        okta_domain: settings.oktaDomain,
        okta_client_id: settings.oktaClientId,
        okta_client_secret: settings.oktaClientSecret,
        box_client_id: settings.boxClientId,
        box_client_secret: settings.boxClientSecret,
        box_enterprise_id: settings.boxEnterpriseId,
        box_jwt_key_id: settings.boxJwtKeyId,
        box_private_key: settings.boxPrivateKey,
        box_private_key_passphrase: settings.boxPrivateKeyPassphrase,
        box_watched_folder_id: settings.boxWatchedFolderId,
        box_poll_enabled: settings.boxPollEnabled,
      };
      await adminSettingsService.update(request);
      setSnackbar({ open: true, message: '設定を保存しました', severity: 'success' });
      setIsDirty(false);
    } catch {
      setSnackbar({ open: true, message: '設定の保存に失敗しました', severity: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleBoxTest = async () => {
    try {
      setBoxTesting(true);
      const result = await adminBoxService.testConnection();
      setSnackbar({ open: true, message: result.message, severity: 'success' });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'BOX接続テストに失敗しました';
      setSnackbar({ open: true, message: msg, severity: 'error' });
    } finally {
      setBoxTesting(false);
    }
  };

  const handleBoxPollNow = async () => {
    try {
      setBoxPolling(true);
      const result = await adminBoxService.pollNow();
      const msg = `チェック: ${result.checked}件, 要更新: ${result.outdated}件, エラー: ${result.errors}件`;
      setSnackbar({ open: true, message: msg, severity: result.errors > 0 ? 'error' : 'success' });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'ポーリングに失敗しました';
      setSnackbar({ open: true, message: msg, severity: 'error' });
    } finally {
      setBoxPolling(false);
    }
  };

  if (loading) {
    return (
      <MainLayout>
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress />
        </Box>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <Box>
        {/* ヘッダー */}
        <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1 }}>
              <SettingsIcon />
              システム設定
            </Typography>
            <Typography variant="body2" color="text.secondary">
              システム全体の設定を管理します
            </Typography>
          </Box>
          <Button
            variant="contained"
            startIcon={saving ? <CircularProgress size={20} color="inherit" /> : <SaveIcon />}
            onClick={handleSave}
            disabled={!isDirty || saving}
          >
            保存
          </Button>
        </Box>

        {isDirty && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            未保存の変更があります
          </Alert>
        )}

        <Grid container spacing={3}>
          {/* さくらクラウド連携設定 */}
          <Grid size={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <CloudSyncIcon color="primary" />
                  さくらクラウド連携設定
                </Typography>
                <Divider sx={{ mb: 3 }} />

                {/* セクションA: 認証情報 */}
                <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 2 }}>
                  SFTP接続情報
                </Typography>
                <Grid container spacing={2}>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <TextField
                      fullWidth
                      label="ホスト名"
                      value={settings.boxEnterpriseId}
                      onChange={(e) => handleChange('boxEnterpriseId', e.target.value)}
                      placeholder="xxx.sakura.ne.jp"
                    />
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <TextField
                      fullWidth
                      label="ユーザー名"
                      value={settings.boxClientId}
                      onChange={(e) => handleChange('boxClientId', e.target.value)}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <TextField
                      fullWidth
                      label="パスワード"
                      type="password"
                      value={settings.boxClientSecret}
                      onChange={(e) => handleChange('boxClientSecret', e.target.value)}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <TextField
                      fullWidth
                      label="ポート番号"
                      value={settings.boxJwtKeyId}
                      onChange={(e) => handleChange('boxJwtKeyId', e.target.value)}
                      placeholder="22"
                    />
                  </Grid>
                  <Grid size={12}>
                    <TextField
                      fullWidth
                      label="SSH秘密鍵"
                      multiline
                      rows={4}
                      value={settings.boxPrivateKey}
                      onChange={(e) => handleChange('boxPrivateKey', e.target.value)}
                      placeholder="-----BEGIN RSA PRIVATE KEY-----"
                    />
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <TextField
                      fullWidth
                      label="秘密鍵パスフレーズ"
                      type="password"
                      value={settings.boxPrivateKeyPassphrase}
                      onChange={(e) => handleChange('boxPrivateKeyPassphrase', e.target.value)}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', height: '100%' }}>
                      <Button
                        variant="outlined"
                        startIcon={boxTesting ? <CircularProgress size={20} /> : <CheckCircleIcon />}
                        onClick={handleBoxTest}
                        disabled={boxTesting || !settings.boxClientId || !settings.boxEnterpriseId}
                      >
                        接続テスト
                      </Button>
                    </Box>
                  </Grid>
                </Grid>

                <Divider sx={{ my: 3 }} />

                {/* セクションB: 自動同期 */}
                <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 2 }}>
                  自動同期
                </Typography>
                <Grid container spacing={2}>
                  <Grid size={12}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={settings.boxPollEnabled}
                          onChange={(e) => handleChange('boxPollEnabled', e.target.checked)}
                        />
                      }
                      label="変更検知を有効化"
                    />
                    <Typography variant="caption" color="text.secondary" display="block" sx={{ ml: 6 }}>
                      30分ごとにサーバーの変更を検知し「要更新」としてマークします
                    </Typography>
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <TextField
                      fullWidth
                      label="監視ディレクトリパス"
                      value={settings.boxWatchedFolderId}
                      onChange={(e) => handleChange('boxWatchedFolderId', e.target.value)}
                      placeholder="/home/user/documents"
                      helperText="サーバー上の監視対象ディレクトリを指定"
                    />
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', height: '100%' }}>
                      <Button
                        variant="outlined"
                        startIcon={boxPolling ? <CircularProgress size={20} /> : <SyncIcon />}
                        onClick={handleBoxPollNow}
                        disabled={boxPolling || !settings.boxClientId}
                      >
                        今すぐチェック
                      </Button>
                    </Box>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* スナックバー */}
        <Snackbar
          open={snackbar.open}
          autoHideDuration={3000}
          onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
        >
          <Alert severity={snackbar.severity} onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}>
            {snackbar.message}
          </Alert>
        </Snackbar>
      </Box>
    </MainLayout>
  );
}
