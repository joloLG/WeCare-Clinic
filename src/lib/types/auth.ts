import { User as SupabaseUser } from '@supabase/supabase-js';

export interface UserProfile {
  id: string;
  first_name: string | null;
  middle_name: string | null;
  last_name: string | null;
  email: string | null;
  mobile_number: string | null;
  complete_address: string | null;
  is_admin: boolean;
  birthday: string | null;
  created_at: string;
  updated_at: string;
}

// Extend Supabase User type with our custom fields
export interface AuthUser extends Omit<SupabaseUser, 'email'> {
  email?: string | null;
  is_admin: boolean;
  // Add any additional user properties here
}

export interface AuthState {
  user: AuthUser | null;
  profile: UserProfile | null;
  loading: boolean;
  error: Error | null;
  isAdmin: boolean;
  hasRole: (role: string) => boolean;
  hasAnyRole: (roles: string[]) => boolean;
}

export interface UseAuthOptions {
  requireAuth?: boolean;
  requireAdmin?: boolean;
  redirectTo?: string;
}

export interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
  loadingComponent?: React.ReactNode;
  unauthorizedComponent?: React.ReactNode;
}
