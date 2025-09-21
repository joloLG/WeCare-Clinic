'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Image from 'next/image';
import { UserLayout } from '@/components/user/UserLayout';
import { ArrowLeft, Search } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { UserProfile, Message } from '@/types/messages';

type DatabaseMessage = Omit<Message, 'sender' | 'receiver'> & {
  sender_id: string;
  receiver_id: string;
  is_read: boolean;
  created_at: string;
  table?: 'user_messages' | 'admin_messages';
};

export default function UserMessagesPage() {
  const [admins, setAdmins] = useState<UserProfile[]>([]);
  const [selectedAdmin, setSelectedAdmin] = useState<UserProfile | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isMobile, setIsMobile] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Get current user ID
  useEffect(() => {
    const getCurrentUser = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      setUserId(user?.id || null);
    };
    getCurrentUser();
  }, []);

  // Check if mobile view
  useEffect(() => {
    const checkIfMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkIfMobile();
    window.addEventListener('resize', checkIfMobile);
    return () => window.removeEventListener('resize', checkIfMobile);
  }, []);

  // Reset chat view when admin changes
  useEffect(() => {
    if (selectedAdmin && isMobile) {
      setShowChat(true);
    }
  }, [selectedAdmin, isMobile]);

  // Fetch admins
  const fetchAdmins = useCallback(async () => {
    if (!userId) return;
    try {
      const supabase = createClient();
      const { data: adminData, error: adminError } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, email, avatar_url, role')
        .eq('is_admin', true);

      if (adminError) throw adminError;

      if (!adminData || adminData.length === 0) {
        toast.info('No clinic staff available at the moment');
        return;
      }

      const adminProfiles: UserProfile[] = adminData.map(admin => ({
        id: admin.id,
        first_name: admin.first_name || 'Clinic',
        last_name: admin.last_name || 'Staff',
        email: admin.email || '',
        avatar_url: admin.avatar_url || '/default-avatar.png',
        role: 'admin'
        // is_online is not available in the database schema
      }));

      setAdmins(adminProfiles);

      if (adminProfiles.length === 1) {
        setSelectedAdmin(adminProfiles[0]);
      }
    } catch (error) {
      console.error('Error fetching admin accounts:', error);
      toast.error('Failed to load clinic staff list');
    }
  }, [userId]);

  useEffect(() => {
    if (userId) {
      fetchAdmins();
    }
  }, [userId, fetchAdmins]);

  // Fetch messages for selected admin
  const handleAdminSelect = (admin: UserProfile) => {
    setSelectedAdmin(admin);
    setMessages([]);
    setIsLoading(true);
    if (isMobile) {
      setShowChat(true);
    }
  };
  
  const handleBackToList = () => {
    setShowChat(false);
  };

  const fetchMessages = useCallback(async () => {
    if (!selectedAdmin || !userId) return;

    setIsLoading(true);
    try {
      const supabase = createClient();
      
      // Fetch messages from both user_messages and admin_messages tables
      const [userMessages, adminMessages] = await Promise.all([
        supabase
          .from('user_messages')
          .select('*')
          .or(`and(sender_id.eq.${userId},receiver_id.eq.${selectedAdmin.id}),and(sender_id.eq.${selectedAdmin.id},receiver_id.eq.${userId})`),
        supabase
          .from('admin_messages')
          .select('*')
          .or(`and(sender_id.eq.${userId},receiver_id.eq.${selectedAdmin.id}),and(sender_id.eq.${selectedAdmin.id},receiver_id.eq.${userId})`)
      ]);

      if (userMessages.error) throw userMessages.error;
      if (adminMessages.error) throw adminMessages.error;

      // Combine and sort messages from both tables
      const combinedMessages = [
        ...(userMessages.data || []).map(m => ({ ...m, table: 'user_messages' as const })),
        ...(adminMessages.data || []).map(m => ({ ...m, table: 'admin_messages' as const }))
      ].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

      // Mark messages as read when loading the conversation
      if (combinedMessages.length > 0) {
        // Get unread messages from the other user
        const unreadUserMessages = combinedMessages
          .filter(msg => msg.receiver_id === userId && !msg.is_read && msg.table === 'user_messages');
          
        const unreadAdminMessages = combinedMessages
          .filter(msg => msg.receiver_id === userId && !msg.is_read && msg.table === 'admin_messages');

        // Update read status in both tables if needed
        if (unreadUserMessages.length > 0) {
          await supabase
            .from('user_messages')
            .update({ is_read: true })
            .in('id', unreadUserMessages.map(msg => msg.id));
        }
        
        if (unreadAdminMessages.length > 0) {
          await supabase
            .from('admin_messages')
            .update({ is_read: true })
            .in('id', unreadAdminMessages.map(msg => msg.id));
        }
      }

      // Add sender/receiver info to messages
      const messagesWithUserData = combinedMessages.map(msg => ({
        ...msg,
        sender: msg.sender_id === userId ? {
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
        receiver: msg.receiver_id === userId ? {
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
        }
      }));

      setMessages(messagesWithUserData);
    } catch (error) {
      console.error('Error fetching messages:', error);
      toast.error('Failed to load messages');
    } finally {
      setIsLoading(false);
    }
  }, [selectedAdmin, userId]);

  const handleSend = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedAdmin || !userId) return;

    const messageToSend = newMessage.trim();
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
        avatar_url: ''
      },
      receiver: {
        id: selectedAdmin.id,
        first_name: selectedAdmin.first_name || '',
        last_name: selectedAdmin.last_name || '',
        email: selectedAdmin.email || '',
        role: 'admin' as const,
        avatar_url: selectedAdmin.avatar_url || ''
      },
      sender_id: userId,
      receiver_id: selectedAdmin.id,
      table: 'user_messages' as const
    };

    setMessages(prev => [...prev, optimisticMessage]);
    setNewMessage('');

    try {
      const supabase = createClient();
      const { data: newMessage, error } = await supabase
        .from('user_messages')
        .insert([
          {
            sender_id: userId,
            receiver_id: selectedAdmin.id,
            content: messageToSend,
            is_read: false,
            created_at: now
          }
        ])
        .select()
        .single();

      if (error) throw error;

      // The real-time subscription will handle updating the UI with the actual message
      
      // Create a notification for the admin
      try {
        await supabase.from('notifications').insert([
          {
            user_id: selectedAdmin.id,
            created_by: userId,
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
      setNewMessage(messageToSend); // Restore the message if sending failed
      
      // Remove the optimistic message on error
      setMessages(prev => prev.filter(msg => msg.id !== tempId));
    }
  }, [newMessage, selectedAdmin, userId]);

  // Handle input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewMessage(e.target.value);
  };

  // Handle new messages
  const handleNewMessage = useCallback((newMessage: DatabaseMessage, table: 'user_messages' | 'admin_messages') => {
    if (!selectedAdmin || !userId) return;
    
    setMessages(prev => {
      if (prev.some(msg => msg.id === newMessage.id)) return prev;
      
      const isFromMe = newMessage.sender_id === userId;
      
      const message: Message = {
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
        },
        table
      };
      
      return [...prev, message];
    });
  }, [selectedAdmin, userId]);

  // Set up real-time subscriptions
  useEffect(() => {
    if (!userId || !selectedAdmin) return;
    
    const supabase = createClient();
    
    // Fetch messages when admin is selected
    fetchMessages();
    
    // Set up real-time subscriptions for new messages from both tables
    const userMessagesChannel = supabase
      .channel('user_messages')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'user_messages',
          filter: `or(and(sender_id=eq.${userId},receiver_id=eq.${selectedAdmin.id}),and(sender_id=eq.${selectedAdmin.id},receiver_id=eq.${userId}))`
        },
        (payload: { new: DatabaseMessage }) => {
          handleNewMessage(payload.new, 'user_messages');
        }
      )
      .subscribe();

    const adminMessagesChannel = supabase
      .channel('admin_messages')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'admin_messages',
          filter: `or(and(sender_id=eq.${userId},receiver_id=eq.${selectedAdmin.id}),and(sender_id=eq.${selectedAdmin.id},receiver_id=eq.${userId}))`
        },
        (payload: { new: DatabaseMessage }) => {
          handleNewMessage(payload.new, 'admin_messages');
        }
      )
      .subscribe();

    // Set up subscription for message updates (read receipts)
    const updateChannel = supabase
      .channel('message_updates')
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
              msg.id === payload.new.id 
                ? { ...msg, ...payload.new, is_read: payload.new.is_read }
                : msg
            )
          );
        }
      )
      .subscribe();

    // Clean up the subscription when the component unmounts or when the selected admin changes
    return () => {
      supabase.removeChannel(userMessagesChannel);
      supabase.removeChannel(adminMessagesChannel);
      supabase.removeChannel(updateChannel);
    };
  }, [selectedAdmin, userId, fetchMessages, handleNewMessage]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Filter conversations based on search input
  const filteredAdmins = admins.filter(admin => 
    `${admin.first_name} ${admin.last_name}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
    admin.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <UserLayout>
      <div className="flex h-[calc(100vh-4rem)]">
        {/* Sidebar - Hidden on mobile when chat is open */}
        <div className={`${isMobile && showChat ? 'hidden' : 'flex'} w-full md:w-80 border-r dark:border-gray-800 flex-col`}>
          <div className="p-4 border-b dark:border-gray-800">
            <h2 className="text-xl font-semibold">Messages</h2>
          </div>
          <div className="p-4 border-b dark:border-gray-800">
            <div className="relative">
              <Input
                placeholder="Search staff..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8"
              />
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
            </div>
          </div>
          <div className="overflow-y-auto flex-1">
            {filteredAdmins.map((admin) => (
              <div
                key={admin.id}
                className={`p-4 border-b dark:border-gray-800 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 ${
                  selectedAdmin?.id === admin.id ? 'bg-gray-100 dark:bg-gray-800' : ''
                }`}
                onClick={() => handleAdminSelect(admin)}
              >
                <div className="flex items-center">
                  <div className="relative">
                    <div className="h-10 w-10 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                      {admin.avatar_url ? (
                        <Image
                          src={admin.avatar_url}
                          alt={`${admin.first_name} ${admin.last_name}`}
                          width={40}
                          height={40}
                          className="rounded-full object-cover"
                        />
                      ) : (
                        <span className="text-gray-500">
                          {admin.first_name?.[0]}
                          {admin.last_name?.[0]}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="ml-3 flex-1">
                    <div className="flex justify-between items-center">
                      <h3 className="font-medium">
                        {admin.first_name} {admin.last_name}
                      </h3>
                      <span className="text-xs text-gray-500">
                        {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500 truncate">
                      {admin.role === 'admin' ? 'Clinic Staff' : 'Patient'}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className={`${isMobile && !showChat ? 'hidden' : 'flex'} flex-1 flex-col`}>
          {selectedAdmin ? (
            <>
              <div className="p-4 border-b dark:border-gray-800 flex items-center">
                {isMobile && (
                  <button
                    onClick={handleBackToList}
                    className="mr-2 p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700"
                  >
                    <ArrowLeft className="h-5 w-5" />
                  </button>
                )}
                <div className="flex items-center">
                  <div className="h-8 w-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                    {selectedAdmin.avatar_url ? (
                      <Image
                        src={selectedAdmin.avatar_url}
                        alt={`${selectedAdmin.first_name} ${selectedAdmin.last_name}`}
                        width={32}
                        height={32}
                        className="rounded-full object-cover"
                      />
                    ) : (
                      <span className="text-gray-500 text-sm">
                        {selectedAdmin.first_name?.[0]}
                        {selectedAdmin.last_name?.[0]}
                      </span>
                    )}
                  </div>
                  <div className="ml-3">
                    <h3 className="font-medium">
                      {selectedAdmin.first_name} {selectedAdmin.last_name}
                    </h3>
                    <p className="text-xs text-gray-500">
                      Clinic Staff
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {isLoading ? (
                  <div className="flex justify-center items-center h-full">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-gray-100"></div>
                  </div>
                ) : messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-gray-500">
                    <p>No messages yet</p>
                    <p className="text-sm">Start a conversation with {selectedAdmin.first_name}</p>
                  </div>
                ) : (
                  messages.map(message => (
                    <div
                      key={message.id}
                      className={`flex ${message.sender_id === userId ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-xs md:max-w-md lg:max-w-lg xl:max-w-xl rounded-lg px-4 py-2 ${
                          message.sender_id === userId
                            ? 'bg-blue-500 text-white rounded-br-none'
                            : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-bl-none'
                        }`}
                      >
                        <p className="break-words">{message.content}</p>
                        <p
                          className={`text-xs mt-1 text-right ${
                            message.sender_id === userId ? 'text-blue-100' : 'text-gray-500'
                          }`}
                        >
                          {new Date(message.created_at).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                      </div>
                    </div>
                  ))
                )}
                <div ref={messagesEndRef} />
              </div>

              <div className="p-4 border-t dark:border-gray-800">
                <form onSubmit={handleSend} className="flex items-center gap-2 w-full">
                  <Input
                    type="text"
                    placeholder="Type a message..."
                    value={newMessage}
                    onChange={handleInputChange}
                    className="flex-1"
                  />
                  <Button type="submit" disabled={!newMessage.trim()}>
                    Send
                  </Button>
                </form>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-gray-500">
              <p>Select a conversation to start messaging</p>
            </div>
          )}
        </div>
      </div>
    </UserLayout>
  );
}
