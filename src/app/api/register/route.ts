import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

// Validate required environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing required environment variables for Supabase');
  console.log('NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? 'Set' : 'Not set');
  console.log('SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? 'Set' : 'Not set');
  throw new Error('Server configuration error. Please check server logs.');
}

// Note: Using direct client creation in the route handler instead of a global instance

export async function POST(request: Request) {
  console.log('Registration request received');
  
  if (!supabaseUrl || !supabaseServiceKey) {
    const errorMsg = 'Server misconfiguration - Missing required environment variables';
    console.error(errorMsg, {
      hasSupabaseUrl: !!supabaseUrl,
      hasServiceKey: !!supabaseServiceKey
    });
    return NextResponse.json(
      { 
        error: 'Server misconfiguration',
        message: 'Required environment variables are not properly set.'
      },
      { status: 500 }
    );
  }
  
  // Create a client with the service role key for admin operations
  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  try {
    const requestData = await request.json();
    
    // Input validation
    if (!requestData.email || !requestData.password || !requestData.firstName || !requestData.lastName) {
      return NextResponse.json(
        { 
          error: 'Missing required fields', 
          required: ['email', 'password', 'firstName', 'lastName'],
          success: false
        },
        { status: 400 }
      );
    }

    console.log('Creating auth user with email:', requestData.email);
    
    // Register the user with Supabase Auth with email confirmation
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: requestData.email,
      password: requestData.password,
      options: {
        emailRedirectTo: `${new URL(request.url).origin}/auth/callback`,
        data: {
          first_name: requestData.firstName,
          last_name: requestData.lastName,
          full_name: `${requestData.firstName} ${requestData.lastName}`.trim(),
        },
      },
    });

    if (authError) {
      console.error('Auth error during registration:', authError);
      return NextResponse.json(
        { 
          error: 'Authentication failed',
          message: authError.message,
          success: false
        },
        { status: 400 }
      );
    }

    if (!authData.user) {
      console.error('No user data returned from auth signup');
      return NextResponse.json(
        { 
          error: 'Registration failed',
          message: 'No user data returned from authentication service',
          success: false
        },
        { status: 500 }
      );
    }

    console.log('Auth user created, creating/updating profile for user ID:', authData.user.id);
    
    // Create user profile in the database
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .upsert(
        {
          id: authData.user.id,
          email: requestData.email,
          first_name: requestData.firstName,
          middle_name: requestData.middleName,
          last_name: requestData.lastName,
          date_of_birth: requestData.dateOfBirth,
          phone_number: requestData.phoneNumber,
          address: requestData.address,
          blood_type: requestData.bloodType,
          height_cm: requestData.heightCm,
          weight_kg: requestData.weightKg,
          city: requestData.city,
          state: requestData.state,
          country: requestData.country,
          updated_at: new Date().toISOString(),
          email_confirmed_at: null, // Will be set when email is confirmed
          role: 'patient' // Default role
        },
        { onConflict: 'id' }
      )
      .select()
      .single();

    if (profileError) {
      console.error('Profile creation error:', profileError);
      // Attempt to clean up the auth user if profile creation fails
      await supabase.auth.admin.deleteUser(authData.user.id).catch(console.error);
      
      return NextResponse.json(
        { 
          error: 'Profile creation failed',
          message: profileError.message,
          success: false
        },
        { status: 500 }
      );
    }

    // Check if email confirmation was sent
    if (authData.user && authData.user.identities && authData.user.identities.length === 0) {
      // User already exists
      return NextResponse.json({
        success: false,
        error: 'User already exists',
        message: 'A user with this email already exists. Please try logging in instead.'
      }, { status: 400 });
    }

    // Success - email confirmation sent
    return NextResponse.json({
      success: true,
      userId: profileData.id,
      email: profileData.email,
      emailConfirmed: false,
      message: 'Registration successful! Please check your email to confirm your account before logging in.',
    });

  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
