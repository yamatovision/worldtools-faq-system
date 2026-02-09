import { useState, useRef, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Paper,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  IconButton,
  TextField,
  InputAdornment,
  CircularProgress,
  Alert,
  Snackbar,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControlLabel,
  Switch,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  OutlinedInput,
  Checkbox,
  ListItemText,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
} from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import DeleteIcon from '@mui/icons-material/Delete';
import DownloadIcon from '@mui/icons-material/Download';
import SearchIcon from '@mui/icons-material/Search';
import CloudSyncIcon from '@mui/icons-material/CloudSync';
import SettingsIcon from '@mui/icons-material/Settings';
import PublicIcon from '@mui/icons-material/Public';
import LockIcon from '@mui/icons-material/Lock';
import FolderIcon from '@mui/icons-material/Folder';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import SyncIcon from '@mui/icons-material/Sync';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { MainLayout } from '@/layouts/MainLayout';
import {
  getDocuments,
  uploadDocument,
  deleteDocument,
  downloadDocument,
  getDocumentDetail,
  updateDocumentPermissions,
  getBoxConfigured,
  getBoxFolders,
  getBoxFiles,
  syncBoxFiles,
  type Document,
  type DocumentDetail,
  type BoxFolder,
  type BoxFile,
} from '@/services/api/documents';
import { adminDepartmentService, type AdminDepartment } from '@/services/api/admin';

