import { createClient } from '@/utils/supabase/client';
import { UserProfile, AuthUser } from '@/lib/types/auth';
import * as React from 'react';
import { ComponentType, ReactNode } from 'react';

// Default loading component
const DefaultLoading = () => React.createElement('div', null, 'Loading...');

// Default error component
interface ErrorProps {
  error: Error;
  children?: ReactNode;
}

const DefaultError: React.FC<ErrorProps> = ({ error }) => 
  React.createElement('div', { style: { padding: '1rem', color: 'red' } },
    React.createElement('h2', null, 'Access Denied'),
    React.createElement('p', null, error.message)
  );

// Export types from auth module
export type { UserProfile, AuthUser } from '@/lib/types/auth';

// Type for the withRoleCheck options
export interface WithRoleCheckOptions {
  requireAdmin?: boolean;
  LoadingComponent?: ComponentType<{ children?: ReactNode }>;
  ErrorComponent?: ComponentType<ErrorProps>;
}

// Type for components that receive user profile as a prop
export interface WithUserProfileProps {
  userProfile?: UserProfile | null;
}

/**
 * Fetches the current user's profile with role information
 */
export async function getCurrentUserProfile(): Promise<{
  user: AuthUser | null;
  profile: UserProfile | null;
  error: Error | null;
}> {
  try {
    const supabase = createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return { user: null, profile: null, error: userError || new Error('No authenticated user') };
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (profileError) {
      return { user: null, profile: null, error: profileError };
    }

    return {
      user: { ...user, role: profile.role, is_admin: profile.is_admin },
      profile,
      error: null,
    };
  } catch (error) {
    return {
      user: null,
      profile: null,
      error: error instanceof Error ? error : new Error('Failed to fetch user profile'),
    };
  }
}

/**
 * Checks if the current user has admin access if required
 */
export async function checkUserPermissions(
  requireAdmin: boolean = false
): Promise<{
  hasAccess: boolean;
  user: AuthUser | null;
  profile: UserProfile | null;
  error: Error | null;
}> {
  const { user, profile, error } = await getCurrentUserProfile();

  if (error || !user || !profile) {
    return {
      hasAccess: false,
      user: null,
      profile: null,
      error: error || new Error('User not authenticated'),
    };
  }

  // Check admin access if required
  if (requireAdmin && !(user.is_admin || profile?.is_admin)) {
    return {
      hasAccess: false,
      user,
      profile,
      error: new Error('Admin access required'),
    };
  }

  return { 
    hasAccess: true, 
    user, 
    profile, 
    error: null 
  };
}

/**
 * Higher-order component for role-based access control
 */
export function withRoleCheck<P extends object>(
  WrappedComponent: ComponentType<P & WithUserProfileProps>,
  options: WithRoleCheckOptions = {}
): React.FC<P> {
  const {
    requireAdmin = false,
    LoadingComponent = DefaultLoading,
    ErrorComponent = DefaultError,
  } = options;

  return function WithRoleCheckComponent(props: P) {
    const [state, setState] = React.useState<{
      loading: boolean;
      error: Error | null;
      user: AuthUser | null;
      profile: UserProfile | null;
    }>({
      loading: true,
      error: null,
      user: null,
      profile: null,
    });

    React.useEffect(() => {
      const checkAccess = async () => {
        const result = await checkUserPermissions(requireAdmin);
        setState({
          loading: false,
          error: result.hasAccess ? null : (result.error || new Error('Access denied')),
          user: result.user,
          profile: result.profile,
        });
      };

      checkAccess();
    }, []);

    if (state.loading) {
      return React.createElement(LoadingComponent);
    }

    if (state.error) {
      return React.createElement(ErrorComponent, { error: state.error });
    }

    return React.createElement(WrappedComponent, { ...props, userProfile: state.profile });
  };
}

/**
 * Hook for checking user permissions in functional components
 */
export function useCheckPermissions(requireAdmin: boolean = false) {
  const [state, setState] = React.useState<{
    loading: boolean;
    hasAccess: boolean;
    error: Error | null;
    user: AuthUser | null;
    profile: UserProfile | null;
  }>({
    loading: true,
    hasAccess: false,
    error: null,
    user: null,
    profile: null,
  });

  React.useEffect(() => {
    const checkAccess = async () => {
      const result = await checkUserPermissions(requireAdmin);
      setState({
        loading: false,
        hasAccess: result.hasAccess,
        error: result.error,
        user: result.user,
        profile: result.profile,
      });
    };

    checkAccess();
  }, [requireAdmin]);

  return state;
}
