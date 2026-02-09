import type { ReactNode } from 'react';
import { createContext, useCallback, useState, useMemo } from 'react';
import type { AuthState } from '@/types';
import { authService } from '@/services/api/auth';

interface AuthContextType extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  signup: (companyName: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

// eslint-disable-next-line react-refresh/only-export-components
export const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [state, setState] = useState<AuthState>(() => {
    // 初期化時に認証状態を同期的にチェック
    const user = authService.getCurrentUser();
    const organization = authService.getCurrentOrganization();
    const isAuthenticated = authService.isAuthenticated();
    return {
      user,
      organization,
      isAuthenticated,
      isLoading: false,
      error: null,
    };
  });

  const login = useCallback(async (email: string, password: string) => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));
    try {
      const response = await authService.login(email, password);
      setState({
        user: response.user,
        organization: response.organization,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'ログインに失敗しました';
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: errorMessage,
      }));
      throw error;
    }
  }, []);

  const signup = useCallback(async (companyName: string, email: string, password: string) => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));
    try {
      const response = await authService.signup(companyName, email, password);
      setState({
        user: response.user,
        organization: response.organization,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '登録に失敗しました';
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: errorMessage,
      }));
      throw error;
    }
  }, []);

  const logout = useCallback(async () => {
    setState((prev) => ({ ...prev, isLoading: true }));
    try {
      await authService.logout();
      setState({
        user: null,
        organization: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
      });
    } catch {
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: 'ログアウトに失敗しました',
      }));
    }
  }, []);

  const value: AuthContextType = useMemo(() => ({
    ...state,
    login,
    signup,
    logout,
  }), [state, login, signup, logout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
