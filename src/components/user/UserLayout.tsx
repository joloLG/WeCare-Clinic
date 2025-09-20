'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { LogOut, Menu, Sun, Moon } from 'lucide-react';
import { NotificationBell } from '@/components/admin/NotificationBell';
import { createClient } from '@/utils/supabase/client';
import { useTheme } from 'next-themes';

type NavItem = {
  name: string;
  href: string;
  icon: React.ReactNode;
};

const userNavItems: NavItem[] = [
  {
    name: 'Dashboard',
    href: '/dashboard/user',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-layout-dashboard">
        <rect width="7" height="9" x="3" y="3" rx="1"/>
        <rect width="7" height="5" x="14" y="3" rx="1"/>
        <rect width="7" height="9" x="14" y="12" rx="1"/>
        <rect width="7" height="5" x="3" y="16" rx="1"/>
      </svg>
    ),
  },
  {
    name: 'Book Appointment',
    href: '/dashboard/user/book',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-calendar-plus">
        <rect width="18" height="18" x="3" y="4" rx="2"/>
        <line x1="16" x2="16" y1="2" y2="6"/>
        <line x1="8" x2="8" y1="2" y2="6"/>
        <line x1="3" x2="21" y1="10" y2="10"/>
        <line x1="12" x2="12" y1="14" y2="18"/>
        <line x1="10" x2="14" y1="16" y2="16"/>
      </svg>
    ),
  },
  { 
    name: 'Profile', 
    href: '/dashboard/user/profile', 
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-user">
        <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/>
        <circle cx="12" cy="7" r="4"/>
      </svg>
    ) 
  },
  { 
    name: 'Messages', 
    href: '/dashboard/user/messages', 
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-message-square">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
      </svg>
    ) 
  },
  { name: 'E-Vaccination Card', href: '/dashboard/user/vaccination', icon: (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-syringe">
      <path d="m18 2 4 4"/>
      <path d="m17 7-3-3"/>
      <path d="M19 9 8.7 19.3c-1 1-2.5 1-3.4 0l-.6-.6c-1-1-1-2.5 0-3.4L15 5"/>
      <path d="m9 11 4 4"/>
      <path d="m5 19-3 3"/>
      <path d="m14 4 6 6"/>
    </svg>
  ) },
  { name: 'Appointment History', href: '/dashboard/user/history', icon: (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-history">
      <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
      <path d="M3 3v5h5"/>
      <path d="M12 7v5l3 3"/>
    </svg>
  ) },
  { name: 'About WeCare Clinic', href: '/dashboard/user/about', icon: (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-info">
      <circle cx="12" cy="12" r="10"/>
      <line x1="12" x2="12" y1="16" y2="12"/>
      <line x1="12" x2="12.01" y1="8" y2="8"/>
    </svg>
  ) },
];

