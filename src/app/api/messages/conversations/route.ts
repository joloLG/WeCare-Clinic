import { NextResponse } from 'next/server';
import { createClient as createSupabaseServerClient } from '@/utils/supabase/server';

export async function GET() {
  const supabase = await createSupabaseServerClient();
  try {
    // Get current admin user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    // Get all unique user IDs from user_messages where admin is receiver
    const { data: userMsgs, error: userErr } = await supabase
      .from('user_messages')
      .select('sender_id')
      .eq('receiver_id', user.id);
    if (userErr) {
      return NextResponse.json({ error: userErr.message }, { status: 400 });
    }
    // Get all unique user IDs from admin_messages where admin is sender or receiver
    const { data: adminMsgs, error: adminErr } = await supabase
      .from('admin_messages')
      .select('sender_id, receiver_id')
      .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`);
    if (adminErr) {
      return NextResponse.json({ error: adminErr.message }, { status: 400 });
    }
    // Aggregate all unique user IDs (excluding admin's own ID)
    const userIds = new Set<string>();
    (userMsgs || []).forEach((msg) => {
      if (msg.sender_id && msg.sender_id !== user.id) userIds.add(msg.sender_id);
    });
    (adminMsgs || []).forEach((msg) => {
      if (msg.sender_id && msg.sender_id !== user.id) userIds.add(msg.sender_id);
      if (msg.receiver_id && msg.receiver_id !== user.id) userIds.add(msg.receiver_id);
    });
    if (userIds.size === 0) {
      return NextResponse.json({ users: [] });
    }
    // Fetch user profiles
    const { data: profiles, error: profileErr } = await supabase
      .from('profiles')
      .select('id, first_name, last_name, email, avatar_url, role')
      .in('id', Array.from(userIds));
    if (profileErr) {
      return NextResponse.json({ error: profileErr.message }, { status: 400 });
    }
    return NextResponse.json({ users: profiles });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
