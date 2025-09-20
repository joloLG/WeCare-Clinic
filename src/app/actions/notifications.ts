'use server';

import { createClient } from '@/utils/supabase/server';

type NotificationType = 'appointment' | 'inventory' | 'message' | 'user' | 'alert' | 'success';

interface NotificationData {
  [key: string]: string | number | boolean | null | undefined | Record<string, unknown>;
}

// Admin and patient notifications are now split into two tables per updated schema.

interface Profile {
  id: string;
  role?: string;
}

type SupabaseResponse<T> = {
  data: T | null;
  error: Error | null;
};

// Send notification to a PATIENT
export async function sendNotification(
  userId: string,
  type: NotificationType,
  title: string,
  message: string,
  notificationData: NotificationData = {}
) {
  try {
    const supabase = await createClient();
    const insertRow = {
      patient_id: userId,
      type,
      title,
      message,
      data: notificationData,
      is_read: false,
    };

    const { data, error } = await supabase
      .from('patient_notifications')
      .insert([insertRow])
      .select()
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Error sending notification:', error);
    return { data: null, error };
  }
}

export async function sendAdminNotification(
  type: NotificationType,
  title: string,
  message: string,
  notificationData: NotificationData = {}
) {
  try {
    const supabase = await createClient();

    // Get all admin users
    const { data: admins, error: adminError } = await supabase
      .from('profiles')
      .select('id')
      .eq('role', 'admin');

    if (adminError) throw adminError;
    if (!admins || admins.length === 0) return { data: null, error: 'No admin users found' };

    // Send notification to each admin
    const notifications = await Promise.all(
      admins.map((admin: Pick<Profile, 'id'>) =>
        (async (): Promise<SupabaseResponse<Record<string, unknown>>> => {
          const insertRow = {
            admin_id: admin.id,
            type,
            title,
            message,
            data: notificationData,
            is_read: false,
          };
          const { data, error } = await supabase
            .from('admin_notifications')
            .insert([insertRow])
            .select()
            .single();
          return { data, error };
        })()
      )
    );

    const errors = notifications.filter((n) => n.error);
    if (errors.length > 0) {
      console.error('Errors sending admin notifications:', errors);
      return { data: null, error: 'Failed to send some admin notifications' };
    }

    const successfulNotifications = notifications
      .map((n) => n.data)
      .filter((d): d is Record<string, unknown> => d !== null);
      
    return { data: successfulNotifications, error: null };
  } catch (error) {
    console.error('Error sending admin notification:', error);
    return { data: null, error };
  }
}
