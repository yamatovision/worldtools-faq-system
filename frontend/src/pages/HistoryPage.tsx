import { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  CircularProgress,
  TextField,
  InputAdornment,
  TablePagination,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import VisibilityIcon from '@mui/icons-material/Visibility';
import ThumbUpIcon from '@mui/icons-material/ThumbUp';
import ThumbDownIcon from '@mui/icons-material/ThumbDown';
import QuestionAnswerIcon from '@mui/icons-material/QuestionAnswer';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import FileDownloadOutlinedIcon from '@mui/icons-material/FileDownloadOutlined';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useQuery } from '@tanstack/react-query';
import { MainLayout } from '@/layouts/MainLayout';
import { WT_COLORS } from '@/theme';
import { apiClient } from '@/services/api/client';
import { downloadDocument } from '@/services/api/documents';

interface ChatReference {
  id: string;
  title: string;
  section?: string;
  excerpt?: string;
}

interface ChatHistoryItem {
  id: string;
  question: string;
  answer: string;
  full_answer: string;
  is_no_answer: boolean;
  feedback: 'good' | 'bad' | null;
  references: ChatReference[];
  created_at: string;
}

interface ChatHistoryResponse {
  total: number;
  items: ChatHistoryItem[];
}

export function HistoryPage() {
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [searchQuery, setSearchQuery] = useState('');
  const [feedbackFilter, setFeedbackFilter] = useState<string>('all');
  const [selectedChat, setSelectedChat] = useState<ChatHistoryItem | null>(null);
  const [expandedRefs, setExpandedRefs] = useState<Set<string>>(new Set());

  const { data, isLoading } = useQuery<ChatHistoryResponse>({
    queryKey: ['chat-history', page, rowsPerPage, feedbackFilter],
    queryFn: async () => {
      const params = new URLSearchParams({
        limit: rowsPerPage.toString(),
        offset: (page * rowsPerPage).toString(),
      });
      if (feedbackFilter !== 'all') {
        params.append('feedback', feedbackFilter);
      }
      return apiClient.get<ChatHistoryResponse>(`/api/stats/chat-history?${params}`);
    },
  });

  const toggleRef = (key: string) => {
    setExpandedRefs((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const handleChangePage = (_: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleOpenDetail = (item: ChatHistoryItem) => {
    setSelectedChat(item);
    setExpandedRefs(new Set());
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('ja-JP', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const filteredItems = data?.items.filter((item) =>
    searchQuery
      ? item.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.answer.toLowerCase().includes(searchQuery.toLowerCase())
      : true
  );

  const getFeedbackChip = (feedback: 'good' | 'bad' | null) => {
    if (feedback === 'good') {
      return <Chip icon={<ThumbUpIcon />} label="Good" color="success" size="small" />;
    }
    if (feedback === 'bad') {
      return <Chip icon={<ThumbDownIcon />} label="Bad" color="error" size="small" />;
    }
    return <Chip label="未評価" variant="outlined" size="small" />;
  };

  return (
    <MainLayout>
      <Box>
        {/* ヘッダー */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="h5" sx={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1 }}>
            <QuestionAnswerIcon />
            質問履歴
          </Typography>
          <Typography variant="body2" color="text.secondary">
            過去の質問と回答を確認できます
          </Typography>
        </Box>

        {/* フィルター */}
        <Paper sx={{ p: 2, mb: 2 }}>
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            <TextField
              size="small"
              placeholder="質問・回答を検索..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
              }}
              sx={{ minWidth: 300 }}
            />
            <FormControl size="small" sx={{ minWidth: 150 }}>
              <InputLabel>フィードバック</InputLabel>
              <Select
                value={feedbackFilter}
                label="フィードバック"
                onChange={(e) => {
                  setFeedbackFilter(e.target.value);
                  setPage(0);
                }}
              >
                <MenuItem value="all">すべて</MenuItem>
                <MenuItem value="good">Good</MenuItem>
                <MenuItem value="bad">Bad</MenuItem>
                <MenuItem value="none">未評価</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </Paper>

        {/* テーブル */}
        <Paper>
          {isLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
              <CircularProgress />
            </Box>
          ) : (
            <>
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>日時</TableCell>
                      <TableCell>質問</TableCell>
                      <TableCell>回答（抜粋）</TableCell>
                      <TableCell align="center">評価</TableCell>
                      <TableCell align="center">詳細</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredItems?.map((item) => (
                      <TableRow
                        key={item.id}
                        hover
                        sx={{
                          backgroundColor: item.is_no_answer ? 'rgba(255,152,0,0.05)' : 'inherit',
                          cursor: 'pointer',
                        }}
                        onClick={() => handleOpenDetail(item)}
                      >
                        <TableCell sx={{ whiteSpace: 'nowrap' }}>
                          {formatDate(item.created_at)}
                        </TableCell>
                        <TableCell sx={{ maxWidth: 250 }}>
                          <Typography
                            variant="body2"
                            sx={{
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {item.question}
                          </Typography>
                        </TableCell>
                        <TableCell sx={{ maxWidth: 300 }}>
                          <Typography
                            variant="body2"
                            sx={{
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {item.answer}
                          </Typography>
                          {item.is_no_answer && (
                            <Chip
                              label="回答なし"
                              color="warning"
                              size="small"
                              sx={{ mt: 0.5 }}
                            />
                          )}
                        </TableCell>
                        <TableCell align="center">
                          {getFeedbackChip(item.feedback)}
                        </TableCell>
                        <TableCell align="center">
                          <IconButton
                            size="small"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenDetail(item);
                            }}
                          >
                            <VisibilityIcon />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                    {filteredItems?.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5} align="center" sx={{ py: 4 }}>
                          <Typography color="text.secondary">
                            履歴がありません
                          </Typography>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
              <TablePagination
                component="div"
                count={data?.total || 0}
                page={page}
                onPageChange={handleChangePage}
                rowsPerPage={rowsPerPage}
                onRowsPerPageChange={handleChangeRowsPerPage}
                rowsPerPageOptions={[10, 25, 50]}
                labelRowsPerPage="表示件数:"
                labelDisplayedRows={({ from, to, count }) =>
                  `${from}-${to} / ${count}`
                }
              />
            </>
          )}
        </Paper>

        {/* 詳細ダイアログ（チャット画面と同じ表示） */}
        <Dialog
          open={!!selectedChat}
          onClose={() => setSelectedChat(null)}
          maxWidth="md"
          fullWidth
        >
          <DialogTitle sx={{ pb: 1 }}>
            <Typography variant="caption" color="text.secondary">
              {selectedChat && formatDate(selectedChat.created_at)}
            </Typography>
          </DialogTitle>
          <DialogContent dividers sx={{ backgroundColor: '#f5f7fa' }}>
            {selectedChat && (
              <Box sx={{ maxWidth: 700, mx: 'auto' }}>
                {/* 質問 */}
                <Box
                  sx={{
                    mb: 2,
                    p: 1.5,
                    backgroundColor: `${WT_COLORS.primary}0a`,
                    borderRadius: 2,
                    borderLeft: `3px solid ${WT_COLORS.primary}`,
                  }}
                >
                  <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.85rem' }}>
                    Q: {selectedChat.question}
                  </Typography>
                </Box>

                {/* 回答（Markdown） */}
                <Paper
                  elevation={0}
                  sx={{
                    p: 3,
                    backgroundColor: 'white',
                    borderRadius: 2,
                    border: `1px solid ${WT_COLORS.border}`,
                  }}
                >
                  <Box
                    sx={{
                      '& p': { mt: 0, mb: 1.5, lineHeight: 1.8 },
                      '& p:last-child': { mb: 0 },
                      '& ul, & ol': { pl: 3, mb: 1.5 },
                      '& li': { mb: 0.5, lineHeight: 1.7 },
                      '& strong': { color: WT_COLORS.primaryDark },
                      '& h1, & h2, & h3': { mt: 2, mb: 1, fontWeight: 600 },
                      '& table': {
                        borderCollapse: 'collapse',
                        width: '100%',
                        mb: 1.5,
                        '& th, & td': {
                          border: `1px solid ${WT_COLORS.border}`,
                          p: 1,
                          fontSize: '0.875rem',
                        },
                        '& th': { backgroundColor: `${WT_COLORS.primary}0a`, fontWeight: 600 },
                      },
                      '& code': {
                        backgroundColor: '#f5f5f5',
                        px: 0.5,
                        py: 0.25,
                        borderRadius: 0.5,
                        fontSize: '0.85em',
                      },
                      '& blockquote': {
                        borderLeft: `3px solid ${WT_COLORS.primary}`,
                        pl: 2,
                        ml: 0,
                        color: 'text.secondary',
                      },
                    }}
                  >
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {selectedChat.full_answer}
                    </ReactMarkdown>
                  </Box>
                </Paper>

                {/* 参照元 + メタ情報 */}
                <Box sx={{ mt: 1.5 }}>
                  {/* 参照元 */}
                  {selectedChat.references && selectedChat.references.length > 0 && (
                    <Box sx={{ mb: 1.5 }}>
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}
                      >
                        <AttachFileIcon sx={{ fontSize: 14 }} />
                        参照元:
                      </Typography>
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                        {selectedChat.references.map((ref, refIdx) => {
                          const refKey = `hist-ref-${refIdx}`;
                          const isExpanded = expandedRefs.has(refKey);
                          const hasExcerpt = !!ref.excerpt;
                          return (
                            <Box key={refIdx}>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                <Chip
                                  label={
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                      <span>{ref.title}{ref.section ? ` (${ref.section})` : ''}</span>
                                      {hasExcerpt && (isExpanded ? <ExpandLessIcon sx={{ fontSize: 14 }} /> : <ExpandMoreIcon sx={{ fontSize: 14 }} />)}
                                    </Box>
                                  }
                                  size="small"
                                  variant="outlined"
                                  onClick={hasExcerpt ? () => toggleRef(refKey) : undefined}
                                  sx={{
                                    fontSize: '0.7rem',
                                    cursor: hasExcerpt ? 'pointer' : 'default',
                                    '&:hover': hasExcerpt ? { backgroundColor: 'action.hover' } : {},
                                  }}
                                />
                                {ref.id && (
                                  <IconButton
                                    size="small"
                                    onClick={() => downloadDocument(ref.id, ref.title || 'document')}
                                    title="元ファイルをダウンロード"
                                    sx={{ p: 0.3 }}
                                  >
                                    <FileDownloadOutlinedIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                                  </IconButton>
                                )}
                              </Box>
                              {isExpanded && ref.excerpt && (
                                <Paper
                                  variant="outlined"
                                  sx={{
                                    mt: 0.5,
                                    p: 1.5,
                                    backgroundColor: 'grey.50',
                                    borderLeft: `3px solid ${WT_COLORS.primary}`,
                                    fontSize: '0.8rem',
                                  }}
                                >
                                  <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
                                    {ref.excerpt}
                                  </Typography>
                                </Paper>
                              )}
                            </Box>
                          );
                        })}
                      </Box>
                    </Box>
                  )}

                  {/* フィードバック・ステータス */}
                  <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mt: 1 }}>
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        フィードバック
                      </Typography>
                      <Box sx={{ mt: 0.5 }}>
                        {getFeedbackChip(selectedChat.feedback)}
                      </Box>
                    </Box>
                    {selectedChat.is_no_answer && (
                      <Box>
                        <Typography variant="caption" color="text.secondary">
                          ステータス
                        </Typography>
                        <Box sx={{ mt: 0.5 }}>
                          <Chip label="回答不可" color="warning" size="small" />
                        </Box>
                      </Box>
                    )}
                  </Box>
                </Box>
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setSelectedChat(null)}>閉じる</Button>
          </DialogActions>
        </Dialog>
      </Box>
    </MainLayout>
  );
}
