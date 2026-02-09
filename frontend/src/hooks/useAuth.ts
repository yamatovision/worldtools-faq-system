import { useContext } from 'react';
import { AuthContext } from '@/contexts/AuthContext';
import type { UserRole } from '@/types';

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export function useIsAdmin() {
  const { user } = useAuth();
  return user?.role === 'admin';
}

export function useHasRole(requiredRole: UserRole) {
  const { user } = useAuth();
  if (!user) return false;
  if (requiredRole === 'user') return true;
  return user.role === requiredRole;
}

export function useUser() {
  const { user } = useAuth();
  return user;
}
