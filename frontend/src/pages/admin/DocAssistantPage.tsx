import type { FormEvent } from 'react';
import { useState, useRef, useEffect, useCallback } from 'react';
import {
  Box,
  Paper,
  TextField,
  Button,
  Typography,
  CircularProgress,
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import SearchIcon from '@mui/icons-material/Search';
import DescriptionIcon from '@mui/icons-material/Description';
import AssessmentIcon from '@mui/icons-material/Assessment';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import DownloadIcon from '@mui/icons-material/Download';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { MainLayout } from '@/layouts/MainLayout';
import { WT_COLORS } from '@/theme';
import {
  streamAdminChat,
  downloadGeneratedDoc,
  type AdminAgentStep,
  type AdminChatMessage,
} from '@/services/api/adminChat';

const TOOL_LABELS: Record<string, { running: string; icon: typeof SearchIcon }> = {
  get_quality_issues: { running: '品質データ取得中...', icon: AssessmentIcon },
  get_existing_documents: { running: 'ドキュメント一覧取得中...', icon: DescriptionIcon },
  get_document_content: { running: 'ドキュメント内容確認中...', icon: DescriptionIcon },
  generate_document: { running: 'Word文書生成中...', icon: DescriptionIcon },
};

interface Message {
  id: string;
  type: 'user' | 'ai';
  content: string;
  timestamp: Date;
  steps?: AdminAgentStep[];
  downloads?: string[];
}

export function DocAssistantPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const submitMessage = useCallback(async (text: string) => {
    if (!text.trim() || isLoading) return;

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      type: 'user',
      content: text.trim(),
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
        steps: [],
        downloads: [],
      },
    ]);

    try {
      const conversationHistory: AdminChatMessage[] = messages
        .filter((msg) => msg.content)
        .slice(-20)
        .map((msg) => ({
          role: msg.type === 'user' ? 'user' as const : 'assistant' as const,
          content: msg.content,
        }));

      const generator = streamAdminChat(text.trim(), conversationHistory);

      for await (const event of generator) {
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
                  (s: AdminAgentStep) => s.tool === event.step.tool && s.status === 'running'
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
        } else if (event.type === 'download') {
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === aiMessageId
                ? { ...msg, downloads: [...(msg.downloads || []), event.filename] }
                : msg
            )
          );
        }
      }
    } catch (error) {
      console.error('Admin agent error:', error);
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
    await submitMessage(input);
  };

  const handleDownload = async (filename: string) => {
    try {
      await downloadGeneratedDoc(filename);
    } catch (error) {
      console.error('Download error:', error);
    }
  };

  const hasMessages = messages.length > 0;

  return (
    <MainLayout>
      <Box sx={{ height: 'calc(100vh - 120px)', display: 'flex', flexDirection: 'column' }}>
        {/* ヘッダー */}
        <Box sx={{ mb: 2 }}>
          <Typography variant="h5" sx={{ fontWeight: 600 }}>
            ドキュメント提案
          </Typography>
          <Typography variant="body2" color="text.secondary">
            回答品質データを分析し、不足ドキュメントの提案・生成を行います
          </Typography>
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
                ナレッジ品質改善アシスタント
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3, textAlign: 'center', maxWidth: 500 }}>
                回答品質データを分析して、不足しているドキュメントを特定し、新しいドキュメントの作成を支援します
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, justifyContent: 'center', maxWidth: 600 }}>
                {[
                  '回答できなかった質問を分析して',
                  '低評価の回答の傾向を教えて',
                  '不足しているドキュメントを提案して',
                ].map((q, i) => (
                  <Button
                    key={i}
                    variant="outlined"
                    size="small"
                    onClick={() => submitMessage(q)}
                    sx={{
                      borderRadius: 2,
                      textTransform: 'none',
                      '&:hover': { backgroundColor: `${WT_COLORS.primary}14` },
                    }}
                  >
                    {q}
                  </Button>
                ))}
              </Box>
            </Box>
          ) : (
            <Box sx={{ maxWidth: 800, mx: 'auto' }}>
              {messages.map((message) => {
                if (message.type === 'user') {
                  return (
                    <Box
                      key={message.id}
                      sx={{
                        mb: 2,
                        p: 1.5,
                        backgroundColor: `${WT_COLORS.primary}0a`,
                        borderRadius: 2,
                        borderLeft: `3px solid ${WT_COLORS.primary}`,
                      }}
                    >
                      <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.85rem' }}>
                        {message.content}
                      </Typography>
                    </Box>
                  );
                }

                const isCurrentlyLoading = isLoading && message.id === messages[messages.length - 1]?.id;

                return (
                  <Box key={message.id} sx={{ mb: 4 }}>
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

                    {/* AI回答本体 */}
                    <Paper
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
                            分析中...
                          </Typography>
                        </Box>
                      ) : null}
                    </Paper>

                    {/* ダウンロードボタン */}
                    {message.downloads && message.downloads.length > 0 && (
                      <Box sx={{ mt: 1.5, display: 'flex', flexDirection: 'column', gap: 1 }}>
                        {message.downloads.map((filename, idx) => (
                          <Button
                            key={idx}
                            variant="outlined"
                            startIcon={<DownloadIcon />}
                            onClick={() => handleDownload(filename)}
                            sx={{ alignSelf: 'flex-start', borderRadius: 2, textTransform: 'none' }}
                          >
                            {filename}
                          </Button>
                        ))}
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
            placeholder="品質分析やドキュメント作成について指示してください..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
                e.preventDefault();
                if (input.trim() && !isLoading) {
                  submitMessage(input);
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
