'use client';

import { Dispatch, SetStateAction } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { LogOut, LayoutDashboard, Users, Calendar, Syringe, MessageSquare } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import { Button } from '@/components/ui/button';

type NavItem = {
  name: string;
  href: string;
  icon: React.ReactNode;
};

const adminNavItems: NavItem[] = [
  { name: 'Dashboard', href: '/dashboard/admin', icon: <LayoutDashboard className="h-5 w-5" /> },
  { name: 'Patients', href: '/dashboard/admin/patients', icon: <Users className="h-5 w-5" /> },
  { name: 'Appointments', href: '/dashboard/admin/appointments', icon: <Calendar className="h-5 w-5" /> },
  { name: 'Inventory', href: '/dashboard/admin/inventory', icon: <Syringe className="h-5 w-5" /> },
  { name: 'Messages', href: '/dashboard/admin/messages', icon: <MessageSquare className="h-5 w-5" /> },
];

export function MobileSidebar({
  sidebarOpen,
  setSidebarOpen: setSidebarOpenAction,
}: {
  sidebarOpen: boolean;
  setSidebarOpen: Dispatch<SetStateAction<boolean>>;
}) {
  const pathname = usePathname();
  const supabase = createClient();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    window.location.href = '/auth/login';
  };

  return (
    <div className="lg:hidden">
      <div 
        className={cn(
          "fixed inset-0 z-40 bg-black/50 transition-opacity duration-300",
          sidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        )}
        onClick={() => setSidebarOpenAction(false)}
      />
      <div 
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-64 transform transition-transform duration-300 ease-in-out",
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex h-full flex-col border-r border-red-200 bg-red-600 text-white">
          <div className="flex h-16 flex-shrink-0 items-center px-4">
            <h1 className="text-xl font-bold">Admin Panel</h1>
          </div>
          <nav className="flex-1 space-y-1 overflow-y-auto px-2 py-4">
            {adminNavItems.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  'flex items-center px-4 py-3 text-sm font-medium rounded-md transition-colors',
                  pathname === item.href
                    ? 'bg-white text-red-700 font-bold shadow-sm'
                    : 'text-red-100 hover:bg-red-500 hover:text-white'
                )}
                onClick={() => setSidebarOpenAction(false)}
              >
                <span className="mr-3">{item.icon}</span>
                {item.name}
              </Link>
            ))}
          </nav>
          <div className="border-t border-red-200 p-4">
            <Button
              variant="ghost"
              className="w-full justify-start text-red-100 hover:bg-red-500 hover:text-white"
              onClick={handleSignOut}
            >
              <LogOut className="mr-3 h-4 w-4" />
              Sign out
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}