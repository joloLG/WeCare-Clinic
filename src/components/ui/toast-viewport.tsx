'use client';

import * as React from 'react';

type ToastVariant = 'default' | 'destructive';

type Toast = {
  id: string;
  title: string;
  description?: string;
  variant?: ToastVariant;
};

type ToastViewportProps = {
  toasts: Toast[];
  onDismissAction: (id: string) => void;
};

export function ToastViewport({ toasts, onDismissAction }: ToastViewportProps) {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 space-y-2">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`flex items-center justify-between p-4 rounded-md shadow-lg min-w-[300px] ${
            toast.variant === 'destructive' ? 'bg-red-100 text-red-700' : 'bg-white text-gray-900'
          }`}
        >
          <div>
            <p className="font-medium">{toast.title}</p>
            {toast.description && <p className="text-sm">{toast.description}</p>}
          </div>
          <button
            onClick={() => onDismissAction(toast.id)}
            className="ml-4 text-gray-500 hover:text-gray-700"
            aria-label="Dismiss"
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  );
}