export function UserLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [desktopSidebarOpen, setDesktopSidebarOpen] = useState(true);
  const pathname = usePathname();
  const supabase = createClient();
  const { theme, setTheme } = useTheme();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    window.location.href = '/auth/login';
  };

  return (
    <div className={cn("flex h-screen", theme === 'dark' ? 'bg-gray-900' : 'bg-white')}>
      {/* Desktop sidebar */}
      <div className={cn(
        "hidden lg:flex lg:flex-col lg:fixed lg:inset-y-0 lg:z-30 transition-all duration-300",
        desktopSidebarOpen ? "lg:w-64" : "lg:w-16",
        theme === 'dark' ? "border-r border-gray-700 bg-gray-900" : "border-r border-red-200 bg-red-50"
      )}>
        <div className="flex h-16 flex-shrink-0 items-center px-4 justify-between">
          {desktopSidebarOpen ? (
            <h1 className={cn("text-xl font-bold text-center", theme === 'dark' ? 'text-red-400' : 'text-red-600')}>WeCare Animal Bite Clinic</h1>
          ) : (
            <span className={cn("text-xl font-bold", theme === 'dark' ? 'text-red-400' : 'text-red-600')}>W</span>
          )}
          <button
            className={cn(
              "ml-2 p-1 rounded focus:outline-none focus:ring-2",
              theme === 'dark' ? "hover:bg-gray-800 focus:ring-gray-600" : "hover:bg-red-100 focus:ring-red-300"
            )}
            onClick={() => setDesktopSidebarOpen((open) => !open)}
            aria-label={desktopSidebarOpen ? 'Close sidebar' : 'Open sidebar'}
          >
            {desktopSidebarOpen ? (
              <svg xmlns="http://www.w3.org/2000/svg" className={cn("h-5 w-5", theme === 'dark' ? 'text-red-400' : 'text-red-600')} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 12L6 6V18Z" /></svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className={cn("h-5 w-5", theme === 'dark' ? 'text-red-400' : 'text-red-600')} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 6L6 12L18 18V6Z" /></svg>
            )}
          </button>
        </div>
        <nav className={cn("flex-1 space-y-1 overflow-y-auto px-2 py-4", desktopSidebarOpen ? "" : "px-1 py-2")}> 
          {userNavItems.map((item) => (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                'flex items-center text-sm font-medium rounded-md transition-all',
                desktopSidebarOpen ? 'px-4 py-3' : 'px-2 py-3 justify-center',
                pathname === item.href
                  ? cn("font-bold shadow", theme === 'dark' ? 'bg-gray-700 text-red-400' : 'bg-white text-red-700')
                  : cn(theme === 'dark' ? 'text-gray-300 hover:bg-gray-800 hover:text-red-400' : 'text-gray-700 hover:bg-red-100 hover:text-red-900')
              )}
              title={item.name}
            >
              <span className={cn("mr-3 transition-all", desktopSidebarOpen ? "" : "mr-0")}>{item.icon}</span>
              {desktopSidebarOpen && item.name}
            </Link>
          ))}
        </nav>
        <div className={cn("border-t p-4", desktopSidebarOpen ? "" : "p-2 flex justify-center", theme === 'dark' ? 'border-gray-700' : 'border-red-200')}> 
          <Button
            variant="ghost"
            className={cn(
              "w-full justify-start focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500",
              desktopSidebarOpen ? "" : "p-2 flex justify-center",
              theme === 'dark' ? 'text-gray-300 hover:bg-gray-800 hover:text-red-400' : 'text-gray-700 hover:bg-gray-100'
            )}
            onClick={handleSignOut}
            title="Sign out"
          >
            <LogOut className="mr-3 h-4 w-4" />
            {desktopSidebarOpen && 'Sign out'}
          </Button>
        </div>
      </div>

      {/* Mobile sidebar */}
      <div className="lg:hidden">
        <div 
          className={`fixed inset-0 z-40 bg-black/50 ${sidebarOpen ? 'block' : 'hidden'}`}
          onClick={() => setSidebarOpen(false)}
        />
        <div 
          className={cn(
            "fixed inset-y-0 left-0 z-50 w-64 transform transition-transform duration-300 ease-in-out",
            sidebarOpen ? 'translate-x-0' : '-translate-x-full'
          )}
        >
          <div className={cn("flex h-full flex-col border-r", theme === 'dark' ? 'border-gray-700 bg-gray-900' : 'border-red-200 bg-red-50')}>
            <div className="flex h-16 flex-shrink-0 items-center px-4">
              <h1 className={cn("text-xl font-bold", theme === 'dark' ? 'text-red-400' : 'text-red-600')}>WeCare</h1>
            </div>
            <nav className="flex-1 space-y-1 overflow-y-auto px-2 py-4">
              {userNavItems.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    'flex items-center px-4 py-3 text-sm font-medium rounded-md',
                    pathname === item.href
                      ? cn("font-bold shadow", theme === 'dark' ? 'bg-gray-700 text-red-400' : 'bg-white text-red-700')
                      : cn(theme === 'dark' ? 'text-gray-300 hover:bg-gray-800 hover:text-red-400' : 'text-gray-700 hover:bg-red-100 hover:text-red-900')
                  )}
                  onClick={() => setSidebarOpen(false)}
                >
                  <span className="mr-3">{item.icon}</span>
                  {item.name}
                </Link>
              ))}
            </nav>
            <div className={cn("border-t p-4", theme === 'dark' ? 'border-gray-700' : 'border-red-200')}>
              <Button
                variant="ghost"
                className={cn(
                  "w-full justify-start focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500",
                  theme === 'dark' ? 'text-gray-300 hover:bg-gray-800 hover:text-red-400' : 'text-gray-700 hover:bg-gray-100'
                )}
                onClick={handleSignOut}
              >
                <LogOut className="mr-3 h-4 w-4" />
                Sign out
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div
        className={cn(
          "flex flex-1 flex-col overflow-hidden transition-all duration-300",
          desktopSidebarOpen ? "lg:ml-64" : "lg:ml-16"
        )}
      >
        {/* Top navigation */}
        <header className={cn("shadow-sm", theme === 'dark' ? 'bg-gray-800 dark:shadow-lg' : 'bg-red-100')}>
          <div className="flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
            <div className="flex items-center">
              <button
                type="button"
                className={cn("mr-4 lg:hidden", theme === 'dark' ? 'text-gray-200 hover:text-red-400' : 'text-gray-500 hover:text-gray-700')}
                onClick={() => setSidebarOpen(true)}
              >
                <Menu className="h-6 w-6" />
                <span className="sr-only">Open sidebar</span>
              </button>
              <h1 className={cn("text-lg font-semibold", theme === 'dark' ? 'text-white' : 'text-gray-900')}>
                {userNavItems.find((item) => item.href === pathname)?.name || 'Dashboard'}
              </h1>
            </div>
            <div className="flex items-center space-x-4">
              <div className="relative">
                <button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} className="p-2 rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500">
                  {theme === 'dark' ? <Sun className="h-6 w-6 text-yellow-300" /> : <Moon className="h-6 w-6 text-gray-500" />}
                </button>
              </div>
              <div className="relative">
                <NotificationBell />
              </div>
              <div className="relative">
                {/* User menu would go here */}
              </div>
            </div>
          </div>
        </header>

        {/* Main content area */}
        <main className={cn("flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8", theme === 'dark' ? 'bg-gray-900' : 'bg-gray-50')}>
          {children}
        </main>
      </div>
    </div>
  );
}