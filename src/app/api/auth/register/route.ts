import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { createClient as createSupabaseServerClient } from '@supabase/supabase-js';

export async function POST(request: Request) {
  // Define types for our request data
  type RegistrationData = {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    dateOfBirth: string;
    sex: string;
    civilStatus: string;
    bloodType: string;
    phoneNumber?: string;
    address?: string;
  };

  // Define types for our auth data
  type AuthData = {
    user: {
      id: string;
      email: string | null;
    } | null;
  };

  // Define error type that might include authData
  type RegistrationError = Error & {
    authData?: AuthData;
  };

  let supabase;
  let supabaseAdmin;
  let authData: AuthData | null = null;

  try {
    const requestData: RegistrationData = await request.json();
    supabase = createRouteHandlerClient({ cookies });

    // Validate required environment variables
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseUrl || !serviceRoleKey) {
      console.error('Missing required environment variables for Supabase');
      return NextResponse.json(
        { error: 'Server configuration error. Please check server logs.' },
        { status: 500 }
      );
    }

    // Create service role client for admin operations
    supabaseAdmin = createSupabaseServerClient(supabaseUrl, serviceRoleKey);

    // Validate required fields
    const requiredFields: (keyof RegistrationData)[] = [
      'email', 'password', 'firstName', 'lastName', 
      'dateOfBirth', 'sex', 'civilStatus', 'bloodType'
    ];
    
    const missingFields = requiredFields.filter(field => !requestData[field]);
    
    if (missingFields.length > 0) {
      return NextResponse.json(
        { error: `Missing required fields: ${missingFields.join(', ')}` },
        { status: 400 }
      );
    }

    // Sign up the user
    const signUpResponse = await supabase.auth.signUp({
      email: requestData.email,
      password: requestData.password,
      options: {
        data: {
          first_name: requestData.firstName,
          last_name: requestData.lastName,
        },
        emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/auth/callback`,
      },
    });

    if (signUpResponse.error) {
      console.error('Sign up error:', signUpResponse.error);
      return NextResponse.json(
        { error: signUpResponse.error.message || 'Registration failed' },
        { status: 400 }
      );
    }

    authData = signUpResponse.data;

    if (!authData?.user) {
      console.error('No user returned from sign up');
      return NextResponse.json(
        { error: 'User creation failed' },
        { status: 500 }
      );
    }

    // Create profile in profiles table
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .insert({
        id: authData.user.id,
        role: 'patient',
        first_name: requestData.firstName,
        last_name: requestData.lastName,
        email: requestData.email,
        date_of_birth: requestData.dateOfBirth,
        sex: requestData.sex,
        civil_status: requestData.civilStatus,
        blood_type: requestData.bloodType,
        phone_number: requestData.phoneNumber || null,
        address: requestData.address || null,
      });

    if (profileError) throw profileError;

    // Create patient record in patients table
    const { error: patientError } = await supabaseAdmin
      .from('patients')
      .insert({
        id: authData.user.id,
        first_name: requestData.firstName,
        last_name: requestData.lastName,
        blood_type: requestData.bloodType,
        status: 'No Vaccination',
      });

    if (patientError) throw patientError;

    return NextResponse.json(
      { 
        message: 'Registration successful', 
        user: {
          id: authData.user.id,
          email: authData.user.email,
        } 
      },
      { status: 201 }
    );

  } catch (error: unknown) {
    console.error('Registration error:', error);
    
    // Type guard to check if error is an instance of Error
    const isError = (e: unknown): e is Error => {
      return e instanceof Error;
    };

    // Clean up auth user if it was created
    if (authData?.user?.id && supabaseAdmin) {
      try {
        await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
      } catch (cleanupError) {
        console.error('Error during cleanup:', cleanupError);
      }
    }

    return NextResponse.json(
      { 
        error: isError(error) ? error.message : 'An unknown error occurred',
        ...(process.env.NODE_ENV === 'development' && error ? { details: error } : {})
      },
      { status: 500 }
    );
  }
}