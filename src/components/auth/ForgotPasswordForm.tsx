'use client';

import { useState } from 'react';
import { createClient as createBrowserClient } from '@/utils/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';

export function ForgotPasswordForm() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type?: string; text?: string }>({});
  const { toast } = useToast();
  const supabase = createBrowserClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage({});

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/update-password`,
      });

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Check your email for the password reset link',
      });
      setMessage({
        type: 'success',
        text: 'Password reset link sent! Please check your email.',
      });

      // Clear the form after successful submission
      setEmail('');
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      console.error('Error:', error);
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
      setMessage({
        type: 'error',
        text: errorMessage,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white p-8 rounded-lg shadow-md max-w-sm mx-auto">
      <div className="text-center">
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">FORGOT PASSWORD</h1>
        <p className="text-sm text-gray-500 mt-2">
          Enter your email to receive a password reset link
        </p>
      </div>

      {message.text && (
        <div
          className={`p-4 rounded-md mt-4 ${
            message.type === 'error' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
          }`}
        >
          {message.text}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4 mt-6">
        <div className="space-y-2">
          <Label htmlFor="email" className="text-gray-700">Email</Label>
          <Input
            id="email"
            type="email"
            placeholder="your@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="text-black bg-white border border-gray-300 focus:border-red-500 focus:ring-red-500"
            disabled={loading}
          />
        </div>

        <Button type="submit" className="w-full bg-red-600 hover:bg-red-700" disabled={loading}>
          {loading ? 'Sending...' : 'Send Reset Link'}
        </Button>
      </form>

      <div className="mt-4 text-center text-sm text-gray-600">
        Remember your password?{' '}
        <a href="/auth/login" className="font-medium text-red-600 hover:underline">
          Sign in
        </a>
      </div>
    </div>
  );
}
