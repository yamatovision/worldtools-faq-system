import type { FormEvent } from 'react';
import { useState, useRef, useEffect, useCallback } from 'react';
import {
  Box,
  Paper,
  TextField,
  Button,
  Typography,
  IconButton,
  CircularProgress,
  Chip,
  Collapse,
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import ThumbUpOutlinedIcon from '@mui/icons-material/ThumbUpOutlined';
import ThumbDownOutlinedIcon from '@mui/icons-material/ThumbDownOutlined';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import SearchIcon from '@mui/icons-material/Search';
import DescriptionIcon from '@mui/icons-material/Description';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import AddIcon from '@mui/icons-material/Add';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import FileDownloadOutlinedIcon from '@mui/icons-material/FileDownloadOutlined';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { MainLayout } from '@/layouts/MainLayout';
import { WT_COLORS } from '@/theme';
import {
  streamChat,
  sendFeedback,
  fetchSuggestions,
  type ChatMessage,
  type AgentStep,
  type ChatReference,
} from '@/services/api/chat';
import { downloadDocument } from '@/services/api/documents';

const TOOL_LABELS: Record<string, { running: string; icon: typeof SearchIcon }> = {
  search_knowledge: { running: 'ナレッジベースを検索中...', icon: SearchIcon },
  get_document_detail: { running: 'ドキュメントを詳細確認中...', icon: DescriptionIcon },
  list_documents: { running: 'ドキュメント一覧を取得中...', icon: DescriptionIcon },
};

interface Message {
  id: string;
  chatId?: string;
  type: 'user' | 'ai';
  content: string;
  timestamp: Date;
  references?: ChatReference[];
  avgSimilarity?: number;
  feedback?: 'good' | 'bad' | null;
  steps?: AgentStep[];
  followups?: string[];
}

export function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [expandedRefs, setExpandedRefs] = useState<Set<string>>(new Set());
  const [showUserMessages, setShowUserMessages] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchSuggestions().then(setSuggestions);
  }, []);

  const toggleRef = (key: string) => {
    setExpandedRefs((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleNewConversation = () => {
    setMessages([]);
    setExpandedRefs(new Set());
    setInput('');
  };

  const submitQuestion = useCallback(async (question: string) => {
    if (!question.trim() || isLoading) return;

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      type: 'user',
      content: question.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    const aiMessageId = `ai-${Date.now()}`;
    setMessages((prev) => [
      ...prev,
      {
        id: aiMessageId,
        type: 'ai',
        content: '',
        timestamp: new Date(),
        feedback: null,
        steps: [],
      },
    ]);

    try {
      const conversationHistory: ChatMessage[] = messages
        .filter((msg) => msg.content)
        .slice(-10)
        .map((msg) => ({
          role: msg.type === 'user' ? 'user' : 'assistant',
          content: msg.content,
        }));

      const generator = streamChat(question.trim(), conversationHistory);
      let result = await generator.next();

      while (!result.done) {
        const event = result.value;
        if (event.type === 'token') {
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === aiMessageId ? { ...msg, content: msg.content + event.token } : msg
            )
          );
        } else if (event.type === 'step') {
          setMessages((prev) =>
            prev.map((msg) => {
              if (msg.id !== aiMessageId) return msg;
              const steps = [...(msg.steps || [])];
              if (event.step.status === 'running') {
                steps.push(event.step);
              } else {
                const idx = steps.findLastIndex(
                  (s: AgentStep) => s.tool === event.step.tool && s.status === 'running'
                );
                if (idx >= 0) {
                  steps[idx] = event.step;
                } else {
                  steps.push(event.step);
                }
              }
              return { ...msg, steps };
            })
          );
        }
        result = await generator.next();
      }

      const { chatId, references, avgSimilarity, followups } = result.value;
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === aiMessageId ? { ...msg, chatId, references, avgSimilarity, followups } : msg
        )
      );
    } catch (error) {
      console.error('Chat error:', error);
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === aiMessageId
            ? { ...msg, content: 'エラーが発生しました。しばらくしてからもう一度お試しください。' }
            : msg
        )
      );
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, messages]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    await submitQuestion(input);
  };

  const handleFeedback = async (messageId: string, chatId: string | undefined, feedback: 'good' | 'bad') => {
    if (!chatId) return;
    setMessages((prev) =>
      prev.map((msg) => (msg.id === messageId ? { ...msg, feedback } : msg))
    );
    try {
      await sendFeedback(chatId, feedback);
    } catch (error) {
      console.error('Feedback error:', error);
    }
  };

  const hasMessages = messages.length > 0;

  return (
    <MainLayout>
      <Box sx={{ height: 'calc(100vh - 120px)', display: 'flex', flexDirection: 'column' }}>
        {/* ヘッダー */}
        <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 600 }}>
              AIに質問する
            </Typography>
            <Typography variant="body2" color="text.secondary">
              社内マニュアル・規定に基づいて回答します
            </Typography>
          </Box>
          {hasMessages && (
            <Button
              variant="outlined"
              startIcon={<AddIcon />}
              onClick={handleNewConversation}
              size="small"
              sx={{ borderRadius: 2 }}
            >
              新しい質問
            </Button>
          )}
        </Box>

        {/* メインコンテンツ */}
        <Paper
          sx={{
            flex: 1,
            overflow: 'auto',
            p: 3,
            mb: 2,
            backgroundColor: 'background.default',
          }}
        >
          {!hasMessages ? (
            /* 空状態: サジェスト質問 */
            <Box
              sx={{
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <SmartToyIcon sx={{ fontSize: 64, mb: 2, color: WT_COLORS.primary, opacity: 0.6 }} />
              <Typography variant="h6" sx={{ mb: 1, color: 'text.primary' }}>
                何をお調べしますか？
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                社内規定や制度について、AIがお答えします
              </Typography>
              {suggestions.length > 0 && (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, justifyContent: 'center', maxWidth: 600 }}>
                  {suggestions.map((q, i) => (
                    <Chip
                      key={i}
                      label={q}
                      onClick={() => submitQuestion(q)}
                      variant="outlined"
                      sx={{
                        cursor: 'pointer',
                        borderRadius: 2,
                        py: 2,
                        px: 1,
                        fontSize: '0.85rem',
                        '&:hover': { backgroundColor: `${WT_COLORS.primary}14`, borderColor: WT_COLORS.primary },
                      }}
                    />
                  ))}
                </Box>
              )}
            </Box>
          ) : (
            /* 回答表示エリア */
            <Box sx={{ maxWidth: 800, mx: 'auto' }}>
              {/* ユーザーメッセージ表示トグル */}
              {messages.some((m) => m.type === 'user') && (
                <Box sx={{ mb: 2, display: 'flex', justifyContent: 'flex-end' }}>
                  <Chip
                    label={showUserMessages ? '質問を非表示' : '質問を表示'}
                    size="small"
                    variant="outlined"
                    icon={showUserMessages ? <ExpandLessIcon /> : <KeyboardArrowDownIcon />}
                    onClick={() => setShowUserMessages(!showUserMessages)}
                    sx={{ fontSize: '0.75rem' }}
                  />
                </Box>
              )}

              {messages.map((message, msgIdx) => {
                if (message.type === 'user') {
                  return (
                    <Collapse key={message.id} in={showUserMessages}>
                      <Box
                        data-testid="user-message"
                        sx={{
                          mb: 2,
                          p: 1.5,
                          backgroundColor: `${WT_COLORS.primary}0a`,
                          borderRadius: 2,
                          borderLeft: `3px solid ${WT_COLORS.primary}`,
                        }}
                      >
                        <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.8rem' }}>
                          {message.content}
                        </Typography>
                      </Box>
                    </Collapse>
                  );
                }

                // AI メッセージ
                const isLast = msgIdx === messages.length - 1 || msgIdx === messages.length - 2;
                const isCurrentlyLoading = isLoading && message.id === messages[messages.length - 1]?.id;

                return (
                  <Box key={message.id} sx={{ mb: 4 }}>
                    {/* 質問ラベル（非表示時のみ） */}
                    {!showUserMessages && msgIdx > 0 && messages[msgIdx - 1]?.type === 'user' && (
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{ display: 'block', mb: 1, fontStyle: 'italic' }}
                      >
                        Q: {messages[msgIdx - 1].content}
                      </Typography>
                    )}

                    {/* ステップインジケータ */}
                    {message.steps && message.steps.length > 0 && (
                      <Box sx={{ mb: 1.5, display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                        {message.steps.map((step, idx) => {
                          const label = TOOL_LABELS[step.tool];
                          const StepIcon = label?.icon || SearchIcon;
                          const isDone = step.status === 'done';
                          return (
                            <Box
                              key={idx}
                              sx={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 0.5,
                                color: isDone ? 'success.main' : 'text.secondary',
                                fontSize: '0.75rem',
                              }}
                            >
                              {isDone ? (
                                <CheckCircleOutlineIcon sx={{ fontSize: 16 }} />
                              ) : (
                                <StepIcon sx={{ fontSize: 16, animation: 'pulse 1.5s infinite' }} />
                              )}
                              <Typography variant="caption" sx={{ color: 'inherit' }}>
                                {isDone ? (step.summary || '完了') : (label?.running || `${step.tool} 実行中...`)}
                              </Typography>
                            </Box>
                          );
                        })}
                      </Box>
                    )}

                    {/* AI回答本体（Markdown） */}
                    <Paper
                      data-testid="ai-message"
                      elevation={0}
                      sx={{
                        p: 3,
                        backgroundColor: 'white',
                        borderRadius: 2,
                        border: `1px solid ${WT_COLORS.border}`,
                      }}
                    >
                      {message.content ? (
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
                            {message.content}
                          </ReactMarkdown>
                        </Box>
                      ) : isCurrentlyLoading ? (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                          <CircularProgress size={20} />
                          <Typography variant="body2" color="text.secondary">
                            回答を生成中...
                          </Typography>
                        </Box>
                      ) : null}
                    </Paper>

                    {/* 回答完了後の追加情報 */}
                    {message.content && !isCurrentlyLoading && (
                      <Box sx={{ mt: 1.5 }}>
                        {/* 参照元 */}
                        {message.references && message.references.length > 0 && (
                          <Box sx={{ mb: 1.5 }}>
                            <Typography
                              variant="caption"
                              color="text.secondary"
                              sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}
                            >
                              <AttachFileIcon sx={{ fontSize: 14 }} />
                              参照元:
                              {message.avgSimilarity !== undefined && message.avgSimilarity > 0 && (
                                <Chip
                                  label={`類似度 ${Math.round(message.avgSimilarity * 100)}%`}
                                  size="small"
                                  color={message.avgSimilarity >= 0.7 ? 'success' : message.avgSimilarity >= 0.5 ? 'warning' : 'error'}
                                  sx={{ ml: 1, height: 18, fontSize: '0.65rem' }}
                                />
                              )}
                            </Typography>
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                              {message.references.map((ref, refIdx) => {
                                const refKey = `${message.id}-ref-${refIdx}`;
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

                        {/* フィードバック + フォローアップ */}
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography variant="caption" color="text.secondary">
                              この回答は役に立ちましたか？
                            </Typography>
                            <IconButton
                              size="small"
                              onClick={() => handleFeedback(message.id, message.chatId, 'good')}
                              color={message.feedback === 'good' ? 'success' : 'default'}
                            >
                              <ThumbUpOutlinedIcon fontSize="small" />
                            </IconButton>
                            <IconButton
                              size="small"
                              onClick={() => handleFeedback(message.id, message.chatId, 'bad')}
                              color={message.feedback === 'bad' ? 'error' : 'default'}
                            >
                              <ThumbDownOutlinedIcon fontSize="small" />
                            </IconButton>
                          </Box>
                        </Box>

                        {/* フォローアップ質問 */}
                        {message.followups && message.followups.length > 0 && isLast && !isLoading && (
                          <Box sx={{ mt: 2, display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                            <Typography variant="caption" color="text.secondary" sx={{ width: '100%', mb: 0.5 }}>
                              関連する質問:
                            </Typography>
                            {message.followups.map((q, i) => (
                              <Chip
                                key={i}
                                label={q}
                                onClick={() => submitQuestion(q)}
                                variant="outlined"
                                size="small"
                                sx={{
                                  cursor: 'pointer',
                                  borderRadius: 2,
                                  fontSize: '0.8rem',
                                  '&:hover': {
                                    backgroundColor: `${WT_COLORS.primary}14`,
                                    borderColor: WT_COLORS.primary,
                                  },
                                }}
                              />
                            ))}
                          </Box>
                        )}
                      </Box>
                    )}
                  </Box>
                );
              })}
              <div ref={messagesEndRef} />
            </Box>
          )}
        </Paper>

        {/* 入力エリア */}
        <Paper
          component="form"
          onSubmit={handleSubmit}
          sx={{
            p: 2,
            display: 'flex',
            alignItems: 'center',
            gap: 2,
          }}
        >
          <TextField
            fullWidth
            placeholder="質問を入力してください..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
                e.preventDefault();
                if (input.trim() && !isLoading) {
                  submitQuestion(input);
                }
              }
            }}
            disabled={isLoading}
            multiline
            maxRows={4}
            sx={{ flex: 1 }}
          />
          <Button
            type="submit"
            variant="contained"
            disabled={!input.trim() || isLoading}
            sx={{ minWidth: 100 }}
            endIcon={<SendIcon />}
          >
            送信
          </Button>
        </Paper>
      </Box>
    </MainLayout>
  );
}
