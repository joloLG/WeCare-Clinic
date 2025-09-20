"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useEffect } from "react";
import Image from "next/image";
import { useToast } from "@/components/ui/use-toast";
import { ToastProvider } from "@/components/ui/toast-provider";
import RegisterForm from "@/components/auth/RegisterForm";

function RegisterInner() {
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
      <div className="w-full max-w-4xl">
        <div className="grid grid-cols-1 md:grid-cols-2 overflow-hidden rounded-xl shadow-xl h-full">
          {/* Logo Card */}
          <div className="bg-red-600 p-8 flex flex-col items-center justify-center text-center">
            <div className="relative w-40 h-40 md:w-48 md:h-48">
              <Image 
                src="/images/logo.jpg" 
                alt="Logo" 
                fill
                className="object-contain"
                priority
              />
            </div>
            <h2 className="mt-6 text-2xl font-bold text-white">Welcome to WeCare</h2>
            <p className="mt-2 text-red-100">Your health is our priority</p>
          </div>
          
          {/* Form Card */}
          <div className="p-6 sm:p-8 flex items-center">
            <div className="w-full">
              <RegisterForm />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <ToastProvider>
      <Suspense fallback={<div>Loading...</div>}>
        <RegisterInner />
      </Suspense>
    </ToastProvider>
  );
}
