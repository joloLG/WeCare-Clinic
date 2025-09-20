import { createClient } from '@/utils/supabase/server';

type NotificationType = 'appointment' | 'inventory' | 'message' | 'user' | 'alert' | 'success';

interface NotificationData {
  [key: string]: string | number | boolean | null | undefined | Record<string, unknown>;
}

interface Profile {
  id: string;
  role?: string;
}

// Insert a notification targeted to a PATIENT
export async function sendPatientNotification(
  patientId: string,
  type: NotificationType,
  title: string,
  message: string,
  data?: NotificationData
) {
  const supabase = await createClient();

  const { data: notification, error } = await supabase
    .from('patient_notifications')
    .insert([
      {
        patient_id: patientId,
        type,
        title,
        message,
        data: data || {},
        is_read: false,
      },
    ])
    .select()
    .single();

  if (error) {
    console.error('Error creating patient notification:', error);
    throw error;
  }

  return notification;
}

// Insert notifications to all ADMINS
export async function sendAdminNotification(
  type: NotificationType,
  title: string,
  message: string,
  data?: NotificationData
) {
  const supabase = await createClient();

  // Get all admin users
  const { data: admins, error: adminError } = await supabase
    .from('profiles')
    .select('id')
    .eq('role', 'admin');

  if (adminError) {
    console.error('Error fetching admin users:', adminError);
    throw adminError;
  }

  if (!admins || admins.length === 0) {
    console.warn('No admin users found');
    return [];
  }

  const inserts = admins.map((admin: Pick<Profile, 'id'>) => ({
    admin_id: admin.id,
    type,
    title,
    message,
    data: data || {},
    is_read: false,
  }));

  const { data: notifications, error } = await supabase
    .from('admin_notifications')
    .insert(inserts)
    .select();

  if (error) {
    console.error('Error creating admin notifications:', error);
    throw error;
  }

  return notifications || [];
}
