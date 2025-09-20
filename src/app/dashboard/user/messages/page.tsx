'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { UserLayout } from '@/components/user/UserLayout';
import { ArrowLeft } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import { useTheme } from 'next-themes';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { UserProfile, Message } from '@/types/messages';

type DatabaseMessage = Omit<Message, 'sender' | 'receiver'> & {
  sender_id: string;
  receiver_id: string;
  is_read: boolean;
  created_at: string;
};

export default function UserMessagesPage() {
  const [admins, setAdmins] = useState<UserProfile[]>([]);
  const [selectedAdmin, setSelectedAdmin] = useState<UserProfile | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { theme } = useTheme();

  // Fetch current user and admins
  const fetchAdmins = useCallback(async () => {
    try {
      const supabase = createClient();
      const { data: userData } = await supabase.auth.getUser();
      setUserId(userData.user?.id || null);

      // Get the list of admin users from the profiles table
      const { data: adminData, error: adminError } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, email, avatar_url, is_admin')
        .eq('is_admin', true);

      if (adminError) {
        throw adminError;
      }

      if (!adminData || adminData.length === 0) {
        toast.info('No clinic staff available at the moment');
        return;
      }

      // Map the data to include all required UserProfile fields
      const adminProfiles: UserProfile[] = adminData.map(admin => ({
        id: admin.id,
        first_name: admin.first_name || 'Clinic',
        last_name: admin.last_name || 'Staff',
        email: admin.email || '',
        avatar_url: admin.avatar_url || '/default-avatar.png',
        role: 'admin'
      }));

      setAdmins(adminProfiles);

      // If there's only one admin, select them by default
      if (adminProfiles.length === 1) {
        setSelectedAdmin(adminProfiles[0]);
      }
    } catch (error) {
      console.error('Error fetching admin accounts:', error);
      toast.error('Failed to load clinic staff list');
    }
  }, []);

  useEffect(() => {
    fetchAdmins();
  }, [fetchAdmins]);

  // Fetch messages for selected admin
  const fetchMessages = useCallback(async () => {
    if (!selectedAdmin || !userId) return;

    setLoading(true);
    try {
      const supabase = createClient();
      
      // Fetch messages between current user and selected admin
      const { data: messagesData, error: messagesError } = await supabase
        .from('user_messages')
        .select('*')
        .or(`and(sender_id.eq.${userId},receiver_id.eq.${selectedAdmin.id}),and(sender_id.eq.${selectedAdmin.id},receiver_id.eq.${userId})`)
        .order('created_at', { ascending: true });

      if (messagesError) throw messagesError;

      // Mark messages as read when loading the conversation
      if (messagesData && messagesData.length > 0) {
        // Get unread messages from the other user
        const unreadMessages = messagesData.filter(
          msg => msg.receiver_id === userId && !msg.is_read
        );

        if (unreadMessages.length > 0) {
          // Update read status in the database
          const { error: updateError } = await supabase
            .from('user_messages')
            .update({ is_read: true })
            .in('id', unreadMessages.map(msg => msg.id));

          if (updateError) console.error('Error updating read status:', updateError);
        }
      }

      // Add sender/receiver info to messages
      const messagesWithUserData = messagesData?.map(msg => ({
        ...msg,
        sender: msg.sender_id === userId ? {
          id: userId,
          first_name: 'You',
          last_name: '',
          email: '',
          role: 'patient',
          avatar_url: ''
        } : {
          id: selectedAdmin.id,
          first_name: selectedAdmin.first_name,
          last_name: selectedAdmin.last_name,
          email: selectedAdmin.email,
          role: 'admin',
          avatar_url: selectedAdmin.avatar_url
        },
        receiver: msg.receiver_id === userId ? {
          id: userId,
          first_name: 'You',
          last_name: '',
          email: '',
          role: 'patient',
          avatar_url: ''
        } : {
          id: selectedAdmin.id,
          first_name: selectedAdmin.first_name,
          last_name: selectedAdmin.last_name,
          email: selectedAdmin.email,
          role: 'admin',
          avatar_url: selectedAdmin.avatar_url
        }
      })) || [];

      setMessages(messagesWithUserData);

      // Mark messages as read
      await supabase
        .from('user_messages')
        .update({ is_read: true })
        .eq('receiver_id', userId)
        .eq('sender_id', selectedAdmin.id)
        .eq('is_read', false);

    } catch (error) {
      console.error('Error fetching messages:', error);
      toast.error('Failed to load messages');
    } finally {
      setLoading(false);
    }
  }, [selectedAdmin, userId]);

  // Handle sending a new message
  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !selectedAdmin || !userId) return;

    const messageToSend = input.trim();
    const tempId = `temp-${Date.now()}`;
    const now = new Date().toISOString();

    // Optimistically add the message to the UI
    const optimisticMessage: Message = {
      id: tempId,
      content: messageToSend,
      is_read: false,
      created_at: now,
      sender: {
        id: userId,
        first_name: 'You',
        last_name: '',
        email: '',
        role: 'patient' as const,
        avatar_url: undefined
      },
      receiver: {
        id: selectedAdmin.id,
        first_name: selectedAdmin.first_name || '',
        last_name: selectedAdmin.last_name || '',
        email: selectedAdmin.email || '',
        role: 'admin' as const,
        avatar_url: selectedAdmin.avatar_url || undefined
      },
      sender_id: userId,
      receiver_id: selectedAdmin.id
    };

    setMessages(prev => [...prev, optimisticMessage]);
    setInput('');

    try {
      const supabase = createClient();
      const { data: newMessage, error } = await supabase
        .from('user_messages')
        .insert([
          {
            sender_id: userId,
            receiver_id: selectedAdmin.id,
            content: messageToSend,
            is_read: false
          }
        ])
        .select()
        .single();

      if (error) throw error;

      // The real-time subscription will handle updating the UI with the actual message
      // We'll remove the optimistic message when the real one comes in
      
      // Create a notification for the admin
      try {
        await supabase.from('notifications').insert([
          {
            user_id: selectedAdmin.id,
            created_by: userId,  // Track who created the notification
            title: 'New Message',
            message: `You have a new message from a patient`,
            type: 'message',
            reference_id: newMessage.id,
            is_read: false
          }
        ]);
      } catch (notificationError) {
        console.error('Failed to create notification:', notificationError);
        // Don't fail the entire message send if notification fails
      }

    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
      setInput(messageToSend); // Restore the message if sending failed
      
      // Remove the optimistic message on error
      setMessages(prev => prev.filter(msg => msg.id !== tempId));
    }
  };

  // Initial fetch and setup real-time subscription
  useEffect(() => {
    if (!userId || !selectedAdmin) return;
    
    const supabase = createClient();
    
    // Fetch messages when admin is selected
    fetchMessages();
    
    // Set up real-time subscription for new messages
    const channel = supabase
      .channel('messages')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'user_messages',
          filter: `or(and(sender_id=eq.${userId},receiver_id=eq.${selectedAdmin.id}),and(sender_id=eq.${selectedAdmin.id},receiver_id=eq.${userId}))`
        },
        (payload: { new: DatabaseMessage }) => {
          const newMessage = payload.new;
          
          // Only add the message if it's not already in the list
          setMessages(prev => {
            if (prev.some(msg => msg.id === newMessage.id)) return prev;
            
            const isFromMe = newMessage.sender_id === userId;
            
            return [
              ...prev,
              {
                ...newMessage,
                sender: isFromMe ? {
                  id: userId,
                  first_name: 'You',
                  last_name: '',
                  email: '',
                  role: 'patient' as const,
                  avatar_url: ''
                } : {
                  id: selectedAdmin.id,
                  first_name: selectedAdmin.first_name || 'Clinic',
                  last_name: selectedAdmin.last_name || 'Staff',
                  email: selectedAdmin.email || '',
                  role: 'admin' as const,
                  avatar_url: selectedAdmin.avatar_url || ''
                },
                receiver: isFromMe ? {
                  id: selectedAdmin.id,
                  first_name: selectedAdmin.first_name || 'Clinic',
                  last_name: selectedAdmin.last_name || 'Staff',
                  email: selectedAdmin.email || '',
                  role: 'admin' as const,
                  avatar_url: selectedAdmin.avatar_url || ''
                } : {
                  id: userId,
                  first_name: 'You',
                  last_name: '',
                  email: '',
                  role: 'patient' as const,
                  avatar_url: ''
                }
              }
            ];
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'user_messages',
          filter: `or(and(sender_id=eq.${userId},receiver_id=eq.${selectedAdmin.id}),and(sender_id=eq.${selectedAdmin.id},receiver_id=eq.${userId}))`
        },
        (payload: { new: DatabaseMessage }) => {
          // Update the message in the UI (for read receipts)
          setMessages(prev => 
            prev.map(msg => 
              msg.id === payload.new.id ? { ...msg, ...payload.new } : msg
            )
          );
        }
      )
      .subscribe();

    // Clean up the subscription when the component unmounts or when the selected admin changes
    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedAdmin, userId, fetchMessages]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <UserLayout>
      <div className={cn("max-w-4xl mx-auto p-6", theme === 'dark' ? 'text-gray-100' : 'text-gray-900')}>
        <h1 className={cn("text-2xl font-bold mb-4", theme === 'dark' ? 'text-red-400' : 'text-red-700')}>Messages</h1>
        <div className={cn("flex rounded shadow overflow-hidden min-h-[400px]", theme === 'dark' ? 'bg-gray-800 border border-gray-700' : 'bg-white border')}>
          {/* Admin List */}
          <div
            className={
              'w-full md:w-1/3 p-4 ' +
              (selectedAdmin ? 'hidden md:block' : 'block') +
              (theme === 'dark' ? ' border-r border-gray-700 bg-gray-900' : ' border-r border-gray-200 bg-red-50')
            }
          >
            <h2 className={cn("text-lg font-semibold mb-2", theme === 'dark' ? 'text-red-500' : 'text-red-600')}>Clinic Staff</h2>
            <ul>
              {admins.map((admin) => (
                <li key={admin.id} className="mb-2">
                  <button
                    className={cn(
                      'w-full text-left px-3 py-2 rounded font-medium',
                      theme === 'dark' ? 'text-gray-100 hover:bg-gray-700 focus:bg-gray-700' : 'text-gray-800 hover:bg-red-100 focus:bg-red-200',
                      selectedAdmin && selectedAdmin.id === admin.id ? (theme === 'dark' ? 'bg-gray-700' : 'bg-red-200') : ''
                    )}
                    onClick={() => setSelectedAdmin(admin)}
                  >
                    {admin.first_name} {admin.last_name}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Messages */}
          <div
            className={
              'flex-1 flex flex-col p-4 ' +
              (selectedAdmin ? 'block' : 'hidden md:flex')
            }
          >
            {/* Back button and admin name for mobile */}
            {selectedAdmin && (
              <div className="md:hidden mb-4 flex items-center">
                <button
                  className={cn("mr-2 p-1 rounded", theme === 'dark' ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-500 hover:bg-red-100')}
                  onClick={() => setSelectedAdmin(null)}
                  aria-label="Back to staff list"
                >
                  <ArrowLeft className="h-5 w-5" />
                </button>
                <span className={cn("font-semibold text-lg", theme === 'dark' ? 'text-red-400' : 'text-red-700')}>{selectedAdmin.first_name} {selectedAdmin.last_name}</span>
              </div>
            )}
            {/* Admin name for desktop */}
            <div className="hidden md:block mb-4">
              <span className={cn("font-semibold text-lg", theme === 'dark' ? 'text-red-400' : 'text-red-700')}>
                {selectedAdmin ? `${selectedAdmin.first_name} ${selectedAdmin.last_name}` : 'Select a staff member'}
              </span>
            </div>
            <div className="flex-1 overflow-y-auto space-y-4">
              {loading ? (
                <div className={cn("text-center", theme === 'dark' ? 'text-gray-400' : 'text-gray-500')}>Loading...</div>
              ) : (
                messages.map((msg) => (
                  <div key={msg.id} className={`flex ${msg.sender_id === userId ? 'justify-end' : 'justify-start'}`}>
                    <div
                      className={cn(
                        "px-4 py-2 rounded-lg max-w-xs",
                        msg.sender_id === userId
                          ? (theme === 'dark' ? 'bg-blue-800 text-white' : 'bg-blue-100 text-blue-900')
                          : (theme === 'dark' ? 'bg-gray-700 text-white' : 'bg-gray-100 text-gray-800')
                      )}
                    >
                      {msg.content}
                    </div>
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>
            <form className="mt-4 flex gap-2" onSubmit={handleSend}>
              <Input
                type="text"
                className={cn(
                  "flex-1 rounded px-3 py-2 focus:outline-none focus:ring-2",
                  theme === 'dark' ? 'bg-gray-900 border-gray-600 text-white focus:ring-blue-400' : 'bg-white border-gray-300 text-gray-900 focus:ring-blue-200'
                )}
                placeholder="Type your message..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                disabled={loading}
              />
              <Button
                type="submit"
                className={cn("text-white px-4 py-2 rounded font-semibold shadow", theme === 'dark' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-blue-600 hover:bg-blue-700')}
                disabled={loading || !input.trim()}
              >
                Send
              </Button>
            </form>
          </div>
        </div>
      </div>
    </UserLayout>
  );
}