import { apiClient } from './client';

// ==================== ユーザー管理 ====================

export interface AdminUser {
  id: string;
  email: string;
  name: string;
  departmentId: string | null;
  departmentName: string | null;
  role: string;
  isActive: boolean;
  createdAt: string | null;
  questionCount: number;
  lastUsedAt: string | null;
}

export interface CreateUserRequest {
  email: string;
  password: string;
  name: string;
  department_id?: string;
  role?: string;
}

export interface UpdateUserRequest {
  email?: string;
  name?: string;
  department_id?: string;
  role?: string;
  is_active?: boolean;
  password?: string;
}

export const adminUserService = {
  async list(): Promise<AdminUser[]> {
    return apiClient.get<AdminUser[]>('/api/admin/users');
  },

  async create(data: CreateUserRequest): Promise<AdminUser> {
    return apiClient.post<AdminUser>('/api/admin/users', data);
  },

  async update(userId: string, data: UpdateUserRequest): Promise<{ success: boolean }> {
    return apiClient.put<{ success: boolean }>(`/api/admin/users/${userId}`, data);
  },

  async delete(userId: string): Promise<{ success: boolean }> {
    return apiClient.delete<{ success: boolean }>(`/api/admin/users/${userId}`);
  },
};

// ==================== 部門管理 ====================

export interface AdminDepartment {
  id: string;
  name: string;
  description: string | null;
  userCount: number;
  documentCount: number;
}

export interface CreateDepartmentRequest {
  name: string;
  description?: string;
}

export interface UpdateDepartmentRequest {
  name?: string;
  description?: string;
}

export const adminDepartmentService = {
  async list(): Promise<AdminDepartment[]> {
    return apiClient.get<AdminDepartment[]>('/api/admin/departments');
  },

  async create(data: CreateDepartmentRequest): Promise<AdminDepartment> {
    return apiClient.post<AdminDepartment>('/api/admin/departments', data);
  },

  async update(deptId: string, data: UpdateDepartmentRequest): Promise<{ success: boolean }> {
    return apiClient.put<{ success: boolean }>(`/api/admin/departments/${deptId}`, data);
  },

  async delete(deptId: string): Promise<{ success: boolean }> {
    return apiClient.delete<{ success: boolean }>(`/api/admin/departments/${deptId}`);
  },
};

// ==================== システム設定 ====================

export interface SystemSettings {
  companyName: string | null;
  // Okta SSO
  oktaDomain: string | null;
  oktaClientId: string | null;
  oktaClientSecret: string | null;
  // BOX連携
  boxClientId: string | null;
  boxClientSecret: string | null;
  boxEnterpriseId: string | null;
  boxJwtKeyId: string | null;
  boxPrivateKey: string | null;
  boxPrivateKeyPassphrase: string | null;
  boxWatchedFolderId: string | null;
  boxPollEnabled: boolean | null;
}

export interface UpdateSettingsRequest {
  company_name?: string;
  // Okta SSO
  okta_domain?: string;
  okta_client_id?: string;
  okta_client_secret?: string;
  // BOX連携
  box_client_id?: string;
  box_client_secret?: string;
  box_enterprise_id?: string;
  box_jwt_key_id?: string;
  box_private_key?: string;
  box_private_key_passphrase?: string;
  box_watched_folder_id?: string;
  box_poll_enabled?: boolean;
}

export const adminSettingsService = {
  async get(): Promise<SystemSettings> {
    return apiClient.get<SystemSettings>('/api/admin/settings');
  },

  async update(data: UpdateSettingsRequest): Promise<{ success: boolean }> {
    return apiClient.put<{ success: boolean }>('/api/admin/settings', data);
  },
};

// ==================== BOX接続テスト・ポーリング ====================

export const adminBoxService = {
  async testConnection(): Promise<{ success: boolean; message: string }> {
    return apiClient.post<{ success: boolean; message: string }>('/api/admin/settings/box/test', {});
  },

  async pollNow(): Promise<{ checked: number; outdated: number; errors: number }> {
    return apiClient.post<{ checked: number; outdated: number; errors: number }>('/api/admin/settings/box/poll-now', {});
  },
};
