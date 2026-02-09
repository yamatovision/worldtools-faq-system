import type { DashboardData } from '@/types';
import { apiClient } from './client';

export interface ChatHistoryReference {
  id: string;
  title: string;
  section?: string;
  excerpt?: string;
}

export interface ChatHistoryItem {
  id: string;
  question: string;
  answer: string;
  full_answer: string;
  is_no_answer: boolean;
  feedback: 'good' | 'bad' | null;
  references: ChatHistoryReference[];
  created_at: string | null;
}

export interface ChatHistoryResponse {
  total: number;
  items: ChatHistoryItem[];
}

export async function getChatHistory(params: {
  limit?: number;
  offset?: number;
  feedback?: 'good' | 'bad' | 'none';
  noAnswerOnly?: boolean;
  days?: number;
  filterMode?: 'evaluated';
}): Promise<ChatHistoryResponse> {
  const searchParams = new URLSearchParams();
  if (params.limit) searchParams.append('limit', params.limit.toString());
  if (params.offset) searchParams.append('offset', params.offset.toString());
  if (params.feedback) searchParams.append('feedback', params.feedback);
  if (params.noAnswerOnly) searchParams.append('no_answer_only', 'true');
  if (params.days) searchParams.append('days', params.days.toString());
  if (params.filterMode) searchParams.append('filter_mode', params.filterMode);

  return apiClient.get<ChatHistoryResponse>(`/api/stats/chat-history?${searchParams}`);
}

export async function getDashboardData(): Promise<DashboardData> {
  return apiClient.get<DashboardData>('/api/stats/admin/dashboard');
}
