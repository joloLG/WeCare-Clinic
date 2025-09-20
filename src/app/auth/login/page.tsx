"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useEffect } from "react";
import Image from "next/image";
import { useToast } from "@/components/ui/use-toast";
import { ToastProvider } from "@/components/ui/toast-provider";
import { LoginForm } from "@/components/auth/LoginForm";

function LoginInner() {
  const searchParams = useSearchParams();
  const { toast } = useToast();

  useEffect(() => {
    const message = searchParams.get("message");
    if (message) {
      toast({
        title: "Notice",
        description: message,
        variant: "default",
      });
    }
  }, [searchParams, toast]);

  return (
    <div className="min-h-screen flex items-center justify-center p-4 md:p-8 bg-gradient-to-br from-indigo-50 to-white">
      <div className="w-full max-w-md">
        <div className="overflow-hidden rounded-xl shadow-xl">
          {/* Logo Card */}
          <div className="bg-red-600 p-8 text-center">
            <div className="relative w-32 h-32 mx-auto">
              <Image 
                src="/images/logo.jpg" 
                alt="WeCare Logo" 
                fill
                className="object-contain"
                priority
              />
            </div>
            <h1 className="mt-6 text-2xl font-bold text-white">WeCare Clinic</h1>
          </div>
          
          {/* Form Card */}
          <div className="bg-white p-6 sm:p-8">
            <div className="space-y-6">
              <LoginForm />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <ToastProvider>
      <Suspense fallback={<div>Loading...</div>}>
        <LoginInner />
      </Suspense>
    </ToastProvider>
  );
}
