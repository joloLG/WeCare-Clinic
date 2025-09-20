import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';

export default async function Home() {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();

  // If user is not logged in, redirect to login page
  if (!session) {
    redirect('/auth/login');
  }

  // Check user role from profiles table
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', session.user.id)
    .single();

  if (error) {
    console.error('Error fetching user profile:', error);
    // Redirect to login if there's an error fetching profile
    redirect('/auth/login?error=profile_error');
  }

  // If user is admin, redirect to admin dashboard
  if (profile?.role === 'admin') {
    redirect('/dashboard/admin');
  }

  // For regular users, redirect to regular dashboard
  redirect('/dashboard');
}
