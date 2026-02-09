const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8300';

function getAuthHeaders(): Record<string, string> {
  const token = localStorage.getItem('tomoe_access_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export interface AdminAgentStep {
  tool: string;
  status: 'running' | 'done';
  label?: string;
  summary?: string;
}

export type AdminStreamEvent =
  | { type: 'token'; token: string }
  | { type: 'step'; step: AdminAgentStep }
  | { type: 'download'; filename: string };

export interface AdminChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export async function* streamAdminChat(
  message: string,
  conversationHistory: AdminChatMessage[] = []
): AsyncGenerator<AdminStreamEvent, void> {
  const response = await fetch(`${API_BASE_URL}/api/admin/agent/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
    },
    body: JSON.stringify({
      message,
      conversation_history: conversationHistory,
    }),
  });

  if (!response.ok) {
    throw new Error('リクエストに失敗しました');
  }

  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error('ストリームの読み取りに失敗しました');
  }

  const decoder = new TextDecoder();
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
            yield { type: 'step', step: data.step as AdminAgentStep };
          }
          if (data.token) {
            yield { type: 'token', token: data.token };
          }
          if (data.download) {
            yield { type: 'download', filename: data.download.filename };
          }
        } catch {
          // JSON parse error, skip
        }
      }
    }
  }
}

export function getDownloadUrl(filename: string): string {
  return `${API_BASE_URL}/api/admin/agent/download/${encodeURIComponent(filename)}`;
}

export async function downloadGeneratedDoc(filename: string): Promise<void> {
  const response = await fetch(getDownloadUrl(filename), {
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    throw new Error('ダウンロードに失敗しました');
  }

  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
