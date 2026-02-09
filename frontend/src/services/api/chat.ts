const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8300';

function getAuthHeaders(): Record<string, string> {
  const token = localStorage.getItem('tomoe_access_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export interface ChatReference {
  id: string;
  title: string;
  similarity?: number;
  section?: string;
  excerpt?: string;
}

export interface AgentStep {
  tool: string;
  status: 'running' | 'done';
  input?: Record<string, unknown>;
  summary?: string;
}

export type ChatStreamEvent =
  | { type: 'token'; token: string }
  | { type: 'step'; step: AgentStep };

export interface ChatStreamResult {
  chatId: string;
  references: ChatReference[];
  avgSimilarity?: number;
  followups: string[];
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export async function* streamChat(
  question: string,
  conversationHistory: ChatMessage[] = []
): AsyncGenerator<ChatStreamEvent, ChatStreamResult> {
  const response = await fetch(`${API_BASE_URL}/api/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
    },
    body: JSON.stringify({
      question,
      conversation_history: conversationHistory,
    }),
  });

  if (!response.ok) {
    throw new Error('チャットリクエストに失敗しました');
  }

  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error('ストリームの読み取りに失敗しました');
  }

  const decoder = new TextDecoder();
  let chatId = '';
  let references: ChatReference[] = [];
  let avgSimilarity: number | undefined;
  let followups: string[] = [];
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const parts = buffer.split('\n');
    buffer = parts.pop() || '';

    for (const line of parts) {
      if (line.startsWith('data: ')) {
        try {
          const data = JSON.parse(line.slice(6));
          if (data.step) {
            yield { type: 'step', step: data.step as AgentStep };
          }
          if (data.token) {
            yield { type: 'token', token: data.token };
          }
          if (data.done) {
            references = data.references || [];
            avgSimilarity = data.avg_similarity;
            followups = data.followups || [];
          }
          if (data.chat_id && !data.done) {
            chatId = data.chat_id;
          }
        } catch {
          // JSON parse error, skip
        }
      }
    }
  }

  return { chatId, references, avgSimilarity, followups };
}

export async function sendFeedback(chatId: string, feedback: 'good' | 'bad'): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/api/feedback`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
    },
    body: JSON.stringify({ chat_id: chatId, feedback }),
  });

  if (!response.ok) {
    throw new Error('フィードバックの送信に失敗しました');
  }
}

export async function fetchSuggestions(): Promise<string[]> {
  const response = await fetch(`${API_BASE_URL}/api/chat/suggestions`, {
    headers: getAuthHeaders(),
  });
  if (!response.ok) return [];
  const data = await response.json();
  return data.suggestions || [];
}
