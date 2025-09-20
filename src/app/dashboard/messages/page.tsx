'use client';

import { useState, useEffect, useRef } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, Send, Search } from 'lucide-react';
import { format } from 'date-fns';

type Profile = {
  id: string;
  first_name: string;
  last_name: string;
  avatar_url: string | null;
  role: 'patient' | 'admin';
};

type Message = {
  id: string;
  content: string;
  created_at: string;
  is_read: boolean;
  sender: Profile;
  receiver: Profile;
};

type Conversation = {
  otherUser: Profile;
  lastMessage: Message | null;
  unreadCount: number;
};

export default function MessagesPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Profile | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const supabase = createClient();
  const router = useRouter();

  // Fetch conversations
  useEffect(() => {
    const fetchConversations = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          router.push('/auth/login');
          return;
        }

        // Fetch messages
        const { data: messages, error } = await supabase
          .from('messages')
          .select(`
            *,
            sender:profiles!messages_sender_id_fkey(id, first_name, last_name, avatar_url, role),
            receiver:profiles!messages_receiver_id_fkey(id, first_name, last_name, avatar_url, role)
          `)
          .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
          .order('created_at', { ascending: false });

        if (error) throw error;

        // Process messages into conversations
        const conversationsMap = new Map<string, {
          otherUser: Profile;
          lastMessage: Message | null;
          unreadCount: number;
        }>();

        messages.forEach((message: Message) => {
          const otherUserId = message.sender.id === user.id 
            ? message.receiver.id 
            : message.sender.id;
          
          const otherUser = message.sender.id === user.id 
            ? message.receiver 
            : message.sender;

          if (!conversationsMap.has(otherUserId)) {
            conversationsMap.set(otherUserId, {
              otherUser,
              lastMessage: null,
              unreadCount: 0,
            });
          }

          const conversation = conversationsMap.get(otherUserId)!;
          
          // Set the most recent message
          if (!conversation.lastMessage || 
              new Date(message.created_at) > new Date(conversation.lastMessage.created_at)) {
            conversation.lastMessage = message;
          }

          // Count unread messages
          if (message.receiver.id === user.id && !message.is_read) {
            conversation.unreadCount++;
          }
        });

        setConversations(Array.from(conversationsMap.values()));
      } catch (error) {
        console.error('Error fetching conversations:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchConversations();

    // Set up real-time subscription
    const channel = supabase
      .channel('messages')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, () => {
        fetchConversations();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [router, supabase]);

  // Fetch messages for selected conversation
  useEffect(() => {
    if (!selectedConversation) return;

    const fetchMessages = async () => {
      try {
        setLoading(true);
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          router.push('/auth/login');
          return;
        }

        const { data: messages, error } = await supabase
          .from('messages')
          .select(`
            *,
            sender:profiles!messages_sender_id_fkey(id, first_name, last_name, avatar_url, role),
            receiver:profiles!messages_receiver_id_fkey(id, first_name, last_name, avatar_url, role)
          `)
          .or(`and(sender_id.eq.${user.id},receiver_id.eq.${selectedConversation.id}),and(sender_id.eq.${selectedConversation.id},receiver_id.eq.${user.id})`)
          .order('created_at', { ascending: false });

        if (error) throw error;

        setMessages(messages.reverse());

        // Mark messages as read
        const unreadMessages = messages.filter(
          (msg: Message) => !msg.is_read && msg.receiver.id === user.id
        );

        const markAsRead = async (messageId: string) => {
          try {
            const { error } = await supabase
              .from('messages')
              .update({ is_read: true })
              .eq('id', messageId);

            if (error) throw error;

            setMessages(prev =>
              prev.map(msg =>
                msg.id === messageId ? { ...msg, is_read: true } : msg
              )
            );
          } catch (error) {
            console.error('Error marking message as read:', error);
          }
        };

        unreadMessages.forEach((msg: Message) => markAsRead(msg.id));
      } catch (error) {
        console.error('Error fetching messages:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchMessages();
  }, [selectedConversation, router, supabase]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newMessage.trim() || !selectedConversation) return;

    try {
      setSending(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        router.push('/auth/login');
        return;
      }

      const { data: message, error } = await supabase
        .from('messages')
        .insert([
          {
            sender_id: user.id,
            receiver_id: selectedConversation.id,
            content: newMessage,
            is_read: false,
          },
        ])
        .select()
        .single();

      if (error) throw error;

      // Add the new message to the UI immediately
      setMessages(prev => [
        ...prev,
        {
          ...message,
          sender: {
            id: user.id,
            first_name: 'You',
            last_name: '',
            avatar_url: null,
            role: 'patient',
          },
          receiver: selectedConversation,
        } as Message,
      ]);

      // Clear the input
      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setSending(false);
    }
  };

  const getFullName = (user: Profile) => {
    return `${user.first_name} ${user.last_name}`.trim();
  };

  const getInitials = (user: Profile) => {
    return `${user.first_name?.[0] || ''}${user.last_name?.[0] || ''}`.toUpperCase();
  };

  const filteredConversations = conversations.filter(conv => {
    const fullName = getFullName(conv.otherUser).toLowerCase();
    return fullName.includes(searchTerm.toLowerCase());
  });

  if (loading && conversations.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-200px)] border rounded-lg overflow-hidden">
      {/* Conversation list */}
      <div className="w-1/3 border-r">
        <div className="p-4 border-b">
          <h2 className="text-xl font-semibold">Messages</h2>
          <div className="mt-2 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              type="text"
              placeholder="Search conversations..."
              className="pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
        
        <ScrollArea className="h-[calc(100%-80px)]">
          {filteredConversations.length === 0 ? (
            <div className="p-4 text-center text-gray-500">
              {searchTerm ? 'No matching conversations found' : 'No conversations yet'}
            </div>
          ) : (
            <div className="divide-y">
              {filteredConversations.map((conversation) => (
                <div
                  key={conversation.otherUser.id}
                  className={`p-4 hover:bg-gray-50 cursor-pointer ${
                    selectedConversation?.id === conversation.otherUser.id ? 'bg-blue-50' : ''
                  }`}
                  onClick={() => setSelectedConversation(conversation.otherUser)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <Avatar>
                        <AvatarImage 
                          src={conversation.otherUser.avatar_url || undefined} 
                          alt={getFullName(conversation.otherUser)}
                        />
                        <AvatarFallback>
                          {getInitials(conversation.otherUser)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">
                          {getFullName(conversation.otherUser)}
                        </p>
                        <p className="text-sm text-gray-500 truncate max-w-[200px]">
                          {conversation.lastMessage?.content || 'No messages yet'}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gray-400">
                        {conversation.lastMessage
                          ? format(new Date(conversation.lastMessage.created_at), 'MMM d')
                          : ''}
                      </p>
                      {conversation.unreadCount > 0 && (
                        <span className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-indigo-600 text-white text-xs">
                          {conversation.unreadCount}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </div>

      {/* Message area */}
      <div className="flex-1 flex flex-col">
        {selectedConversation ? (
          <>
            {/* Header */}
            <div className="p-4 border-b flex items-center space-x-3">
              <Avatar>
                <AvatarImage 
                  src={selectedConversation.avatar_url || undefined} 
                  alt={getFullName(selectedConversation)}
                />
                <AvatarFallback>
                  {getInitials(selectedConversation)}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium">{getFullName(selectedConversation)}</p>
                <p className="text-xs text-gray-500">
                  {selectedConversation.role}
                </p>
              </div>
            </div>

            {/* Messages */}
            <ScrollArea className="flex-1 p-4">
              <div className="space-y-4">
                {messages.length === 0 ? (
                  <div className="text-center text-gray-500 mt-10">
                    No messages yet. Start the conversation!
                  </div>
                ) : (
                  <div className="space-y-4">
                    {messages.map((message) => (
                      <div
                        key={message.id}
                        className={`flex ${
                          message.sender.id === selectedConversation.id
                            ? 'justify-start'
                            : 'justify-end'
                        }`}
                      >
                        <div
                          className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                            message.sender.id === selectedConversation.id
                              ? 'bg-gray-100'
                              : 'bg-indigo-600 text-white'
                          }`}
                        >
                          <p className="text-sm">{message.content}</p>
                          <p
                            className={`text-xs mt-1 ${
                              message.sender.id === selectedConversation.id
                                ? 'text-gray-500'
                                : 'text-indigo-100'
                            }`}
                          >
                            {format(new Date(message.created_at), 'h:mm a')}
                          </p>
                        </div>
                      </div>
                    ))}
                    <div ref={messagesEndRef} />
                  </div>
                )}
              </div>
            </ScrollArea>

            {/* Message input */}
            <div className="p-4 border-t">
              <form onSubmit={handleSendMessage} className="flex space-x-2">
                <Input
                  type="text"
                  placeholder="Type a message..."
                  className="flex-1"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  disabled={sending}
                />
                <Button type="submit" disabled={!newMessage.trim() || sending}>
                  {sending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-500">
            Select a conversation to start messaging
          </div>
        )}
      </div>
    </div>
  );
}
