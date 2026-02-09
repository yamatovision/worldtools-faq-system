import { useState } from 'react';
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
  TextField,
  InputAdornment,
  ToggleButton,
  ToggleButtonGroup,
  CircularProgress,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import VisibilityIcon from '@mui/icons-material/Visibility';
import ThumbUpIcon from '@mui/icons-material/ThumbUp';
import ThumbDownIcon from '@mui/icons-material/ThumbDown';
import WarningIcon from '@mui/icons-material/Warning';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useQuery } from '@tanstack/react-query';
import { MainLayout } from '@/layouts/MainLayout';
import { WT_COLORS } from '@/theme';
import { getChatHistory, type ChatHistoryItem } from '@/services/api/stats';

type FilterType = 'evaluated' | 'all' | 'good' | 'bad' | 'no_answer' | 'none';

export function QualityPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<FilterType>('evaluated');
  const [days, setDays] = useState<number>(30);
  const [selectedChat, setSelectedChat] = useState<ChatHistoryItem | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [expandedRefs, setExpandedRefs] = useState<Set<string>>(new Set());

  const { data, isLoading, error } = useQuery({
    queryKey: ['chat-history', filter, days],
    queryFn: () => getChatHistory({
      limit: 100,
      feedback: filter === 'good' || filter === 'bad' || filter === 'none' ? filter : undefined,
      noAnswerOnly: filter === 'no_answer',
      days: days || undefined,
      filterMode: filter === 'evaluated' ? 'evaluated' : undefined,
    }),
  });

  const filteredData = (data?.items || []).filter((item) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      item.question.toLowerCase().includes(query) ||
      item.answer.toLowerCase().includes(query)
    );
  });

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleString('ja-JP', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const toggleRef = (key: string) => {
    setExpandedRefs((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const handleViewDetail = (chat: ChatHistoryItem) => {
    setSelectedChat(chat);
    setDetailOpen(true);
    setExpandedRefs(new Set());
  };

  return (
    <MainLayout>
      <Box>
        <Typography variant="h5" sx={{ fontWeight: 600, mb: 0.5 }}>
          回答品質確認
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          AIの回答品質を確認し、改善に役立てます
        </Typography>

        {/* フィルター */}
        <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap', alignItems: 'center' }}>
          <TextField
            placeholder="質問・回答を検索..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            sx={{ width: 300 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon color="action" />
                </InputAdornment>
              ),
            }}
          />
          <ToggleButtonGroup
            value={filter}
            exclusive
            onChange={(_, value) => value && setFilter(value)}
            size="small"
          >
            <ToggleButton value="evaluated">要確認</ToggleButton>
            <ToggleButton value="all">すべて</ToggleButton>
            <ToggleButton value="good">
              <ThumbUpIcon fontSize="small" sx={{ mr: 0.5 }} />
              良い
            </ToggleButton>
            <ToggleButton value="bad">
              <ThumbDownIcon fontSize="small" sx={{ mr: 0.5 }} />
              悪い
            </ToggleButton>
            <ToggleButton value="no_answer">
              <WarningIcon fontSize="small" sx={{ mr: 0.5 }} />
              回答失敗
            </ToggleButton>
            <ToggleButton value="none">未評価</ToggleButton>
          </ToggleButtonGroup>
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>期間</InputLabel>
            <Select
              value={days}
              label="期間"
              onChange={(e) => setDays(e.target.value as number)}
            >
              <MenuItem value={7}>7日間</MenuItem>
              <MenuItem value={14}>14日間</MenuItem>
              <MenuItem value={30}>30日間</MenuItem>
              <MenuItem value={0}>全期間</MenuItem>
            </Select>
          </FormControl>
        </Box>

        {/* テーブル */}
        {isLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        ) : error ? (
          <Alert severity="error">データの読み込みに失敗しました</Alert>
        ) : filteredData.length === 0 ? (
          <Paper sx={{ p: 4, textAlign: 'center' }}>
            <Typography color="text.secondary">
              {searchQuery ? '検索結果がありません' : 'データがありません'}
            </Typography>
          </Paper>
        ) : (
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>質問</TableCell>
                  <TableCell>評価</TableCell>
                  <TableCell>日時</TableCell>
                  <TableCell align="right">詳細</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredData.map((item) => (
                  <TableRow key={item.id} hover>
                    <TableCell sx={{ maxWidth: 400 }}>
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        {item.question}
                      </Typography>
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{
                          display: 'block',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {item.answer}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      {item.is_no_answer && (
                        <Chip
                          icon={<WarningIcon />}
                          label="回答失敗"
                          size="small"
                          color="error"
                          variant="outlined"
                          sx={{ mr: 0.5 }}
                        />
                      )}
                      {item.feedback === 'good' && (
                        <Chip
                          icon={<ThumbUpIcon />}
                          label="良い"
                          size="small"
                          color="success"
                          variant="outlined"
                        />
                      )}
                      {item.feedback === 'bad' && (
                        <Chip
                          icon={<ThumbDownIcon />}
                          label="悪い"
                          size="small"
                          color="error"
                          variant="outlined"
                        />
                      )}
                      {item.feedback === null && !item.is_no_answer && (
                        <Chip label="未評価" size="small" variant="outlined" />
                      )}
                    </TableCell>
                    <TableCell>{formatDate(item.created_at)}</TableCell>
                    <TableCell align="right">
                      <IconButton
                        size="small"
                        title="詳細を見る"
                        onClick={() => handleViewDetail(item)}
                      >
                        <VisibilityIcon fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Box>

      {/* 詳細ダイアログ */}
      <Dialog
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle sx={{ pb: 1 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">回答詳細</Typography>
            <Typography variant="caption" color="text.secondary">
              {selectedChat?.created_at
                ? new Date(selectedChat.created_at).toLocaleString('ja-JP')
                : ''}
            </Typography>
          </Box>
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
                        const refKey = `qual-ref-${refIdx}`;
                        const isExpanded = expandedRefs.has(refKey);
                        const hasExcerpt = !!ref.excerpt;
                        return (
                          <Box key={refIdx}>
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
                      ユーザー評価
                    </Typography>
                    <Box sx={{ mt: 0.5 }}>
                      {selectedChat.feedback === 'good' && (
                        <Chip icon={<ThumbUpIcon />} label="良い" color="success" size="small" />
                      )}
                      {selectedChat.feedback === 'bad' && (
                        <Chip icon={<ThumbDownIcon />} label="悪い" color="error" size="small" />
                      )}
                      {selectedChat.feedback === null && (
                        <Chip label="未評価" variant="outlined" size="small" />
                      )}
                    </Box>
                  </Box>
                  {selectedChat.is_no_answer && (
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        ステータス
                      </Typography>
                      <Box sx={{ mt: 0.5 }}>
                        <Chip
                          icon={<WarningIcon />}
                          label="回答失敗"
                          color="error"
                          size="small"
                        />
                      </Box>
                    </Box>
                  )}
                </Box>
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailOpen(false)}>閉じる</Button>
        </DialogActions>
      </Dialog>
    </MainLayout>
  );
}
