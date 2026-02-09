import axios from 'axios';
import type { User, Organization, AuthResponse } from '@/types';
import { apiClient } from './client';

// トークン保存キー
const ACCESS_TOKEN_KEY = 'tomoe_access_token';
const USER_KEY = 'tomoe_user';
const ORG_KEY = 'tomoe_organization';

interface LoginApiResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  user: {
    id: string;
    email: string;
    name: string;
    departmentId: string | null;
    departmentName: string | null;
    role: string;
    organizationId: string;
    organizationName: string | null;
  };
  organization: {
    id: string;
    name: string;
    slug: string;
    plan: string;
    trialEndsAt: string | null;
    isActive: boolean;
  };
}

function parseUser(raw: LoginApiResponse['user']): User {
  return {
    id: raw.id,
    email: raw.email,
    name: raw.name,
    departmentId: raw.departmentId || undefined,
    departmentName: raw.departmentName || undefined,
    role: raw.role as 'admin' | 'user',
    organizationId: raw.organizationId,
    organizationName: raw.organizationName || undefined,
  };
}

function parseOrganization(raw: LoginApiResponse['organization']): Organization {
  return {
    id: raw.id,
    name: raw.name,
    slug: raw.slug,
    plan: raw.plan as Organization['plan'],
    trialEndsAt: raw.trialEndsAt,
    isActive: raw.isActive,
  };
}

function saveAuth(token: string, user: User, org: Organization): void {
  localStorage.setItem(ACCESS_TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
  localStorage.setItem(ORG_KEY, JSON.stringify(org));
}

// 認証サービス
export const authService = {
  /**
   * ログイン
   */
  async login(email: string, password: string): Promise<AuthResponse> {
    let response: LoginApiResponse;
    try {
      response = await apiClient.post<LoginApiResponse>('/api/auth/login', { email, password });
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.data?.detail) {
        throw new Error(error.response.data.detail);
      }
      throw error;
    }

    const user = parseUser(response.user);
    const organization = parseOrganization(response.organization);

    const authResponse: AuthResponse = {
      user,
      organization,
      accessToken: response.access_token,
      expiresIn: response.expires_in,
    };

    saveAuth(authResponse.accessToken, user, organization);
    return authResponse;
  },

  /**
   * セルフサービス登録
   */
  async signup(companyName: string, email: string, password: string): Promise<AuthResponse> {
    let response: LoginApiResponse;
    try {
      response = await apiClient.post<LoginApiResponse>('/api/auth/signup', {
        company_name: companyName,
        email,
        password,
      });
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.data?.detail) {
        throw new Error(error.response.data.detail);
      }
      throw error;
    }

    const user = parseUser(response.user);
    const organization = parseOrganization(response.organization);

    const authResponse: AuthResponse = {
      user,
      organization,
      accessToken: response.access_token,
      expiresIn: response.expires_in,
    };

    saveAuth(authResponse.accessToken, user, organization);
    return authResponse;
  },

  /**
   * Okta認可URLを取得
   */
  async getOktaAuthorizeUrl(): Promise<string> {
    const resp = await apiClient.get<{ authorize_url: string }>('/api/auth/okta/authorize');
    return resp.authorize_url;
  },

  /**
   * Oktaコールバック（code交換→JWT取得）
   */
  async oktaCallback(code: string, state: string): Promise<AuthResponse> {
    let response: LoginApiResponse;
    try {
      response = await apiClient.post<LoginApiResponse>('/api/auth/okta/callback', { code, state });
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.data?.detail) {
        throw new Error(error.response.data.detail);
      }
      throw error;
    }

    const user = parseUser(response.user);
    const organization = parseOrganization(response.organization);

    const authResponse: AuthResponse = {
      user,
      organization,
      accessToken: response.access_token,
      expiresIn: response.expires_in,
    };

    saveAuth(authResponse.accessToken, user, organization);
    return authResponse;
  },

  /**
   * ログアウト
   */
  async logout(): Promise<void> {
    try {
      await apiClient.post('/api/auth/logout', {});
    } catch {
      // サーバー側のログアウトが失敗してもローカルはクリア
    }
    this.clearAuth();
  },

  /**
   * 現在のユーザーを取得（ローカルストレージから）
   */
  getCurrentUser(): User | null {
    const userJson = localStorage.getItem(USER_KEY);
    if (!userJson) return null;
    try {
      return JSON.parse(userJson) as User;
    } catch {
      return null;
    }
  },

  /**
   * 現在の組織を取得（ローカルストレージから）
   */
  getCurrentOrganization(): Organization | null {
    const orgJson = localStorage.getItem(ORG_KEY);
    if (!orgJson) return null;
    try {
      return JSON.parse(orgJson) as Organization;
    } catch {
      return null;
    }
  },

  /**
   * サーバーから現在のユーザー情報を取得
   */
  async fetchCurrentUser(): Promise<User | null> {
    const token = this.getAccessToken();
    if (!token) return null;

    try {
      const response = await apiClient.get<{
        id: string;
        email: string;
        name: string;
        department_id: string | null;
        department_name: string | null;
        role: string;
        organization_id: string;
        organization_name: string | null;
      }>('/api/auth/me');

      const user: User = {
        id: response.id,
        email: response.email,
        name: response.name,
        departmentId: response.department_id || undefined,
        departmentName: response.department_name || undefined,
        role: response.role as 'admin' | 'user',
        organizationId: response.organization_id,
        organizationName: response.organization_name || undefined,
      };

      localStorage.setItem(USER_KEY, JSON.stringify(user));
      return user;
    } catch {
      // トークンが無効な場合はクリア
      this.clearAuth();
      return null;
    }
  },

  /**
   * アクセストークンを取得
   */
  getAccessToken(): string | null {
    return localStorage.getItem(ACCESS_TOKEN_KEY);
  },

  /**
   * 認証状態を確認
   */
  isAuthenticated(): boolean {
    return !!this.getAccessToken() && !!this.getCurrentUser();
  },

  /**
   * 認証情報をクリア
   */
  clearAuth(): void {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem(ORG_KEY);
  },
};
