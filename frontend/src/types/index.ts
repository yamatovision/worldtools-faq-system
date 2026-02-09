// ==============================
// 組織関連型定義
// ==============================

export type PlanType = 'trial' | 'paid' | 'enterprise';

export interface Organization {
  id: string;
  name: string;
  slug: string;
  plan: PlanType;
  trialEndsAt: string | null;
  isActive: boolean;
}

// ==============================
// ユーザー関連型定義
// ==============================

export type UserRole = 'user' | 'admin';

export interface User {
  id: string;
  email: string;
  name: string;
  departmentId?: string;
  departmentName?: string;
  role: UserRole;
  organizationId: string;
  organizationName?: string;
}

export interface AuthState {
  user: User | null;
  organization: Organization | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface SignupRequest {
  companyName: string;
  email: string;
  password: string;
}

export interface AuthResponse {
  user: User;
  organization: Organization;
  accessToken: string;
  expiresIn: number;
}

// ==============================
// 部門関連型定義
// ==============================

export interface Department {
  id: string;
  name: string;
  description?: string;
  userCount?: number;
  documentCount?: number;
}

// ==============================
// 質問・回答関連型定義
// ==============================

export interface Question {
  id: string;
  content: string;
  userId: string;
  departmentId: string;
  createdAt: string;
  answer?: Answer;
}

export interface Answer {
  id: string;
  content: string;
  confidenceScore: number;
  referencedDocuments: ReferencedDocument[];
  createdAt: string;
  feedbacks?: Feedback[];
}

export interface ReferencedDocument {
  id: string;
  title: string;
  chunkId: string;
  relevanceScore: number;
}

export type FeedbackRating = 'good' | 'bad';

export interface Feedback {
  id: string;
  answerId: string;
  userId: string;
  rating: FeedbackRating;
  comment?: string;
  createdAt: string;
}

export interface CreateQuestionRequest {
  content: string;
}

export interface CreateFeedbackRequest {
  answerId: string;
  rating: FeedbackRating;
  comment?: string;
}

// ==============================
// ドキュメント関連型定義
// ==============================

export interface Document {
  id: string;
  filename: string;
  fileType: string;
  isPublic: boolean;
  category: string;
  departmentIds: string[];
  departmentNames: string[];
  chunkCount: number;
  graphBuildStatus: string;
  createdAt: string;
  // BOX連携用
  boxFileId?: string;
  boxSyncStatus?: 'synced' | 'outdated' | 'error';
  boxSyncedAt?: string;
}

// ==============================
// BOX関連型定義
// ==============================

export interface BoxFolder {
  id: string;
  name: string;
  parentId: string | null;
}

export interface BoxFile {
  id: string;
  name: string;
  size: number;
  modifiedAt: string;
  fileType: string;
}

export interface BoxSyncRequest {
  fileIds: string[];
  isPublic: boolean;
  departmentIds?: string[];
}

// ==============================
// API共通型定義
// ==============================

export interface ApiResponse<T> {
  data: T;
  message?: string;
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface PaginationParams {
  page?: number;
  pageSize?: number;
}

export interface DateRangeParams {
  startDate?: string;
  endDate?: string;
}

// ==============================
// 統合ダッシュボード関連型定義
// ==============================

export interface DashboardData {
  weeklyComparison: {
    thisWeek: WeeklyMetrics;
    lastWeek: WeeklyMetrics;
  };
  sparklineData: SparklineDay[];
  heatmap: number[][];
  topReferencedDocs: TopReferencedDoc[];
  infrastructure: {
    documentCount: number;
    chunkCount: number;
    embeddingModel: string;
    boxSync: {
      configured: boolean;
      lastSyncAt: string | null;
      syncedFileCount: number;
    };
    dataCoverage: {
      departmentName: string;
      documentCount: number;
    }[];
  };
  recentDocuments: {
    filename: string;
    source: 'manual' | 'box';
    createdAt: string | null;
    chunkCount: number;
  }[];
}

export interface WeeklyMetrics {
  questions: number;
  activeUsers: number;
  noAnswerRate: number;
  satisfactionRate: number;
  feedbackCount: number;
}

export interface SparklineDay {
  [key: string]: string | number;
  date: string;
  total: number;
  good: number;
  bad: number;
  noAnswer: number;
}

export interface TopReferencedDoc {
  id: string;
  filename: string;
  referenceCount: number;
}
