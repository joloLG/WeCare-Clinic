// src/app/dashboard/layout.tsx
'use client';

import { createClient } from '@/utils/supabase/client';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const supabase = createClient();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        setIsLoading(true);
        
        // First, check if we have a valid session
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError || !session) {
          console.error('No valid session:', sessionError);
          return router.push('/auth/login');
        }

        // Get the user's profile with role information
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('role, is_admin')
          .eq('id', session.user.id)
          .single();

        if (profileError) {
          console.error('Error fetching profile:', profileError);
          return router.push('/auth/login');
        }

        // Determine if user is admin (check both role and is_admin flag for backward compatibility)
        const userIsAdmin = profile?.role === 'admin' || profile?.is_admin === true;

        // If at root dashboard, redirect based on role
        if (pathname === '/dashboard' || pathname === '/dashboard/') {
          return router.push(userIsAdmin ? '/dashboard/admin' : '/dashboard/user');
        }

        // If trying to access admin routes without admin role, redirect to user dashboard
        if (pathname.startsWith('/dashboard/admin') && !userIsAdmin) {
          console.warn('Non-admin user attempted to access admin route');
          return router.push('/dashboard/user');
        }
      } catch (error) {
        console.error('Error checking auth:', error);
        router.push('/auth/login');
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, [pathname, router, supabase]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-t-2 border-indigo-500"></div>
      </div>
    );
  }

  // If we're at the root dashboard, show loading state until redirect happens
  if (pathname === '/dashboard' || pathname === '/dashboard/') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-t-2 border-indigo-500"></div>
      </div>
    );
  }

  // For all routes, just render the children - the admin/user layout is handled by their respective layouts
  return <>{children}</>;
}