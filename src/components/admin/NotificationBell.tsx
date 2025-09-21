'use client';

import { useState, useEffect, useRef } from 'react';
import { 
  Bell, 
  BellOff, 
  Calendar, 
  MessageSquare, 
  AlertCircle, 
  CheckCircle, 
  Loader2, 
  Clock,
  X
} from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import { useClickOutside } from '../../hooks/use-click-outside';

interface Notification {
  id: string;
  title: string;
  message: string;
  read: boolean;
  created_at: string;
}

interface NotificationData {
  id: string;
  type?: string;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

// Notification type with priority level
type Priority = 'low' | 'medium' | 'high';

interface EnhancedNotification extends Notification {
  priority?: Priority;
  icon?: React.ReactNode;
}

const getPriority = (title: string): Priority => {
  const lowerTitle = title.toLowerCase();
  if (lowerTitle.includes('emergency') || lowerTitle.includes('urgent')) return 'high';
  if (lowerTitle.includes('appointment') || lowerTitle.includes('reminder')) return 'medium';
  return 'low';
};

const getPriorityColor = (priority: Priority) => {
  switch (priority) {
    case 'high': return 'bg-red-100 text-red-800';
    case 'medium': return 'bg-yellow-100 text-yellow-800';
    default: return 'bg-blue-100 text-blue-800';
  }
};

const getNotificationIcon = (type: string) => {
  switch (type?.toLowerCase()) {
    case 'appointment':
      return <Calendar className="w-5 h-5 text-blue-500" />;
    case 'message':
      return <MessageSquare className="w-5 h-5 text-green-500" />;
    case 'alert':
      return <AlertCircle className="w-5 h-5 text-red-500" />;
    default:
      return <Bell className="w-5 h-5 text-gray-500" />;
  }
};

export function NotificationBell() {
  const [notifications, setNotifications] = useState<EnhancedNotification[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const supabase = createClient();

  // Close dropdown when clicking outside
  useClickOutside(dropdownRef, () => setShowDropdown(false));

  useEffect(() => {
    const fetchNotifications = async () => {
      setIsLoading(true);
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
          const mapped = data.map((n: NotificationData) => ({
            id: n.id,
            type: n.type,
            title: n.title,
            message: n.message,
            read: Boolean(n.is_read),
            created_at: n.created_at,
            priority: getPriority(n.title),
            icon: getNotificationIcon(n.type || '')
          })) as EnhancedNotification[];
          setNotifications(mapped);
          const unread = mapped.filter(n => !n.read).length;
          setUnreadCount(unread);
          setIsLoading(false);
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
            const n = payload.new as NotificationData;
            const mapped = {
              id: n.id,
              type: n.type,
              title: n.title,
              message: n.message,
              read: Boolean(n.is_read),
              created_at: n.created_at,
              priority: getPriority(n.title),
              icon: getNotificationIcon(n.type || '')
            } as EnhancedNotification;
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
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', id);
        
      if (!error) {
        setNotifications(prev => 
          prev.map(n => 
            n.id === id ? { ...n, read: true } : n
          )
        );
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    if (notifications.length === 0) return;
    
    const unreadIds = notifications
      .filter(n => !n.read)
      .map(n => n.id);
      
    if (unreadIds.length === 0) return;
    
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .in('id', unreadIds);
        
      if (!error) {
        setNotifications(prev => 
          prev.map(n => ({
            ...n,
            read: true
          }))
        );
        setUnreadCount(0);
      }
    } catch (error) {
      console.error('Error marking notifications as read:', error);
    }
  };

  return (
    <div className="relative">
      <button
        type="button"
        className="p-2 text-gray-600 hover:text-gray-900 focus:outline-none relative transition-colors duration-200 rounded-full hover:bg-gray-100"
        onClick={() => setShowDropdown(!showDropdown)}
        aria-label="Notifications"
        aria-haspopup="true"
        aria-expanded={showDropdown}
      >
        <Bell className="h-6 w-6" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center animate-pulse">
            {unreadCount}
          </span>
        )}
      </button>
        {showDropdown && (
          <div
            ref={dropdownRef}
            className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-lg shadow-xl overflow-hidden z-50 border border-gray-200 transform transition-all duration-200 ease-in-out lg:w-96"
            style={{
              maxHeight: 'calc(100vh - 100px)',
              minHeight: '200px'
            }}
          >
            <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                  <Bell className="h-5 w-5 mr-2 text-indigo-600" />
                  Notifications
                </h3>
                <button
                  onClick={() => setShowDropdown(false)}
                  className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
                  aria-label="Close notifications"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>
            <div className="divide-y divide-gray-100 max-h-[400px] overflow-y-auto">
              {isLoading ? (
                <div className="p-6 flex flex-col items-center justify-center text-gray-500">
                  <Loader2 className="h-8 w-8 animate-spin text-indigo-500 mb-2" />
                  <p>Loading notifications...</p>
                </div>
              ) : notifications.length > 0 ? (
                notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`p-4 hover:bg-gray-50 transition-colors duration-150 cursor-pointer ${
                      !notification.read ? 'bg-blue-50' : ''
                    }`}
                    onClick={() => markAsRead(notification.id)}
                  >
                    <div className="flex items-start">
                      <div className="flex-shrink-0 pt-0.5">
                        <div className={`h-10 w-10 rounded-full flex items-center justify-center ${
                          !notification.read ? 'bg-indigo-100' : 'bg-gray-100'
                        }`}>
                          {notification.icon || <Bell className="h-5 w-5 text-indigo-600" />}
                        </div>
                      </div>
                      <div className="ml-3 flex-1 min-w-0">
                        <div className="flex justify-between items-start">
                          <h4 className="text-sm font-medium text-gray-900 truncate">
                            {notification.title}
                          </h4>
                          {notification.priority && (
                            <span className={`ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getPriorityColor(notification.priority)}`}>
                              {notification.priority.charAt(0).toUpperCase() + notification.priority.slice(1)}
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                          {notification.message}
                        </p>
                        <div className="mt-2 flex items-center justify-between text-xs text-gray-500">
                          <span className="flex items-center">
                            <Clock className="h-3.5 w-3.5 mr-1" />
                            {new Date(notification.created_at).toLocaleString(undefined, {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </span>
                          {!notification.read && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                              New
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-6 text-center text-gray-500 flex flex-col items-center">
                  <BellOff className="h-10 w-10 text-gray-300 mb-2" />
                  <p className="text-sm">No notifications yet</p>
                  <p className="text-xs text-gray-400 mt-1">We&apos;ll notify you when something arrives</p>
                </div>
              )}
            </div>
          
          {notifications.length > 0 && (
            <div className="border-t border-gray-200 bg-gray-50 px-4 py-3 flex justify-between items-center">
              <span className="text-xs text-gray-500">
                Showing {notifications.length} {notifications.length === 1 ? 'notification' : 'notifications'}
              </span>
              <button
                onClick={markAllAsRead}
                className="text-sm font-medium text-indigo-600 hover:text-indigo-800 transition-colors"
              >
                <span className="inline-flex items-center">
                  <CheckCircle className="h-4 w-4 mr-1" />
                  Mark all as read
                </span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
