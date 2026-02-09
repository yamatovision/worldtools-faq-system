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
  Alert,
  Snackbar,
  CircularProgress,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { MainLayout } from '@/layouts/MainLayout';
import { adminDepartmentService, type AdminDepartment, type CreateDepartmentRequest } from '@/services/api/admin';

export function DepartmentsPage() {
  const [departments, setDepartments] = useState<AdminDepartment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingDept, setEditingDept] = useState<AdminDepartment | null>(null);
  const [formData, setFormData] = useState<CreateDepartmentRequest>({ name: '', description: '' });
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });

  const fetchDepartments = async () => {
    try {
      setLoading(true);
      const data = await adminDepartmentService.list();
      setDepartments(data);
      setError(null);
    } catch (err) {
      setError('部門の取得に失敗しました');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDepartments();
  }, []);

  const handleOpenDialog = (dept?: AdminDepartment) => {
    if (dept) {
      setEditingDept(dept);
      setFormData({ name: dept.name, description: dept.description || '' });
    } else {
      setEditingDept(null);
      setFormData({ name: '', description: '' });
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingDept(null);
    setFormData({ name: '', description: '' });
  };

  const handleSubmit = async () => {
    try {
      if (editingDept) {
        await adminDepartmentService.update(editingDept.id, formData);
        setSnackbar({ open: true, message: '部門を更新しました', severity: 'success' });
      } else {
        await adminDepartmentService.create(formData);
        setSnackbar({ open: true, message: '部門を作成しました', severity: 'success' });
      }
      handleCloseDialog();
      fetchDepartments();
    } catch (err) {
      setSnackbar({ open: true, message: '操作に失敗しました', severity: 'error' });
      console.error(err);
    }
  };

  const handleDelete = async (dept: AdminDepartment) => {
    if (dept.userCount > 0) {
      setSnackbar({ open: true, message: 'ユーザーが所属している部門は削除できません', severity: 'error' });
      return;
    }
    if (!confirm(`「${dept.name}」を削除しますか？`)) return;

    try {
      await adminDepartmentService.delete(dept.id);
      setSnackbar({ open: true, message: '部門を削除しました', severity: 'success' });
      fetchDepartments();
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
            <Typography variant="h5" sx={{ fontWeight: 600, mb: 0.5 }}>
              部門管理
            </Typography>
            <Typography variant="body2" color="text.secondary">
              部門の作成・編集・削除を行います
            </Typography>
          </Box>
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => handleOpenDialog()}>
            部門を追加
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
                <TableCell>部門名</TableCell>
                <TableCell>説明</TableCell>
                <TableCell align="center">ユーザー数</TableCell>
                <TableCell align="center">ドキュメント数</TableCell>
                <TableCell align="right">操作</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {departments.map((dept) => (
                <TableRow key={dept.id} hover>
                  <TableCell>
                    <Typography fontWeight={500}>{dept.name}</Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" color="text.secondary">
                      {dept.description || '-'}
                    </Typography>
                  </TableCell>
                  <TableCell align="center">
                    <Chip label={`${dept.userCount}名`} size="small" variant="outlined" />
                  </TableCell>
                  <TableCell align="center">
                    <Chip label={`${dept.documentCount}件`} size="small" color="primary" variant="outlined" />
                  </TableCell>
                  <TableCell align="right">
                    <IconButton size="small" onClick={() => handleOpenDialog(dept)} title="編集">
                      <EditIcon fontSize="small" />
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={() => handleDelete(dept)}
                      title="削除"
                      disabled={dept.userCount > 0}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
              {departments.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} align="center">
                    <Typography color="text.secondary" sx={{ py: 4 }}>
                      部門がありません
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>

      {/* 部門作成/編集ダイアログ */}
      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>{editingDept ? '部門を編集' : '部門を追加'}</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            fullWidth
            label="部門名"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            sx={{ mt: 2 }}
          />
          <TextField
            fullWidth
            label="説明"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            multiline
            rows={2}
            sx={{ mt: 2 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>キャンセル</Button>
          <Button variant="contained" onClick={handleSubmit} disabled={!formData.name.trim()}>
            {editingDept ? '更新' : '作成'}
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
