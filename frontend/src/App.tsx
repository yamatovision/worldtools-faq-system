import { Component, type ReactNode } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, CssBaseline, Box, Typography, Button } from '@mui/material';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { theme } from '@/theme';
import { AuthProvider } from '@/contexts/AuthContext';
import { ProtectedRoute, PublicOnlyRoute } from '@/components/ProtectedRoute';

class ErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('ErrorBoundary caught:', error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', gap: 2 }}>
          <Typography variant="h5">予期しないエラーが発生しました</Typography>
          <Typography color="text.secondary">ページを再読み込みしてください</Typography>
          <Button variant="contained" onClick={() => { this.setState({ hasError: false }); window.location.href = '/'; }}>
            ホームに戻る
          </Button>
        </Box>
      );
    }
    return this.props.children;
  }
}

// Pages
import { LandingPage } from '@/pages/LandingPage';
import { LoginPage } from '@/pages/LoginPage';
import { SignupPage } from '@/pages/SignupPage';
import { ChatPage } from '@/pages/ChatPage';
import { HistoryPage } from '@/pages/HistoryPage';
import { DocumentsPage } from '@/pages/admin/DocumentsPage';
import { QualityPage } from '@/pages/admin/QualityPage';
import { DepartmentsPage } from '@/pages/admin/DepartmentsPage';
import { UsersPage } from '@/pages/admin/UsersPage';
import { SettingsPage } from '@/pages/admin/SettingsPage';
import { DashboardPage } from '@/pages/admin/DashboardPage';
import { DocAssistantPage } from '@/pages/admin/DocAssistantPage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 1,
    },
  },
});

function App() {
  return (
    <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <AuthProvider>
          <BrowserRouter>
            <Routes>
              {/* LP（認証不要） */}
              <Route path="/lp" element={<LandingPage />} />

              {/* 公開ルート */}
              <Route
                path="/login"
                element={
                  <PublicOnlyRoute>
                    <LoginPage />
                  </PublicOnlyRoute>
                }
              />
              <Route
                path="/signup"
                element={
                  <PublicOnlyRoute>
                    <SignupPage />
                  </PublicOnlyRoute>
                }
              />

              {/* ユーザールート */}
              <Route
                path="/"
                element={
                  <ProtectedRoute>
                    <ChatPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/history"
                element={
                  <ProtectedRoute>
                    <HistoryPage />
                  </ProtectedRoute>
                }
              />
              {/* 管理者ルート */}
              <Route
                path="/admin/dashboard"
                element={
                  <ProtectedRoute requiredRole="admin">
                    <DashboardPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/documents"
                element={
                  <ProtectedRoute requiredRole="admin">
                    <DocumentsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/quality"
                element={
                  <ProtectedRoute requiredRole="admin">
                    <QualityPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/departments"
                element={
                  <ProtectedRoute requiredRole="admin">
                    <DepartmentsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/users"
                element={
                  <ProtectedRoute requiredRole="admin">
                    <UsersPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/doc-assistant"
                element={
                  <ProtectedRoute requiredRole="admin">
                    <DocAssistantPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/settings"
                element={
                  <ProtectedRoute requiredRole="admin">
                    <SettingsPage />
                  </ProtectedRoute>
                }
              />

              {/* フォールバック */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </BrowserRouter>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
