'use client';

import { useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Icons } from '@/components/icons';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { EyeIcon, EyeOffIcon } from 'lucide-react'; // Import icons

export function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false); // New state for password visibility
  const router = useRouter();
  const supabase = createClient();

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsLoading(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        if (error.message.includes('Email not confirmed')) {
          const { error: resendError } = await supabase.auth.resend({
            type: 'signup',
            email,
          });

          if (resendError) throw resendError;
          
          await supabase.auth.signOut();
          
          throw new Error('Please verify your email address. A new verification email has been sent.');
        }
        throw error;
      }

      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user || !user.email_confirmed_at) {
        await supabase.auth.signOut();
        
        const { error: resendError } = await supabase.auth.resend({
          type: 'signup',
          email,
        });

        if (resendError) throw resendError;
        
        throw new Error('Please verify your email address. A new verification email has been sent.');
      }

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      if (profileError) {
        throw profileError;
      }

      if (!profile?.role) {
        throw new Error('User role not found. Please contact support.');
      }

      if (profile.role === 'admin') {
        router.push('/dashboard/admin');
      } else {
        router.push('/dashboard/user');
      }

      toast.success('Login successful!');
    } catch (error) {
      console.error('Login error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Invalid login credentials. Please try again.';
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="bg-white p-8 rounded-lg shadow-md max-w-sm mx-auto">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-6">
          <div className="space-y-2 text-center">
            <h2 className="text-2xl font-bold tracking-tight text-gray-900">WELCOME BACK!</h2>
            <p className="text-sm text-gray-500">Sign in to access your account</p>
          </div>
          <div className="space-y-4">
            <div>
              <Label htmlFor="email" className="text-gray-700">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
                required
                className="text-black bg-white border border-gray-300 focus:border-red-500 focus:ring-red-500"
              />
            </div>
          </div>
          <div>
            <div className="flex items-center justify-between">
              <Label htmlFor="password" className="text-gray-700">Password</Label>
              <a
                href="/auth/forgot-password"
                className="text-sm font-medium text-red-600 hover:underline"
              >
                Forgot password?
              </a>
            </div>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
                required
                className="text-black bg-white border border-gray-300 focus:border-red-500 focus:ring-red-500 pr-10" // Added pr-10 for padding
              />
              <button
                type="button"
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-600 hover:text-gray-900"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOffIcon size={20} /> : <EyeIcon size={20} />}
              </button>
            </div>
          </div>
        </div>
        <Button type="submit" className="w-full bg-red-600 hover:bg-red-700" disabled={isLoading}>
          {isLoading && (
            <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
          )}
          Sign In
        </Button>
        <div className="mt-4 text-center text-sm text-gray-600">
          Don&apos;t have an account?{' '}
          <a href="/auth/register" className="font-medium text-red-600 hover:underline">
            Sign up
          </a>
        </div>
      </form>
    </div>
  );
}