// src/middleware.ts
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

// List of public paths that don't require authentication
const publicPaths = [
  '/auth', 
  '/_next', 
  '/favicon.ico', 
  '/api',
  '/_vercel',
  '/_static',
  '/public',
  '/images',
  '/css',
  '/js',
  '/fonts',
  '/favicon.ico',
  '/robots.txt',
  '/sitemap.xml',
  '/manifest.json'
];


export async function middleware(request: NextRequest) {
  // Create a response object
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  // Skip middleware for public paths and static files
  const { pathname } = new URL(request.url);
  
  // Check if the current path is public
  const isPublicPath = publicPaths.some(path => 
    pathname === path || pathname.startsWith(`${path}/`)
  ) || 
  pathname.includes('.') || 
  pathname.endsWith('/') ||
  pathname.endsWith('.js') ||
  pathname.endsWith('.css') ||
  pathname.endsWith('.png') ||
  pathname.endsWith('.jpg') ||
  pathname.endsWith('.jpeg') ||
  pathname.endsWith('.gif') ||
  pathname.endsWith('.svg') ||
  pathname.endsWith('.ico');

  if (isPublicPath) {
    return response;
  }

  try {
    // Create Supabase client
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return request.cookies.get(name)?.value;
          },
          set(name: string, value: string, options: CookieOptions) {
            request.cookies.set({ name, value, ...options });
            response = NextResponse.next({
              request: { headers: request.headers },
            });
            response.cookies.set({ name, value, ...options });
          },
          remove(name: string, options: CookieOptions) {
            request.cookies.set({ name, value: '', ...options });
            response = NextResponse.next({
              request: { headers: request.headers },
            });
            response.cookies.set({ name, value: '', ...options });
          },
        },
      }
    );

    // Get the user session
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    // If there's an error getting the user, log it
    if (userError) {
      console.error('Error getting user:', userError);
      throw userError;
    }

    // If no user is logged in and trying to access protected path, redirect to login
    if (!user) {
      const loginUrl = new URL('/auth/login', request.url);
      loginUrl.searchParams.set('redirectedFrom', pathname);
      return NextResponse.redirect(loginUrl);
    }

    // For dashboard routes, handle role-based redirection
    if (pathname.startsWith('/dashboard')) {
      // Get the user's profile with role information
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('is_admin')
        .eq('id', user.id)
        .single();

      if (profileError) {
        console.error('Error fetching user profile in middleware:', profileError);
        // If we can't get the profile, redirect to login
        const loginUrl = new URL('/auth/login', request.url);
        loginUrl.searchParams.set('error', 'profile_error');
        return NextResponse.redirect(loginUrl);
      }

      // Determine if user is admin
      const isAdmin = profile?.is_admin === true;

      // Handle root dashboard path
      if (pathname === '/dashboard' || pathname === '/dashboard/') {
        const redirectUrl = isAdmin ? '/dashboard/admin' : '/dashboard/user';
        return NextResponse.redirect(new URL(redirectUrl, request.url));
      }

      // Prevent non-admins from accessing admin routes
      if (pathname.startsWith('/dashboard/admin') && !isAdmin) {
        console.warn(`Non-admin user ${user.id} attempted to access admin route: ${pathname}`);
        return NextResponse.redirect(new URL('/dashboard/user', request.url));
      }

      // Redirect admins away from user routes to admin dashboard
      if (pathname.startsWith('/dashboard/user') && isAdmin) {
        return NextResponse.redirect(new URL('/dashboard/admin', request.url));
      }
    }

    return response;
  } catch (error) {
    console.error('Middleware error:', error);
    // In case of error, redirect to login
    const loginUrl = new URL('/auth/login', request.url);
    loginUrl.searchParams.set('error', 'auth_error');
    return NextResponse.redirect(loginUrl);
  }
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|css|js)$).*)'],
};