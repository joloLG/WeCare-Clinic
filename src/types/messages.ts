// Types for the messaging system

export type UserProfile = {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  avatar_url?: string;
  role: 'admin' | 'patient' | 'provider' | 'user';
};

export type Message = {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  is_read: boolean;
  created_at: string;
  sender?: UserProfile;
  receiver?: UserProfile;
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
