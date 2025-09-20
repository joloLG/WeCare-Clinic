'use client';

import { useToast as useToastHook } from '@/components/ui/use-toast';

export function useCustomToast() {
  const { toast } = useToastHook();

  const showSuccess = (message: string) => {
    toast({
      title: 'Success',
      description: message,
      variant: 'default',
    });
  };

  const showError = (message: string) => {
    toast({
      title: 'Error',
      description: message,
      variant: 'destructive',
    });
  };


  return {
    showSuccess,
    showError,
  };
}
