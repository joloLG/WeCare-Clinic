'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useRouter, usePathname } from 'next/navigation';
import { Menu } from 'lucide-react';
import { AdminSidebar } from '@/components/admin/AdminSidebar';
import { MobileSidebar } from '@/components/admin/MobileSidebar';
import { NotificationBell } from '@/components/admin/NotificationBell';
import { cn } from '@/lib/utils';

export default function AdminDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isDesktopSidebarCollapsed, setIsDesktopSidebarCollapsed] = useState(false);
  const supabase = createClient();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError || !session) {
          router.push('/auth/login');
          return;
        }
        
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        
        if (userError || !user) {
          console.error('Error getting authenticated user:', userError);
          router.push('/auth/login');
          return;
        }
        
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single();

        if (profileError || !profile || profile.role !== 'admin') {
          console.error('Admin access denied:', profileError || 'User is not an admin');
          router.push('/dashboard/user');
          return;
        }

        setLoading(false);
      } catch (error) {
        console.error('Error checking auth status:', error);
        router.push('/auth/login?error=auth_check_failed');
      }
    };

    checkAuth();
  }, [router, supabase]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-white">
        <div className="h-12 w-12 animate-spin rounded-full border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <MobileSidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
      <AdminSidebar onCollapseAction={setIsDesktopSidebarCollapsed} />
      
      <div className={cn("transition-all duration-300", isDesktopSidebarCollapsed ? "lg:pl-16" : "lg:pl-64")}>
        <div className="sticky top-0 z-40 flex h-16 shrink-0 items-center justify-between border-b border-red-200 bg-red-600 px-4 shadow-sm sm:px-6 lg:px-8">
          <div className="flex items-center">
            <button
              type="button"
              className="-m-2.5 p-2.5 text-white lg:hidden"
              onClick={() => setSidebarOpen(true)}
            >
              <span className="sr-only">Open sidebar</span>
              <Menu className="h-6 w-6" aria-hidden="true" />
            </button>
            <h1 className="ml-4 text-lg font-bold text-white">
              {(() => {
                const lastSegment = pathname.split('/').pop() || '';
                return lastSegment ? lastSegment.charAt(0).toUpperCase() + lastSegment.slice(1) : 'Dashboard';
              })()}
            </h1>
          </div>
          <div className="flex items-center">
            <NotificationBell />
          </div>
        </div>

        <main className="py-6">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 md:px-8">
            <div className="bg-white shadow-sm rounded-lg p-6">
              {children}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}