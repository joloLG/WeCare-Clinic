import { createClient } from '@/utils/supabase/client';

export async function getUserRole() {
  const supabase = createClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) return null;
  
  // Get the user's role from the user_metadata or profiles table
  const { data: profile } = await supabase
  .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();
    
  return profile?.role || null;
}

export async function isAdmin() {
  const role = await getUserRole();
  return role === 'admin';
}