export function DocumentsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [uploading, setUploading] = useState(false);
  const [boxDialogOpen, setBoxDialogOpen] = useState(false);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [permissionDialogOpen, setPermissionDialogOpen] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<DocumentDetail | null>(null);
  const [permissionDocument, setPermissionDocument] = useState<Document | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [departments, setDepartments] = useState<AdminDepartment[]>([]);
  const [permissionForm, setPermissionForm] = useState<{
    is_public: boolean;
    department_ids: string[];
  }>({ is_public: true, department_ids: [] });
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success',
  });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  // BOX state
  const [boxConfigured, setBoxConfigured] = useState(false);
  const [boxFolders, setBoxFolders] = useState<BoxFolder[]>([]);
  const [boxFiles, setBoxFiles] = useState<BoxFile[]>([]);
  const [boxFolderStack, setBoxFolderStack] = useState<{ id: string; name: string }[]>([]);
  const [boxSelectedFiles, setBoxSelectedFiles] = useState<Set<string>>(new Set());
  const [boxLoading, setBoxLoading] = useState(false);
  const [boxSyncing, setBoxSyncing] = useState(false);
  const [boxSyncPublic, setBoxSyncPublic] = useState(true);
  const [boxSyncDeptIds, setBoxSyncDeptIds] = useState<string[]>([]);
  const [syncingFiles, setSyncingFiles] = useState<{ name: string; fileType: string }[]>([]);

  // 部門一覧を取得
  useEffect(() => {
    adminDepartmentService.list().then(setDepartments).catch(console.error);
  }, []);

  // BOX設定確認
  useEffect(() => {
    getBoxConfigured().then((res) => setBoxConfigured(res.configured)).catch(() => setBoxConfigured(false));
  }, []);

  const { data: documents = [], isLoading, error } = useQuery({
    queryKey: ['documents'],
    queryFn: getDocuments,
  });

  const uploadMutation = useMutation({
    mutationFn: uploadDocument,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      setSnackbar({ open: true, message: 'ドキュメントをアップロードしました', severity: 'success' });
    },
    onError: (error: Error) => {
      setSnackbar({ open: true, message: error.message || 'アップロードに失敗しました', severity: 'error' });
    },
    onSettled: () => {
      setUploading(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteDocument,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      setSnackbar({ open: true, message: 'ドキュメントを削除しました', severity: 'success' });
    },
    onError: (error: Error) => {
      setSnackbar({ open: true, message: error.message || '削除に失敗しました', severity: 'error' });
    },
  });

  const permissionMutation = useMutation({
    mutationFn: ({ docId, data }: { docId: string; data: { is_public: boolean; department_ids: string[] } }) =>
      updateDocumentPermissions(docId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      setSnackbar({ open: true, message: '権限を更新しました', severity: 'success' });
      setPermissionDialogOpen(false);
    },
    onError: (error: Error) => {
      setSnackbar({ open: true, message: error.message || '権限の更新に失敗しました', severity: 'error' });
    },
  });

  const handleFileUpload = (file: File) => {
    const allowedTypes = ['.pdf', '.docx', '.doc', '.xlsx', '.xls', '.pptx', '.ppt', '.key', '.txt', '.md', '.csv', '.json', '.html', '.htm'];
    const fileExt = '.' + file.name.split('.').pop()?.toLowerCase();

    if (!allowedTypes.includes(fileExt)) {
      setSnackbar({ open: true, message: '対応していないファイル形式です', severity: 'error' });
      return;
    }

    setUploading(true);
    uploadMutation.mutate(file);
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    handleFileUpload(file);

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFileUpload(file);
    }
  };

  const handleDelete = (documentId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm('このドキュメントを削除してもよろしいですか？\n※RAGデータ（チャンク・エンベディング）も同時に削除されます')) {
      deleteMutation.mutate(documentId);
    }
  };

  const handleOpenPermissionDialog = (doc: Document, e: React.MouseEvent) => {
    e.stopPropagation();
    setPermissionDocument(doc);
    setPermissionForm({
      is_public: doc.is_public,
      department_ids: doc.department_ids || [],
    });
    setPermissionDialogOpen(true);
  };

  const handleSavePermissions = () => {
    if (!permissionDocument) return;
    permissionMutation.mutate({
      docId: permissionDocument.id,
      data: permissionForm,
    });
  };

  const handleRowClick = async (documentId: string) => {
    setLoadingDetail(true);
    setDetailDialogOpen(true);
    try {
      const detail = await getDocumentDetail(documentId);
      setSelectedDocument(detail);
    } catch {
      setSnackbar({ open: true, message: 'ドキュメント詳細の取得に失敗しました', severity: 'error' });
      setDetailDialogOpen(false);
    } finally {
      setLoadingDetail(false);
    }
  };

  // BOX: フォルダ内容読み込み
  const loadBoxFolder = useCallback(async (folderId: string) => {
    setBoxLoading(true);
    try {
      const [folders, files] = await Promise.all([
        getBoxFolders(folderId),
        getBoxFiles(folderId),
      ]);
      setBoxFolders(folders);
      setBoxFiles(files);
      setBoxSelectedFiles(new Set());
    } catch {
      setSnackbar({ open: true, message: 'フォルダの読み込みに失敗しました', severity: 'error' });
    } finally {
      setBoxLoading(false);
    }
  }, []);

  const handleOpenBoxDialog = () => {
    setBoxDialogOpen(true);
    setBoxFolderStack([{ id: '0', name: 'ルート' }]);
    setBoxSyncPublic(true);
    setBoxSyncDeptIds([]);
    loadBoxFolder('0');
  };

  const handleBoxFolderClick = (folder: BoxFolder) => {
    setBoxFolderStack((prev) => [...prev, { id: folder.id, name: folder.name }]);
    loadBoxFolder(folder.id);
  };

  const handleBoxBack = () => {
    if (boxFolderStack.length <= 1) return;
    const newStack = boxFolderStack.slice(0, -1);
    setBoxFolderStack(newStack);
    loadBoxFolder(newStack[newStack.length - 1].id);
  };

  const handleBoxFileToggle = (fileId: string) => {
    setBoxSelectedFiles((prev) => {
      const next = new Set(prev);
      if (next.has(fileId)) next.delete(fileId);
      else next.add(fileId);
      return next;
    });
  };

  const handleBoxSync = async () => {
    if (boxSelectedFiles.size === 0) return;
    setBoxSyncing(true);

    // 選択中ファイルの情報を保持してダイアログを即閉じ
    const selectedFileInfos = boxFiles
      .filter((f) => boxSelectedFiles.has(f.id))
      .map((f) => ({ name: f.name, fileType: f.file_type }));
    const selectedIds = Array.from(boxSelectedFiles);

    setSyncingFiles(selectedFileInfos);
    setBoxDialogOpen(false);

    try {
      const result = await syncBoxFiles(selectedIds, boxSyncPublic, boxSyncDeptIds);
      const successCount = result.results.filter((r) => r.status === 'synced').length;
      const errorCount = result.results.filter((r) => r.status === 'error').length;
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      setSnackbar({
        open: true,
        message: `${successCount}件同期完了${errorCount > 0 ? `、${errorCount}件エラー` : ''}`,
        severity: errorCount > 0 ? 'error' : 'success',
      });
    } catch {
      setSnackbar({ open: true, message: '同期に失敗しました', severity: 'error' });
    } finally {
      setBoxSyncing(false);
      setSyncingFiles([]);
    }
  };

  const filteredDocuments = documents.filter((doc: Document) =>
    doc.filename.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ja-JP');
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <MainLayout>
      <Box>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 600, mb: 0.5 }}>
              ドキュメント管理
            </Typography>
            <Typography variant="body2" color="text.secondary">
              AIが参照するドキュメントをアップロード・管理します
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              variant="contained"
              component="label"
              startIcon={uploading ? <CircularProgress size={20} color="inherit" /> : <CloudUploadIcon />}
              disabled={uploading}
            >
              {uploading ? 'アップロード中...' : 'ファイルをアップロード'}
              <input
                type="file"
                accept=".pdf,.docx,.doc,.xlsx,.xls,.pptx,.ppt,.key,.txt,.md,.csv,.json,.html,.htm"
                ref={fileInputRef}
                onChange={handleFileSelect}
                hidden
              />
            </Button>
            {boxConfigured && (
              <Button
                variant="outlined"
                startIcon={<CloudSyncIcon />}
                onClick={handleOpenBoxDialog}
              >
                サーバーから同期
              </Button>
            )}
          </Box>
        </Box>

        {/* ドラッグ&ドロップエリア */}
        <Paper
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => !uploading && fileInputRef.current?.click()}
          sx={{
            p: 3,
            mb: 3,
            border: '2px dashed',
            borderColor: isDragging ? 'primary.main' : 'grey.300',
            backgroundColor: isDragging ? 'primary.50' : 'grey.50',
            cursor: uploading ? 'not-allowed' : 'pointer',
            transition: 'all 0.2s ease',
            textAlign: 'center',
            '&:hover': {
              borderColor: uploading ? 'grey.300' : 'primary.main',
              backgroundColor: uploading ? 'grey.50' : 'primary.50',
            },
          }}
        >
          {uploading ? (
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2 }}>
              <CircularProgress size={24} />
              <Typography>アップロード中...</Typography>
            </Box>
          ) : (
            <>
              <CloudUploadIcon sx={{ fontSize: 48, color: isDragging ? 'primary.main' : 'grey.400', mb: 1 }} />
              <Typography variant="body1" sx={{ fontWeight: 500, mb: 0.5 }}>
                ファイルをドラッグ&ドロップ、またはクリックして選択
              </Typography>
              <Typography variant="body2" color="text.secondary">
                対応形式: PDF, Word, Excel, PowerPoint, Keynote, テキスト, Markdown, CSV, JSON, HTML
              </Typography>
            </>
          )}
        </Paper>

        {/* 検索 */}
        <TextField
          placeholder="ドキュメントを検索..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          sx={{ mb: 3, width: 300 }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon color="action" />
              </InputAdornment>
            ),
          }}
        />

        {/* テーブル */}
        {isLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        ) : error ? (
          <Alert severity="error">ドキュメントの読み込みに失敗しました</Alert>
        ) : filteredDocuments.length === 0 ? (
          <Paper sx={{ p: 4, textAlign: 'center' }}>
            <Typography color="text.secondary">
              {searchQuery ? '検索結果がありません' : 'ドキュメントがありません。ファイルをアップロードしてください。'}
            </Typography>
          </Paper>
        ) : (
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>ドキュメント名</TableCell>
                  <TableCell>形式</TableCell>
                  <TableCell>公開範囲</TableCell>
                  <TableCell>チャンク数</TableCell>
                  <TableCell>登録日</TableCell>
                  <TableCell align="right">操作</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {syncingFiles.map((sf, i) => (
                  <TableRow key={`syncing-${i}`} sx={{ opacity: 0.6, '@keyframes pulse': { '0%, 100%': { opacity: 0.6 }, '50%': { opacity: 0.3 } }, animation: 'pulse 1.5s ease-in-out infinite' }}>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <CircularProgress size={16} />
                        {sf.name}
                        <Chip label="同期中..." size="small" color="info" variant="outlined" sx={{ fontSize: '0.65rem' }} />
                      </Box>
                    </TableCell>
                    <TableCell><Chip label={sf.fileType.toUpperCase()} size="small" variant="outlined" /></TableCell>
                    <TableCell>-</TableCell>
                    <TableCell>-</TableCell>
                    <TableCell>-</TableCell>
                    <TableCell align="right">-</TableCell>
                  </TableRow>
                ))}
                {filteredDocuments.map((doc: Document) => (
                  <TableRow
                    key={doc.id}
                    hover
                    onClick={() => handleRowClick(doc.id)}
                    sx={{ cursor: 'pointer' }}
                  >
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {doc.filename}
                        {doc.box_sync_status && (
                          <Chip
                            icon={<SyncIcon />}
                            label={
                              doc.box_sync_status === 'synced' ? '同期済'
                              : doc.box_sync_status === 'outdated' ? '要更新'
                              : 'エラー'
                            }
                            size="small"
                            color={
                              doc.box_sync_status === 'synced' ? 'success'
                              : doc.box_sync_status === 'outdated' ? 'warning'
                              : 'error'
                            }
                            variant="outlined"
                            sx={{ fontSize: '0.65rem' }}
                          />
                        )}
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip label={doc.file_type.toUpperCase()} size="small" variant="outlined" />
                    </TableCell>
                    <TableCell>
                      {doc.is_public ? (
                        <Chip icon={<PublicIcon />} label="全社公開" size="small" color="success" variant="outlined" />
                      ) : doc.department_names && doc.department_names.length > 0 ? (
                        <Chip
                          icon={<LockIcon />}
                          label={doc.department_names.join(', ')}
                          size="small"
                          color="warning"
                          variant="outlined"
                        />
                      ) : (
                        <Chip icon={<LockIcon />} label="非公開" size="small" color="error" variant="outlined" />
                      )}
                    </TableCell>
                    <TableCell>{doc.chunk_count}</TableCell>
                    <TableCell>{formatDate(doc.created_at)}</TableCell>
                    <TableCell align="right">
                      <IconButton
                        size="small"
                        title="権限設定"
                        onClick={(e) => handleOpenPermissionDialog(doc, e)}
                      >
                        <SettingsIcon fontSize="small" />
                      </IconButton>
                      <IconButton
                        size="small"
                        title="削除"
                        color="error"
                        onClick={(e) => handleDelete(doc.id, e)}
                        disabled={deleteMutation.isPending}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Box>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert severity={snackbar.severity} onClose={() => setSnackbar({ ...snackbar, open: false })}>
          {snackbar.message}
        </Alert>
      </Snackbar>

      {/* 権限設定ダイアログ */}
      <Dialog open={permissionDialogOpen} onClose={() => setPermissionDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>権限設定: {permissionDocument?.filename}</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <FormControlLabel
              control={
                <Switch
                  checked={permissionForm.is_public}
                  onChange={(e) => setPermissionForm({ ...permissionForm, is_public: e.target.checked })}
                />
              }
              label="全社公開"
            />
            <Typography variant="caption" color="text.secondary" display="block" sx={{ ml: 6, mb: 3 }}>
              オンにすると、全社員がこのドキュメントの内容を検索・参照できます
            </Typography>

            {!permissionForm.is_public && (
              <FormControl fullWidth>
                <InputLabel>アクセス可能な部門</InputLabel>
                <Select
                  multiple
                  value={permissionForm.department_ids}
                  onChange={(e) =>
                    setPermissionForm({ ...permissionForm, department_ids: e.target.value as string[] })
                  }
                  input={<OutlinedInput label="アクセス可能な部門" />}
                  renderValue={(selected) =>
                    departments
                      .filter((d) => selected.includes(d.id))
                      .map((d) => d.name)
                      .join(', ')
                  }
                >
                  {departments.map((dept) => (
                    <MenuItem key={dept.id} value={dept.id}>
                      <Checkbox checked={permissionForm.department_ids.includes(dept.id)} />
                      <ListItemText primary={dept.name} />
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPermissionDialogOpen(false)}>キャンセル</Button>
          <Button variant="contained" onClick={handleSavePermissions} disabled={permissionMutation.isPending}>
            保存
          </Button>
        </DialogActions>
      </Dialog>

      {/* BOX同期ダイアログ */}
      <Dialog open={boxDialogOpen} onClose={() => setBoxDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>サーバーから同期</DialogTitle>
        <DialogContent>
          {/* パンくずリスト */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 2, mt: 1 }}>
            {boxFolderStack.length > 1 && (
              <IconButton size="small" onClick={handleBoxBack}>
                <ArrowBackIcon fontSize="small" />
              </IconButton>
            )}
            <Typography variant="body2" color="text.secondary">
              {boxFolderStack.map((f) => f.name).join(' / ')}
            </Typography>
          </Box>

          {boxLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress />
            </Box>
          ) : (
            <List dense sx={{ maxHeight: 400, overflow: 'auto' }}>
              {boxFolders.map((folder) => (
                <ListItem key={folder.id} disablePadding>
                  <ListItemButton onClick={() => handleBoxFolderClick(folder)}>
                    <ListItemIcon sx={{ minWidth: 36 }}>
                      <FolderIcon color="primary" />
                    </ListItemIcon>
                    <ListItemText primary={folder.name} />
                  </ListItemButton>
                </ListItem>
              ))}
              {boxFiles.map((file) => (
                <ListItem key={file.id} disablePadding>
                  <ListItemButton onClick={() => handleBoxFileToggle(file.id)}>
                    <ListItemIcon sx={{ minWidth: 36 }}>
                      <Checkbox
                        edge="start"
                        checked={boxSelectedFiles.has(file.id)}
                        disableRipple
                        size="small"
                      />
                    </ListItemIcon>
                    <ListItemIcon sx={{ minWidth: 36 }}>
                      <InsertDriveFileIcon color="action" />
                    </ListItemIcon>
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          {file.name}
                          {file.sync_status && (
                            <Chip
                              icon={<SyncIcon />}
                              label={file.sync_status === 'synced' ? '同期済' : file.sync_status === 'outdated' ? '要更新' : 'エラー'}
                              size="small"
                              color={file.sync_status === 'synced' ? 'success' : file.sync_status === 'outdated' ? 'warning' : 'error'}
                              variant="outlined"
                              sx={{ fontSize: '0.65rem', height: 20 }}
                            />
                          )}
                        </Box>
                      }
                      secondary={`${formatFileSize(file.size)} / ${file.file_type.toUpperCase()}`}
                    />
                  </ListItemButton>
                </ListItem>
              ))}
              {boxFolders.length === 0 && boxFiles.length === 0 && (
                <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 3 }}>
                  ファイルがありません
                </Typography>
              )}
            </List>
          )}

          {/* 同期設定 */}
          {boxSelectedFiles.size > 0 && (
            <Box sx={{ mt: 2, pt: 2, borderTop: 1, borderColor: 'divider' }}>
              <Typography variant="body2" sx={{ mb: 1, fontWeight: 500 }}>
                {boxSelectedFiles.size}件のファイルを同期
              </Typography>
              <FormControlLabel
                control={
                  <Switch
                    checked={boxSyncPublic}
                    onChange={(e) => setBoxSyncPublic(e.target.checked)}
                    size="small"
                  />
                }
                label="全社公開"
              />
              {!boxSyncPublic && (
                <FormControl fullWidth size="small" sx={{ mt: 1 }}>
                  <InputLabel>部門</InputLabel>
                  <Select
                    multiple
                    value={boxSyncDeptIds}
                    onChange={(e) => setBoxSyncDeptIds(e.target.value as string[])}
                    input={<OutlinedInput label="部門" />}
                    renderValue={(selected) =>
                      departments.filter((d) => selected.includes(d.id)).map((d) => d.name).join(', ')
                    }
                  >
                    {departments.map((dept) => (
                      <MenuItem key={dept.id} value={dept.id}>
                        <Checkbox checked={boxSyncDeptIds.includes(dept.id)} size="small" />
                        <ListItemText primary={dept.name} />
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setBoxDialogOpen(false)}>キャンセル</Button>
          <Button
            variant="contained"
            onClick={handleBoxSync}
            disabled={boxSelectedFiles.size === 0 || boxSyncing}
            startIcon={boxSyncing ? <CircularProgress size={16} color="inherit" /> : <SyncIcon />}
          >
            {boxSyncing ? '同期中...' : '同期実行'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ドキュメント詳細ダイアログ */}
      <Dialog
        open={detailDialogOpen}
        onClose={() => {
          setDetailDialogOpen(false);
          setSelectedDocument(null);
        }}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {selectedDocument?.filename || 'ドキュメント詳細'}
        </DialogTitle>
        <DialogContent dividers>
          {loadingDetail ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress />
            </Box>
          ) : selectedDocument ? (
            <Box>
              <Box sx={{ mb: 2, display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
                <Chip label={selectedDocument.file_type.toUpperCase()} size="small" />
                <Typography variant="body2" color="text.secondary">
                  {selectedDocument.chunks.length}チャンクに分割済み
                </Typography>
                {selectedDocument.is_public ? (
                  <Chip icon={<PublicIcon />} label="全社公開" size="small" color="success" variant="outlined" />
                ) : selectedDocument.department_names && selectedDocument.department_names.length > 0 ? (
                  <Chip
                    icon={<LockIcon />}
                    label={selectedDocument.department_names.join(', ')}
                    size="small"
                    color="warning"
                    variant="outlined"
                  />
                ) : (
                  <Chip icon={<LockIcon />} label="非公開" size="small" color="error" variant="outlined" />
                )}
              </Box>
              {selectedDocument.chunks.map((chunk, index) => (
                <Paper key={index} variant="outlined" sx={{ p: 2, mb: 2 }}>
                  <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
                    チャンク {chunk.index + 1}
                  </Typography>
                  <Typography
                    variant="body2"
                    sx={{
                      whiteSpace: 'pre-wrap',
                      fontFamily: 'inherit',
                      lineHeight: 1.8,
                    }}
                  >
                    {chunk.content}
                  </Typography>
                </Paper>
              ))}
            </Box>
          ) : null}
        </DialogContent>
        <DialogActions>
          {selectedDocument?.has_original_file && (
            <Button
              startIcon={<DownloadIcon />}
              onClick={() => {
                if (selectedDocument) {
                  downloadDocument(selectedDocument.id, selectedDocument.filename).catch(() => {
                    setSnackbar({ open: true, message: 'ダウンロードに失敗しました', severity: 'error' });
                  });
                }
              }}
              sx={{ mr: 'auto' }}
            >
              元ファイルをダウンロード
            </Button>
          )}
          <Button
            onClick={() => {
              setDetailDialogOpen(false);
              setSelectedDocument(null);
            }}
          >
            閉じる
          </Button>
        </DialogActions>
      </Dialog>
    </MainLayout>
  );
}
