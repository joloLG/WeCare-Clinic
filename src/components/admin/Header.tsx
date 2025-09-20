'use client';

import { useState, useEffect } from 'react';
import { Bell, MessageSquare, Menu, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { Notifications } from './Notifications';
import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';

interface HeaderProps {
  onToggleSidebar: () => void;
  isSidebarOpen: boolean;
}

export function Header({ onToggleSidebar, isSidebarOpen }: HeaderProps) {
  const [notificationCount] = useState(0);
  const [messageCount, setMessageCount] = useState(0);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  // Fetch message count from the database
  useEffect(() => {
    const fetchMessageCount = async () => {
      try {
        // Fetch unread messages count
        const { count: messagesCount, error: messagesError } = await supabase
          .from('messages')
          .select('*', { count: 'exact', head: true })
          .eq('is_read', false)
          
        if (messagesError) {
          console.error('Error fetching messages:', messagesError);
          return;
        }

        setMessageCount(messagesCount || 0);
      } catch (error) {
        console.error('Error fetching message count:', error);
      }
    };

    fetchMessageCount();
  }, [supabase]);

  return (
    <header className="bg-white border-b border-gray-200">
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Left side */}
          <div className="flex items-center">
            <button
              type="button"
              onClick={onToggleSidebar}
              className="p-2 rounded-md text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-500"
            >
              <span className="sr-only">
                {isSidebarOpen ? 'Close sidebar' : 'Open sidebar'}
              </span>
              {isSidebarOpen ? (
                <ChevronLeft className="h-6 w-6" />
              ) : (
                <ChevronRight className="h-6 w-6" />
              )}
            </button>
            
            <h1 className="ml-4 text-xl font-semibold text-gray-900">
              Dashboard Overview
            </h1>
          </div>

          {/* Right side */}
          <div className="flex items-center space-x-4">
            <Notifications className="ml-4" />

            <button
              type="button"
              className="p-1 rounded-full text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 relative"
              onClick={() => router.push('/dashboard/messages')}
            >
              <MessageSquare className="h-6 w-6" />
              {messageCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                  {messageCount > 9 ? '9+' : messageCount}
                </span>
              )}
            </button>

            <div className="ml-3 relative">
              <div className="h-8 w-8 rounded-full bg-indigo-600 flex items-center justify-center text-white font-medium">
                A
                <div className="h-8 w-8 rounded-full bg-indigo-600 flex items-center justify-center text-white font-medium">
                  A
                </div>
              </div>
            </div>
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden flex items-center">
            <button
              type="button"
              className="p-2 rounded-md text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-500"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              <span className="sr-only">Open main menu</span>
              {isMobileMenuOpen ? (
                <X className="block h-6 w-6" />
              ) : (
                <Menu className="block h-6 w-6" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden">
          <div className="pt-2 pb-3 space-y-1">
            <a
              href="/dashboard/admin/notifications"
              className="flex items-center px-4 py-2 text-base font-medium text-gray-700 hover:bg-gray-100"
            >
              <Bell className="h-5 w-5 mr-3 text-gray-500" />
              Notifications
              {notificationCount > 0 && (
                <span className="ml-auto bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                  {notificationCount}
                </span>
              )}
            </a>
            <a
              href="/dashboard/admin/messages"
              className="flex items-center px-4 py-2 text-base font-medium text-gray-700 hover:bg-gray-100"
            >
              <MessageSquare className="h-5 w-5 mr-3 text-gray-500" />
              Messages
              {messageCount > 0 && (
                <span className="ml-auto bg-blue-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                  {messageCount}
                </span>
              )}
            </a>
          </div>
        </div>
      )}
    </header>
  );
}
