import axios from 'axios';
import { apiClient } from './client';

export interface Document {
  id: string;
  filename: string;
  file_type: string;
  is_public: boolean;
  category: string;
  department_ids: string[];
  department_names: string[];
  created_at: string;
  chunk_count: number;
  has_original_file: boolean;
  box_file_id?: string;
  box_sync_status?: 'synced' | 'outdated' | 'error';
  box_synced_at?: string;
}

export async function getDocuments(): Promise<Document[]> {
  return apiClient.get<Document[]>('/api/documents');
}

export async function uploadDocument(file: File): Promise<Document> {
  const formData = new FormData();
  formData.append('file', file);

  const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8300';
  const token = localStorage.getItem('tomoe_access_token');

  const response = await axios.post<Document>(`${API_BASE_URL}/api/documents/upload`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  return response.data;
}

export async function deleteDocument(documentId: string): Promise<void> {
  await apiClient.delete(`/api/documents/${documentId}`);
}

export async function downloadDocument(documentId: string, filename: string): Promise<void> {
  const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8300';
  const token = localStorage.getItem('tomoe_access_token');
  const response = await fetch(`${API_BASE_URL}/api/documents/${documentId}/download`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
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

export interface DocumentDetail extends Document {
  chunks: {
    index: number;
    content: string;
  }[];
}

export async function getDocumentDetail(documentId: string): Promise<DocumentDetail> {
  return apiClient.get<DocumentDetail>(`/api/documents/${documentId}`);
}

export interface DocumentPermissionUpdate {
  is_public: boolean;
  department_ids: string[];
}

export async function updateDocumentPermissions(
  documentId: string,
  data: DocumentPermissionUpdate
): Promise<{ id: string; is_public: boolean; department_ids: string[] }> {
  return apiClient.put(`/api/documents/${documentId}/permissions`, data);
}

// ==============================
// BOX連携API
// ==============================

export interface BoxFolder {
  id: string;
  name: string;
  type: string;
}

export interface BoxFile {
  id: string;
  name: string;
  size: number;
  modified_at: string;
  file_type: string;
  sync_status?: 'synced' | 'outdated' | 'error' | null;
}

export async function getBoxConfigured(): Promise<{ configured: boolean }> {
  return apiClient.get('/api/documents/box/configured');
}

export async function getBoxFolders(parentId: string = '0'): Promise<BoxFolder[]> {
  return apiClient.get(`/api/documents/box/folders?parent_id=${parentId}`);
}

export async function getBoxFiles(folderId: string): Promise<BoxFile[]> {
  return apiClient.get(`/api/documents/box/files/${folderId}`);
}

export interface BoxSyncResult {
  file_id: string;
  document_id: string | null;
  status: string;
  detail?: string;
}

export async function syncBoxFiles(
  fileIds: string[],
  isPublic: boolean = true,
  departmentIds: string[] = [],
): Promise<{ results: BoxSyncResult[] }> {
  return apiClient.post('/api/documents/box/sync', {
    file_ids: fileIds,
    is_public: isPublic,
    department_ids: departmentIds,
  });
}
