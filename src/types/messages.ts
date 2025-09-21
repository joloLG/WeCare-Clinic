// Types for the messaging system

export type UserProfile = {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  avatar_url?: string;
  role: 'admin' | 'patient' | 'provider' | 'user';
  // is_online property removed - not available in database schema
};

export type Message = {
  id: string;
  content: string;
  created_at: string;
  is_read: boolean;
  sender: UserProfile;
  receiver: UserProfile;
  sender_id?: string;
  receiver_id?: string;
  table?: 'user_messages' | 'admin_messages';
};

export type MessagePayload = Omit<Message, 'sender' | 'receiver'> & {
  sender?: {
    first_name: string;
    last_name: string;
    avatar_url?: string;
  };
  receiver?: {
    first_name: string;
    last_name: string;
    avatar_url?: string;
  };
};
