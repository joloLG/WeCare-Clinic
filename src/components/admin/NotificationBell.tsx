'use client';

import { useState, useEffect } from 'react';
import { BellIcon } from '@heroicons/react/24/outline';
import { AppointmentNotifications } from './AppointmentNotifications';
import { createClient } from '@/utils/supabase/client';

interface Notification {
  id: string;
  title: string;
  message: string;
  read: boolean;
  created_at: string;
}

export function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const supabase = createClient();

  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        const { data: profile } = await supabase
          .from('profiles')
          .select('role, is_admin')
          .eq('id', user.id)
          .single();
        const isAdmin = !!profile?.is_admin || profile?.role === 'admin';
        const table = isAdmin ? 'admin_notifications' : 'patient_notifications';
        const idField = isAdmin ? 'admin_id' : 'patient_id';

        const { data, error } = await supabase
          .from(table)
          .select('*')
          .eq(idField, user.id)
          .order('created_at', { ascending: false })
          .limit(5);

        if (error) {
          console.error('Error fetching notifications:', error);
          return;
        }

        if (data) {
          const mapped = data.map((n: any) => ({
            id: n.id,
            title: n.title,
            message: n.message,
            read: Boolean(n.is_read),
            created_at: n.created_at,
          })) as Notification[];
          setNotifications(mapped);
          const unread = mapped.filter(n => !n.read).length;
          setUnreadCount(unread);
        }
      } catch (err) {
        console.error('Unexpected error in fetchNotifications:', err);
      }
    };

    fetchNotifications();

    // Set up real-time subscription
    let channel: ReturnType<typeof supabase.channel> | null = null;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: profile } = await supabase
        .from('profiles')
        .select('role, is_admin')
        .eq('id', user.id)
        .single();
      const isAdmin = !!profile?.is_admin || profile?.role === 'admin';
      const table = isAdmin ? 'admin_notifications' : 'patient_notifications';

      channel = supabase
        .channel(`realtime ${table}`)
        .on('postgres_changes', 
          { 
            event: 'INSERT', 
            schema: 'public', 
            table
          }, 
          (payload) => {
            const n = payload.new as any;
            const mapped = {
              id: n.id,
              title: n.title,
              message: n.message,
              read: Boolean(n.is_read),
              created_at: n.created_at,
            } as Notification;
            setNotifications(prev => [mapped, ...prev]);
            setUnreadCount(prev => prev + 1);
          }
        )
        .subscribe();
    })();

    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, [supabase]);

  const markAsRead = async (id: string) => {
    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('id', id);

    if (!error) {
      setNotifications(prev => 
        prev.map(n => n.id === id ? { ...n, read: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    }
  };

  const markAllAsRead = async () => {
    const unreadIds = notifications
      .filter(n => !n.read)
      .map(n => n.id);

    if (unreadIds.length === 0) return;

    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .in('id', unreadIds);

    if (!error) {
      setNotifications(prev => 
        prev.map(n => (unreadIds.includes(n.id) ? { ...n, read: true } : n))
      );
      setUnreadCount(0);
    }
  };

  return (
    <div className="relative">
      <button
        type="button"
        className="rounded-full bg-white p-1 text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 relative"
        onClick={() => setShowDropdown(!showDropdown)}
      >
        <span className="sr-only">View notifications</span>
        <BellIcon className="h-6 w-6" aria-hidden="true" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-xs text-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {showDropdown && (
        <>
          {/* Click outside to close */}
          <div 
            className="fixed inset-0 z-10" 
            onClick={() => setShowDropdown(false)}
          />
          
          {/* Dropdown panel */}
          <div className="absolute right-0 z-20 mt-2 w-80 origin-top-right rounded-md bg-white py-1 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
            <div className="flex items-center justify-between border-b border-gray-100 px-4 py-2">
              <h3 className="text-sm font-medium text-gray-900">Notifications</h3>
              {unreadCount > 0 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    markAllAsRead();
                  }}
                  className="text-xs text-indigo-600 hover:text-indigo-800"
                >
                  Mark all as read
                </button>
              )}
            </div>
            
            <div className="max-h-96 overflow-y-auto">
              <AppointmentNotifications />
              <div className="border-t border-gray-100 my-2" />
              {notifications.length > 0 ? (
                notifications.map((notification) => (
                  <div 
                    key={notification.id}
                    className={`px-4 py-3 hover:bg-gray-50 ${!notification.read ? 'bg-blue-50' : ''}`}
                    onClick={() => markAsRead(notification.id)}
                  >
                    <div className="flex items-start">
                      <div className="ml-3 w-0 flex-1">
                        <p className="text-sm font-medium text-gray-900">
                          {notification.title}
                        </p>
                        <p className="mt-1 text-sm text-gray-500">
                          {notification.message}
                        </p>
                        <p className="mt-1 text-xs text-gray-400">
                          {new Date(notification.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                      {!notification.read && (
                        <div className="ml-4 flex-shrink-0">
                          <span className="inline-block h-2 w-2 rounded-full bg-blue-500"></span>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="px-4 py-6 text-center">
                  <p className="text-sm text-gray-500">No new notifications</p>
                </div>
              )}
            </div>
            
            <div className="border-t border-gray-100 px-4 py-2 text-center">
              <a
                href="/dashboard/admin/notifications"
                className="text-sm font-medium text-indigo-600 hover:text-indigo-500"
                onClick={(e) => e.stopPropagation()}
              >
                View all
              </a>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
