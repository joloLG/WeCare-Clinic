import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: 'User not authenticated' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { firstName, lastName, phoneNumber, dateOfBirth, address, bloodType, heightCm, weightKg } = body;

    // Update user profile
    const { data: profileData, error: profileError } = await supabase
  .from('profiles')
      .update({
        first_name: firstName,
        last_name: lastName,
        phone_number: phoneNumber,
        date_of_birth: dateOfBirth,
        address: address,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id)
      .select()
      .single();

    if (profileError) throw profileError;

    // Update patient record
    const { error: patientError } = await supabase
      .from('patients')
      .upsert({
        id: user.id,
        blood_type: bloodType,
        height_cm: heightCm ? Number(heightCm) : null,
        weight_kg: weightKg ? Number(weightKg) : null,
        updated_at: new Date().toISOString(),
      });

    if (patientError) throw patientError;

    return NextResponse.json({
      success: true,
      data: {
        ...profileData,
        bloodType,
        heightCm,
        weightKg,
      },
    });
  } catch (error) {
    console.error('Error updating profile:', error);
    return NextResponse.json(
      { error: 'Error updating profile' },
      { status: 500 }
    );
  }
}
