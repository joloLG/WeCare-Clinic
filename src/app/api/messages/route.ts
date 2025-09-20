// src/app/api/messages/route.ts
import { NextResponse } from 'next/server';
import { createClient as createSupabaseServerClient } from '@/utils/supabase/server';

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();

  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { receiverId, content, type } = await request.json();
    // type: 'admin' or 'user' (default to 'user')
    const table = type === 'admin' ? 'admin_messages' : 'user_messages';
    // Use explicit join syntax for ambiguous relationships
    const senderJoin = table === 'user_messages'
      ? 'sender:profiles!user_messages_sender_id_fkey (first_name, last_name, avatar_url)'
      : 'sender:profiles!admin_messages_sender_id_fkey (first_name, last_name, avatar_url)';
    const receiverJoin = table === 'user_messages'
      ? 'receiver:profiles!user_messages_receiver_id_fkey (first_name, last_name)'
      : 'receiver:profiles!admin_messages_receiver_id_fkey (first_name, last_name)';
    const { data: message, error } = await supabase
      .from(table)
      .insert({
        sender_id: user.id,
        receiver_id: receiverId,
        content
      })
      .select(`*, ${senderJoin}, ${receiverJoin}`)
      .single();
    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }
    return NextResponse.json({ message });
  } catch {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}


export async function GET(request: Request) {
  const supabase = await createSupabaseServerClient();
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      console.log('API /api/messages GET Unauthorized:', authError);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const url = new URL(request.url);
    const adminId = url.searchParams.get('admin_id');
    const type = url.searchParams.get('type') || 'user';
    // If admin is fetching a conversation, merge both tables
    if (type === 'admin' && adminId) {
      // Fetch messages sent by admin (admin_messages)
      const adminSenderJoin = 'sender:profiles!admin_messages_sender_id_fkey (first_name, last_name, avatar_url)';
      const adminReceiverJoin = 'receiver:profiles!admin_messages_receiver_id_fkey (first_name, last_name)';
      const { data: adminMsgs, error: adminErr } = await supabase
        .from('admin_messages')
        .select(`*, ${adminSenderJoin}, ${adminReceiverJoin}`)
        .or(`and(sender_id.eq.${user.id},receiver_id.eq.${adminId}),and(sender_id.eq.${adminId},receiver_id.eq.${user.id})`)
        .order('created_at', { ascending: true });
      if (adminErr) {
        return NextResponse.json({ error: adminErr.message }, { status: 400 });
      }
      // Fetch messages sent by user (user_messages)
      const userSenderJoin = 'sender:profiles!user_messages_sender_id_fkey (first_name, last_name, avatar_url)';
      const userReceiverJoin = 'receiver:profiles!user_messages_receiver_id_fkey (first_name, last_name)';
      const { data: userMsgs, error: userErr } = await supabase
        .from('user_messages')
        .select(`*, ${userSenderJoin}, ${userReceiverJoin}`)
        .or(`and(sender_id.eq.${user.id},receiver_id.eq.${adminId}),and(sender_id.eq.${adminId},receiver_id.eq.${user.id})`)
        .order('created_at', { ascending: true });
      if (userErr) {
        return NextResponse.json({ error: userErr.message }, { status: 400 });
      }
      // Merge and sort all messages by created_at
      const allMessages = [...(adminMsgs || []), ...(userMsgs || [])].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
      return NextResponse.json({ messages: allMessages });
    } else {
      // Default: fetch from one table (user or admin)
      const table = type === 'admin' ? 'admin_messages' : 'user_messages';
      const senderJoin = table === 'user_messages'
        ? 'sender:profiles!user_messages_sender_id_fkey (first_name, last_name, avatar_url)'
        : 'sender:profiles!admin_messages_sender_id_fkey (first_name, last_name, avatar_url)';
      const receiverJoin = table === 'user_messages'
        ? 'receiver:profiles!user_messages_receiver_id_fkey (first_name, last_name)'
        : 'receiver:profiles!admin_messages_receiver_id_fkey (first_name, last_name)';
      let query = supabase
        .from(table)
        .select(`*, ${senderJoin}, ${receiverJoin}`)
        .order('created_at', { ascending: true });
      if (adminId) {
        query = query.or(`and(sender_id.eq.${user.id},receiver_id.eq.${adminId}),and(sender_id.eq.${adminId},receiver_id.eq.${user.id})`);
      } else {
        query = query.or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`);
      }
      const { data: messages, error } = await query;
      if (error) {
        console.error('Supabase GET /api/messages error:', error);
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
      return NextResponse.json({ messages });
    }
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH /api/messages/read: mark all messages from admin to user as read
export async function PATCH(request: Request) {
  const supabase = await createSupabaseServerClient();
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { admin_id, type } = await request.json();
    if (!admin_id || !type) {
      return NextResponse.json({ error: 'Missing admin_id or type' }, { status: 400 });
    }
    const table = type === 'admin' ? 'admin_messages' : 'user_messages';
    const { error } = await supabase
      .from(table)
      .update({ is_read: true })
      .eq('sender_id', admin_id)
      .eq('receiver_id', user.id)
      .eq('is_read', false);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}