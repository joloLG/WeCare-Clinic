import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { createClient as createSupabaseServerClient } from '@supabase/supabase-js';

export async function POST(request: Request) {
  try {
    const requestData = await request.json();
    const supabase = createRouteHandlerClient({ cookies });

    // For admin operations (deleteUser), use service role client
    const supabaseAdmin = createSupabaseServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Validate required fields
    const requiredFields = ['email', 'password', 'firstName', 'lastName', 'dateOfBirth', 'sex', 'civilStatus', 'bloodType'];
    const missingFields = requiredFields.filter(field => !requestData[field]);
    
    if (missingFields.length > 0) {
      return NextResponse.json(
        { error: `Missing required fields: ${missingFields.join(', ')}` },
        { status: 400 }
      );
    }

    // Sign up the user
    const { data: authData, error: signUpError } = await supabase.auth.signUp({
      email: requestData.email,
      password: requestData.password,
      options: {
        data: {
          first_name: requestData.firstName,
          last_name: requestData.lastName,
          role: 'patient',
        },
        emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`,
      },
    });

    if (signUpError) {
      throw signUpError;
    }

    if (!authData.user) {
      throw new Error('No user returned from sign up');
    }

    // Create profile in profiles table
    const { error: profileError1 } = await supabase
      .from('profiles')
      .insert([
        {
          id: authData.user.id,
          role: 'patient',
          first_name: requestData.firstName,
          middle_name: requestData.middleName || null,
          last_name: requestData.lastName,
          date_of_birth: requestData.dateOfBirth,
          sex: requestData.sex,
          civil_status: requestData.civilStatus,
          email: requestData.email,
          phone_number: requestData.phoneNumber || null,
          address: requestData.address || null,
          blood_type: requestData.bloodType, // Align with schema
        },
      ]);

    // Create patient record in patients table
    const { error: profileError2 } = await supabase
      .from('patients')
      .insert([
        {
          id: authData.user.id, // This links to the profiles table
          first_name: requestData.firstName, // Align with schema
          last_name: requestData.lastName,   // Align with schema
          blood_type: requestData.bloodType,
          status: 'No Vaccination',
        },
      ]);

    if (profileError1 || profileError2) {
      // If profile creation fails, try to delete the auth user to keep data consistent
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
      throw profileError1 || profileError2;
    }

    return NextResponse.json(
      { message: 'Registration successful. Please check your email to verify your account.' },
      { status: 201 }
    );
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'An error occurred during registration' },
      { status: 500 }
    );
  }
}
