'use client';

import { LogOut, ChevronLeft, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { adminNavItems } from '@/config/admin-navigation';

interface SidebarProps {
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

export default function Sidebar({ isCollapsed, onToggleCollapse }: SidebarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const supabase = createClient();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/auth/login');
  };

  return (
    <div className={`flex h-screen flex-col bg-white shadow-lg transition-all duration-300 ${isCollapsed ? 'w-16' : 'w-64'}`}>
      <div className="flex-1 overflow-y-auto p-4">
        {!isCollapsed && (
          <div className="flex items-center justify-between px-2 py-4">
            <h2 className="text-lg font-semibold">WeCare Admin</h2>
          </div>
        )}
        <nav className="mt-4">
          <ul className="space-y-1">
            {adminNavItems.map((item) => {
              const Icon = item.icon;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium ${
                      pathname === item.href
                        ? 'bg-indigo-50 text-indigo-700'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    {Icon && <Icon className="h-5 w-5" />}
                    <span className="flex-1">{item.title}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

      </div>
      
      <div className="border-t border-gray-200 p-4">
        <button
          onClick={handleLogout}
          className={`flex w-full items-center rounded-lg p-2 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors ${isCollapsed ? 'justify-center' : ''}`}
        >
          <LogOut className="h-5 w-5" />
          {!isCollapsed && <span className="ml-3">Logout</span>}
        </button>
        
        <button
          onClick={onToggleCollapse}
          className={`mt-2 flex w-full items-center justify-center rounded-lg p-2 text-gray-500 hover:bg-gray-100 ${isCollapsed ? 'justify-center' : 'justify-end'}`}
        >
          {isCollapsed ? <ChevronRight className="h-5 w-5" /> : <ChevronLeft className="h-5 w-5" />}
        </button>
      </div>
    </div>
  );
}