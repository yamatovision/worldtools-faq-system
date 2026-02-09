import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  IconButton,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  Snackbar,
  CircularProgress,
  Switch,
  FormControlLabel,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import PersonIcon from '@mui/icons-material/Person';
import { MainLayout } from '@/layouts/MainLayout';
import {
  adminUserService,
  adminDepartmentService,
  type AdminUser,
  type AdminDepartment,
  type CreateUserRequest,
  type UpdateUserRequest,
} from '@/services/api/admin';
import { useUser } from '@/hooks/useAuth';

function formatRelativeDate(isoString: string): string {
  const d = new Date(isoString);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return '今日';
  if (diffDays === 1) return '昨日';
  if (diffDays < 7) return `${diffDays}日前`;
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

interface UserFormData {
  email: string;
  name: string;
  password: string;
  departmentId: string;
  role: string;
  isActive: boolean;
}

const initialFormData: UserFormData = {
  email: '',
  name: '',
  password: '',
  departmentId: '',
  role: 'user',
  isActive: true,
};

export function UsersPage() {
  const currentUser = useUser();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [departments, setDepartments] = useState<AdminDepartment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null);
  const [formData, setFormData] = useState<UserFormData>(initialFormData);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });

  const fetchData = async () => {
    try {
      setLoading(true);
      const [usersData, deptsData] = await Promise.all([
        adminUserService.list(),
        adminDepartmentService.list(),
      ]);
      setUsers(usersData);
      setDepartments(deptsData);
      setError(null);
    } catch (err) {
      setError('データの取得に失敗しました');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleOpenDialog = (user?: AdminUser) => {
    if (user) {
      setEditingUser(user);
      setFormData({
        email: user.email,
        name: user.name,
        password: '',
        departmentId: user.departmentId || '',
        role: user.role,
        isActive: user.isActive,
      });
    } else {
      setEditingUser(null);
      setFormData(initialFormData);
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingUser(null);
    setFormData(initialFormData);
  };

  const handleSubmit = async () => {
    try {
      if (editingUser) {
        const updateData: UpdateUserRequest = {
          email: formData.email,
          name: formData.name,
          department_id: formData.departmentId || undefined,
          role: formData.role,
          is_active: formData.isActive,
        };
        if (formData.password) {
          updateData.password = formData.password;
        }
        await adminUserService.update(editingUser.id, updateData);
        setSnackbar({ open: true, message: 'ユーザーを更新しました', severity: 'success' });
      } else {
        const createData: CreateUserRequest = {
          email: formData.email,
          password: formData.password,
          name: formData.name,
          department_id: formData.departmentId || undefined,
          role: formData.role,
        };
        await adminUserService.create(createData);
        setSnackbar({ open: true, message: 'ユーザーを作成しました', severity: 'success' });
      }
      handleCloseDialog();
      fetchData();
    } catch (err) {
      setSnackbar({ open: true, message: '操作に失敗しました', severity: 'error' });
      console.error(err);
    }
  };

  const handleDelete = async (user: AdminUser) => {
    if (user.id === currentUser?.id) {
      setSnackbar({ open: true, message: '自分自身は削除できません', severity: 'error' });
      return;
    }
    if (!confirm(`「${user.name}」を削除しますか？`)) return;

    try {
      await adminUserService.delete(user.id);
      setSnackbar({ open: true, message: 'ユーザーを削除しました', severity: 'success' });
      fetchData();
    } catch (err) {
      setSnackbar({ open: true, message: '削除に失敗しました', severity: 'error' });
      console.error(err);
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
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 600, mb: 0.5, display: 'flex', alignItems: 'center', gap: 1 }}>
              <PersonIcon />
              ユーザー管理
            </Typography>
            <Typography variant="body2" color="text.secondary">
              ユーザーの作成・編集・削除を行います
            </Typography>
          </Box>
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => handleOpenDialog()}>
            ユーザーを追加
          </Button>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>名前</TableCell>
                <TableCell>メールアドレス</TableCell>
                <TableCell>部門</TableCell>
                <TableCell align="center">質問数</TableCell>
                <TableCell align="center">最終利用</TableCell>
                <TableCell align="center">権限</TableCell>
                <TableCell align="center">状態</TableCell>
                <TableCell align="right">操作</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id} hover>
                  <TableCell>
                    <Typography fontWeight={500}>{user.name}</Typography>
                  </TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>{user.departmentName || '-'}</TableCell>
                  <TableCell align="center">
                    <Typography variant="body2" sx={{ fontWeight: user.questionCount > 0 ? 600 : 400 }}>
                      {user.questionCount}
                    </Typography>
                  </TableCell>
                  <TableCell align="center">
                    <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.8rem' }}>
                      {user.lastUsedAt ? formatRelativeDate(user.lastUsedAt) : '-'}
                    </Typography>
                  </TableCell>
                  <TableCell align="center">
                    <Chip
                      label={user.role === 'admin' ? '管理者' : 'ユーザー'}
                      size="small"
                      color={user.role === 'admin' ? 'primary' : 'default'}
                    />
                  </TableCell>
                  <TableCell align="center">
                    <Chip
                      label={user.isActive ? '有効' : '無効'}
                      size="small"
                      color={user.isActive ? 'success' : 'default'}
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell align="right">
                    <IconButton size="small" onClick={() => handleOpenDialog(user)} title="編集">
                      <EditIcon fontSize="small" />
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={() => handleDelete(user)}
                      title="削除"
                      disabled={user.id === currentUser?.id}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
              {users.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} align="center">
                    <Typography color="text.secondary" sx={{ py: 4 }}>
                      ユーザーがいません
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>

      {/* ユーザー作成/編集ダイアログ */}
      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>{editingUser ? 'ユーザーを編集' : 'ユーザーを追加'}</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            fullWidth
            label="名前"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            sx={{ mt: 2 }}
          />
          <TextField
            fullWidth
            label="メールアドレス"
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            sx={{ mt: 2 }}
          />
          <TextField
            fullWidth
            label={editingUser ? 'パスワード（変更する場合のみ）' : 'パスワード'}
            type="password"
            value={formData.password}
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            required={!editingUser}
            sx={{ mt: 2 }}
          />
          <FormControl fullWidth sx={{ mt: 2 }}>
            <InputLabel>部門</InputLabel>
            <Select
              value={formData.departmentId}
              label="部門"
              onChange={(e) => setFormData({ ...formData, departmentId: e.target.value })}
            >
              <MenuItem value="">
                <em>なし</em>
              </MenuItem>
              {departments.map((dept) => (
                <MenuItem key={dept.id} value={dept.id}>
                  {dept.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl fullWidth sx={{ mt: 2 }}>
            <InputLabel>権限</InputLabel>
            <Select
              value={formData.role}
              label="権限"
              onChange={(e) => setFormData({ ...formData, role: e.target.value })}
            >
              <MenuItem value="user">ユーザー</MenuItem>
              <MenuItem value="admin">管理者</MenuItem>
            </Select>
          </FormControl>
          {editingUser && (
            <FormControlLabel
              control={
                <Switch
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                />
              }
              label="アカウント有効"
              sx={{ mt: 2, display: 'block' }}
            />
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>キャンセル</Button>
          <Button
            variant="contained"
            onClick={handleSubmit}
            disabled={!formData.name.trim() || !formData.email.trim() || (!editingUser && !formData.password)}
          >
            {editingUser ? '更新' : '作成'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* スナックバー */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
      >
        <Alert severity={snackbar.severity} onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </MainLayout>
  );
}
