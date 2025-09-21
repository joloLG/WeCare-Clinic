// src/app/api/appointments/route.ts
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const cookieStore = cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });
    const { data: { session } } = await supabase.auth.getSession();

    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const appointmentData = await request.json();
    
    // Always create a new appointment
    const { data, error } = await supabase
      .from('appointments')
      .insert([{
        ...appointmentData,
        created_by: session.user.id,
        status: 'scheduled'
      }])
      .select()
      .single();

    if (error) {
      console.error('Database error:', error);
      throw error;
    }

    return NextResponse.json({ data });
  } catch (error) {
    console.error('Error in appointments route:', error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Failed to create appointment',
        details: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}