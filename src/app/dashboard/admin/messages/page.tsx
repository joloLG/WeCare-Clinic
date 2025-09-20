'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { createClient } from '@/utils/supabase/client';
import { MessageSquare, Send, Search, ChevronLeft } from 'lucide-react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { realtimeService } from '@/lib/realtime';
import { UserProfile, Message as MessageType } from '@/types/messages';

// Extend the base MessageType to include the temp ID and error state
interface TempMessage extends Omit<MessageType, 'id'> {
  id: `temp-${string}`;
  error?: boolean;
}

// Extend the base UserProfile to include role
interface ExtendedUserProfile extends Omit<UserProfile, 'role'> {
  role: 'admin' | 'user' | 'provider';
  avatar_url?: string;
}


export default function MessagesPage() {
  const [conversations, setConversations] = useState<ExtendedUserProfile[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<ExtendedUserProfile | null>(null);
  const [messages, setMessages] = useState<Array<MessageType | TempMessage>>([]);
  const [newMessage, setNewMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const supabase = createClient();

  // Fetch current user and conversations
  useEffect(() => {
    const fetchConversations = async () => {
      setIsLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setIsLoading(false);
        return;
      }
      setCurrentUserId(user.id);
      // Fetch all users who have messaged with the admin (from both tables)
      const res = await fetch('/api/messages/conversations', { credentials: 'include' });
      const data = await res.json();
      setConversations(data.users || []);
      setIsLoading(false);
    };
    fetchConversations();
  }, [supabase]);

  // Fetch messages for the selected conversation
  const fetchMessages = useCallback(async () => {
    if (!selectedConversation || !currentUserId) return;
    
    setIsLoading(true);
    try {
      const res = await fetch(`/api/messages?admin_id=${selectedConversation.id}&type=admin`, { 
        credentials: 'include',
        cache: 'no-store' // Prevent caching to ensure fresh messages
      });
      
      if (!res.ok) {
        throw new Error('Failed to fetch messages');
      }
      
      const data = await res.json();
      
      // Filter out any temporary messages that might be duplicates
      setMessages(prev => {
        const tempMessages = prev.filter((msg): msg is TempMessage => 
          'id' in msg && msg.id.startsWith('temp-')
        );
        
        const serverMessages: MessageType[] = Array.isArray(data.messages) ? data.messages : [];
        
        // Merge server messages with any local temp messages that haven't been confirmed yet
        const merged: Array<MessageType | TempMessage> = [...serverMessages];
        
        tempMessages.forEach((tempMsg) => {
          if (!serverMessages.some(msg => msg.content === tempMsg.content)) {
            merged.push(tempMsg);
          }
        });
        
        // Sort by created_at
        return merged.sort((a, b) => 
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );
      });
      
      // Mark as read in both tables
      await Promise.all([
        fetch('/api/messages', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ admin_id: selectedConversation.id, type: 'admin' }),
          credentials: 'include',
        }),
        fetch('/api/messages', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ admin_id: selectedConversation.id, type: 'user' }),
          credentials: 'include',
        })
      ]);
    } catch (error) {
      console.error('Error fetching messages:', error);
      toast.error('Failed to load messages');
    } finally {
      setIsLoading(false);
    }
  }, [selectedConversation, currentUserId]);

  // Handle new message callback
  const handleNewMessage = useCallback((newMsg: MessageType) => {
    // Only add if it's not from the current user and for the current conversation
    if (newMsg.sender_id !== currentUserId && 
        (newMsg.sender_id === selectedConversation?.id || 
         newMsg.receiver_id === selectedConversation?.id)) {
      setMessages(prev => {
        // Don't add duplicate messages
        if (!prev.some(msg => {
          // Check if message ID matches or if it's a temp message with same content
          if (msg.id === newMsg.id) return true;
          if (msg.id.startsWith('temp-') && 'content' in msg && msg.content === newMsg.content) return true;
          return false;
        })) {
          return [...prev, newMsg];
        }
        return prev;
      });
    }
  }, [currentUserId, selectedConversation?.id]);

  // Initial fetch and setup real-time subscription
  useEffect(() => {
    if (!currentUserId) return;
    
    // Initial fetch
    fetchMessages();

    // Subscribe to real-time updates
    const unsubscribe = realtimeService.subscribeToMessages(currentUserId, handleNewMessage);
    
    // Only use real-time updates, no interval refresh
    return () => {
      // Cleanup subscription
      unsubscribe();
    };
  }, [currentUserId, fetchMessages, handleNewMessage]);

  // Scroll to bottom of messages when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Filter conversations based on search query
  const filteredConversations = conversations.filter(conversation => 
    `${conversation.first_name} ${conversation.last_name}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
    conversation.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Handle sending a new message
  const handleSendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault();
    
    if (!newMessage.trim() || !selectedConversation || !currentUserId) return;

    const tempId = `temp-${Date.now()}` as const;
    const messageContent = newMessage.trim();
    
    // Create optimistic message
    const optimisticMessage: TempMessage = {
      id: tempId,
      content: messageContent,
      created_at: new Date().toISOString(),
      sender_id: currentUserId,
      receiver_id: selectedConversation.id,
      is_read: false,
      sender: {
        id: currentUserId,
        first_name: 'You',
        last_name: '',
        avatar_url: '',
        email: '',
        role: 'admin' as const
      },
      receiver: {
        id: selectedConversation.id,
        first_name: selectedConversation.first_name || '',
        last_name: selectedConversation.last_name || '',
        email: selectedConversation.email || '',
        role: 'user' as const,
        avatar_url: selectedConversation.avatar_url || ''
      }
    };
    
    // Add the optimistic message to the UI immediately
    setMessages(prev => [...prev, optimisticMessage]);
    setNewMessage(''); // Clear the input field
    
    try {
      // Send the message to the server
      const response = await fetch('/api/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: messageContent,
          receiverId: selectedConversation.id,  // Changed from receiver_id to receiverId to match backend
          type: 'admin'
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to send message');
      }

      // The real message will be added via the realtime subscription
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
      
      // Update the optimistic message to show it failed
      setMessages(prev => 
        prev.map(msg => 
          'id' in msg && msg.id === tempId 
            ? { ...msg, is_read: false, error: true } 
            : msg
        )
      );
      
      // Offer to retry
      if (confirm('Failed to send message. Would you like to retry?')) {
        setNewMessage(messageContent);
      }
      return;
    }
  };

  // Format message timestamp
  const formatMessageTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffInDays === 0) {
      return format(date, 'h:mm a');
    } else if (diffInDays < 7) {
      return format(date, 'EEE h:mm a');
    } else {
      return format(date, 'MMM d, yyyy h:mm a');
    }
  };

  return (
    <div className="flex h-[calc(100vh-8rem)]">
      {/* Conversations sidebar */}
      <div className={`${selectedConversation ? 'hidden md:block' : 'w-full'} md:w-80 border-r`}>
        <div className="p-4 border-b">
          <h2 className="text-xl font-semibold">Messages</h2>
          <div className="relative mt-2">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search conversations..."
              className="w-full pl-8"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
        
        <ScrollArea className="h-[calc(100%-4.5rem)]">
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : filteredConversations.length > 0 ? (
            <div className="divide-y">
              {filteredConversations.map((user) => {
                const unreadCount = 0; // You can implement unread count logic here
                return (
                  <button
                    key={user.id}
                    className={`w-full text-left p-4 hover:bg-muted/50 flex items-center gap-3 ${
                      selectedConversation?.id === user.id ? 'bg-muted' : ''
                    }`}
                    onClick={() => setSelectedConversation(user)}
                  >
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={user.avatar_url} alt={`${user.first_name} ${user.last_name}`} />
                      <AvatarFallback>
                        {user.first_name?.[0]}{user.last_name?.[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-center">
                        <p className="font-medium truncate">{user.first_name} {user.last_name}</p>
                        {unreadCount > 0 && (
                          <Badge variant="destructive" className="h-5 w-5 p-0 flex items-center justify-center">
                            {unreadCount}
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground truncate">
                        {user.role === 'admin' ? 'Staff' : 'Patient'}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-64 text-center p-4">
              <MessageSquare className="h-10 w-10 text-muted-foreground mb-2" />
              <h3 className="font-medium">No conversations found</h3>
              <p className="text-sm text-muted-foreground">
                {searchQuery ? 'Try a different search term' : 'Start a new conversation'}
              </p>
            </div>
          )}
        </ScrollArea>
      </div>

      {/* Chat area */}
      {selectedConversation ? (
        <div className="flex-1 flex flex-col h-full">
          {/* Chat header */}
          <div className="border-b p-4 flex items-center gap-3">
            <Button 
              variant="ghost" 
              size="icon" 
              className="md:hidden"
              onClick={() => setSelectedConversation(null)}
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <Avatar>
              <AvatarImage src={selectedConversation.avatar_url} alt={`${selectedConversation.first_name} ${selectedConversation.last_name}`} />
              <AvatarFallback>
                {selectedConversation.first_name?.[0]}{selectedConversation.last_name?.[0]}
              </AvatarFallback>
            </Avatar>
            <div>
              <h3 className="font-medium">{selectedConversation.first_name} {selectedConversation.last_name}</h3>
              <p className="text-sm text-muted-foreground">
                {selectedConversation.role === 'admin' ? 'Staff' : 'Patient'}
              </p>
            </div>
          </div>

          {/* Messages */}
          <ScrollArea className="flex-1 p-4">
            <div className="space-y-4">
              {isLoading ? (
                <div className="flex items-center justify-center h-64">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : messages.length > 0 ? (
                messages.map((message) => {
                  const isCurrentUser = currentUserId ? message.sender_id === currentUserId : false;
                  
                  return (
                    <div
                      key={message.id}
                      className={`flex ${isCurrentUser ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[80%] md:max-w-[60%] rounded-lg px-4 py-2 ${
                          isCurrentUser
                            ? 'bg-primary text-primary-foreground rounded-br-none'
                            : 'bg-muted rounded-bl-none'
                        }`}
                      >
                        <p className="text-sm">{message.content}</p>
                        <p className={`text-xs mt-1 ${isCurrentUser ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                          {formatMessageTime(message.created_at)}
                        </p>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="flex flex-col items-center justify-center h-64 text-center">
                  <MessageSquare className="h-10 w-10 text-muted-foreground mb-2" />
                  <h3 className="font-medium">No messages yet</h3>
                  <p className="text-sm text-muted-foreground">
                    Send a message to start the conversation
                  </p>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>

          {/* Message input */}
          <div className="border-t p-4">
            <form onSubmit={handleSendMessage} className="flex gap-2">
              <Input
                placeholder="Type a message..."
                className="flex-1"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                disabled={isLoading}
              />
              <Button type="submit" size="icon" disabled={!newMessage.trim() || isLoading}>
                <Send className="h-4 w-4" />
              </Button>
            </form>
          </div>
        </div>
      ) : (
        <div className="hidden md:flex flex-1 items-center justify-center">
          <div className="text-center max-w-md p-8">
            <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-xl font-medium mb-2">Select a conversation</h3>
            <p className="text-muted-foreground">
              Choose a conversation from the sidebar or start a new one to view messages.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
