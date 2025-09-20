import { createClient } from '@/utils/supabase/client';
import { Message, MessagePayload, UserProfile } from '@/types/messages';

type MessageCallback = (message: Message) => void;

type SupabaseChannel = ReturnType<ReturnType<typeof createClient>['channel']>;

type SenderInfo = {
  first_name: string;
  last_name: string;
  avatar_url?: string;
  role?: UserProfile['role'];
};

type ReceiverInfo = {
  first_name: string;
  last_name: string;
  avatar_url?: string;
  role?: UserProfile['role'];
};

export class RealtimeService {
  private static instance: RealtimeService;
  private supabase = createClient();
  private subscriptions: Map<string, MessageCallback[]> = new Map();
  private channels: Map<string, SupabaseChannel> = new Map();

  private constructor() {
    // Initialize the realtime service
  }

  public static getInstance(): RealtimeService {
    if (!RealtimeService.instance) {
      RealtimeService.instance = new RealtimeService();
    }
    return RealtimeService.instance;
  }

  public subscribeToMessages(
    userId: string,
    callback: MessageCallback
  ): () => void {
    if (!this.subscriptions.has(userId)) {
      this.subscriptions.set(userId, []);
    }
    const callbacks = this.subscriptions.get(userId) || [];
    callbacks.push(callback);
    this.subscriptions.set(userId, callbacks);

    // Set up the channel if it doesn't exist
    if (!this.channels.has(userId)) {
      this.setupChannel(userId);
    }

    // Return unsubscribe function
    return () => {
      const callbacks = this.subscriptions.get(userId) || [];
      const filtered = callbacks.filter((cb) => cb !== callback);
      if (filtered.length === 0) {
        this.subscriptions.delete(userId);
        this.cleanupChannel(userId);
      } else {
        this.subscriptions.set(userId, filtered);
      }
    };
  }

  private setupChannel(userId: string) {
    const channel = this.supabase
      .channel(`messages:${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'user_messages',
          filter: `receiver_id=eq.${userId}`,
        },
        (payload) => this.handleNewMessage(payload.new as Message, userId)
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'admin_messages',
          filter: `receiver_id=eq.${userId}`,
        },
        (payload) => this.handleNewMessage(payload.new as Message, userId)
      )
      .subscribe();

    this.channels.set(userId, channel);
  }

  private cleanupChannel(userId: string) {
    const channel = this.channels.get(userId);
    if (channel) {
      this.supabase.removeChannel(channel);
      this.channels.delete(userId);
    }
  }

  private handleNewMessage(
    messagePayload: MessagePayload & {
      sender?: SenderInfo;
      receiver?: ReceiverInfo;
    },
    userId: string
  ) {
    // Convert the message payload to the full Message type
    const message: Message = {
      ...messagePayload,
      sender: messagePayload.sender ? {
        id: messagePayload.sender_id,
        first_name: messagePayload.sender.first_name,
        last_name: messagePayload.sender.last_name,
        email: '',
        role: messagePayload.sender.role || 'user',
        avatar_url: messagePayload.sender.avatar_url
      } : undefined,
      receiver: messagePayload.receiver ? {
        id: messagePayload.receiver_id,
        first_name: messagePayload.receiver.first_name,
        last_name: messagePayload.receiver.last_name,
        email: '',
        role: messagePayload.receiver.role || 'user',
        avatar_url: messagePayload.receiver.avatar_url
      } : undefined
    };
    const callbacks = this.subscriptions.get(userId) || [];
    callbacks.forEach((callback) => callback(message));
  }
}

export const realtimeService = RealtimeService.getInstance();
