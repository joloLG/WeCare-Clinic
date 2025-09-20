import { createServerClient as createSupabaseServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function createClient() {
  const cookieStore = await cookies();
  return createSupabaseServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        // Get a cookie by name
        get: (name: string) => {
          return cookieStore.get(name)?.value;
        },
        // In Next.js 14+, cookies are set via headers in Route Handlers or Server Actions
        // This is a no-op here as we'll handle setting cookies in the response
        set: () => {},
        // This is a no-op here as we'll handle removing cookies in the response
        remove: () => {},
      },
    }
  );
}

// Helper function to set auth cookies in the response
export function setAuthCookies(response: NextResponse, tokens: { accessToken: string; refreshToken: string }) {
  response.cookies.set({
    name: 'sb-access-token',
    value: tokens.accessToken,
    path: '/',
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
  })
  
  response.cookies.set({
    name: 'sb-refresh-token',
    value: tokens.refreshToken,
    path: '/',
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
  })
  
  return response
}

// Helper function to clear auth cookies in the response
export function clearAuthCookies(response: NextResponse) {
  response.cookies.delete('sb-access-token')
  response.cookies.delete('sb-refresh-token')
  return response
}
