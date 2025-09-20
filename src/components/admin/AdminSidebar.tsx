'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { LogOut, LayoutDashboard, Users, Calendar, Syringe, MessageSquare, PanelLeftClose, PanelRightOpen } from 'lucide-react';
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

interface AdminSidebarProps {
  onCollapseAction: (isCollapsed: boolean) => void;
}

export function AdminSidebar({
  onCollapseAction,
}: AdminSidebarProps) {
  const pathname = usePathname();
  const supabase = createClient();
  const [isCollapsed, setIsCollapsed] = useState(false);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    window.location.href = '/auth/login';
  };

  const toggleCollapse = () => {
    const newState = !isCollapsed;
    onCollapseAction?.(newState);
    setIsCollapsed(newState);
  };

  return (
    <>
      <div 
        className={cn(
          "hidden lg:flex lg:flex-col lg:fixed lg:inset-y-0 lg:z-30 transition-all duration-300",
          isCollapsed ? "lg:w-16" : "lg:w-64"
        )}
      >
        <div className="flex h-16 flex-shrink-0 items-center px-4 bg-red-600">
          {isCollapsed ? (
            <h1 className="text-xl font-bold text-white">A</h1>
          ) : (
            <h1 className="text-xl font-bold text-white">Admin Panel</h1>
          )}
        </div>
        
        <div className="flex-1 overflow-y-auto px-2 py-4 border-r border-red-200 bg-red-100 text-black">
          <nav className="space-y-1">
            {adminNavItems.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  'flex items-center px-4 py-3 text-sm font-medium rounded-md transition-colors',
                  pathname === item.href
                    ? 'bg-red-200 text-red-800 font-bold shadow-sm'
                    : 'text-red-700 hover:bg-red-200 hover:text-red-800',
                  !isCollapsed && "justify-start",
                  isCollapsed && "justify-center"
                )}
              >
                <span className={cn(isCollapsed ? "mr-0" : "mr-3")}>{item.icon}</span>
                {!isCollapsed && item.name}
              </Link>
            ))}
          </nav>
        </div>
        
        <div className="border-t border-red-200 bg-red-100 p-4">
          <Button
            variant="ghost"
            className="w-full justify-start text-red-700 hover:bg-red-200 hover:text-red-800"
            onClick={handleSignOut}
          >
            <LogOut className={cn("h-4 w-4", !isCollapsed && "mr-3")} />
            {!isCollapsed && "Sign out"}
          </Button>
          <Button
            variant="ghost"
            className="w-full justify-start text-red-700 hover:bg-red-200 hover:text-red-800 mt-2"
            onClick={toggleCollapse}
          >
            {isCollapsed ? (
              <PanelRightOpen className="h-4 w-4" />
            ) : (
              <PanelLeftClose className="h-4 w-4 mr-3" />
            )}
            {!isCollapsed && "Collapse"}
          </Button>
        </div>
      </div>
    </>
  );
}