"use client";

import Image from "next/image";
import { Toaster, toast } from "sonner";

export function ToastProvider() {
  return (
    <Toaster
      position="bottom-right"
      toastOptions={{
        style: {
          background: "hsl(0 0% 8%)",
          border: "1px solid hsl(0 0% 14%)",
          color: "white",
        },
        className: "glass-card",
      }}
      closeButton
      richColors
    />
  );
}

// Toast utility functions
export const showToast = {
  success: (title: string, description?: string) => {
    toast.success(title, {
      description,
      style: {
        background: "linear-gradient(to right, rgba(34, 197, 94, 0.1), rgba(0, 0, 0, 0.9))",
        borderLeft: "4px solid rgb(34, 197, 94)",
      },
    });
  },

  error: (title: string, description?: string) => {
    toast.error(title, {
      description,
      style: {
        background: "linear-gradient(to right, rgba(239, 68, 68, 0.1), rgba(0, 0, 0, 0.9))",
        borderLeft: "4px solid rgb(239, 68, 68)",
      },
    });
  },

  info: (title: string, description?: string) => {
    toast.info(title, {
      description,
      style: {
        background: "linear-gradient(to right, rgba(59, 130, 246, 0.1), rgba(0, 0, 0, 0.9))",
        borderLeft: "4px solid rgb(59, 130, 246)",
      },
    });
  },

  warning: (title: string, description?: string) => {
    toast.warning(title, {
      description,
      style: {
        background: "linear-gradient(to right, rgba(245, 158, 11, 0.1), rgba(0, 0, 0, 0.9))",
        borderLeft: "4px solid rgb(245, 158, 11)",
      },
    });
  },

  sale: (buyerName: string, courseName: string, amount: string) => {
    toast.custom(() => (
      <div className="glass-card rounded-xl p-4 flex items-center gap-4 min-w-[350px]">
        <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center shrink-0">
          <svg className="w-6 h-6 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <div className="flex-1">
          <p className="font-semibold text-white">Yeni Satis!</p>
          <p className="text-sm text-muted-foreground">
            {buyerName} <span className="text-orange-500">{courseName}</span> kursunu satin aldi
          </p>
          <p className="text-sm font-medium text-green-500 mt-1">{amount}</p>
        </div>
      </div>
    ), {
      duration: 5000,
    });
  },

  subscriber: (userName: string, avatarUrl?: string) => {
    toast.custom(() => (
      <div className="glass-card rounded-xl p-4 flex items-center gap-4 min-w-[300px]">
        {avatarUrl ? (
          <Image
            src={avatarUrl}
            alt={userName}
            width={48}
            height={48}
            sizes="48px"
            unoptimized
            loader={({ src }) => src}
            className="w-12 h-12 rounded-full object-cover"
          />
        ) : (
          <div className="w-12 h-12 rounded-full bg-orange-500/20 flex items-center justify-center shrink-0">
            <svg className="w-6 h-6 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
            </svg>
          </div>
        )}
        <div className="flex-1">
          <p className="font-semibold text-white">Yeni Abone!</p>
          <p className="text-sm text-muted-foreground">
            <span className="text-orange-500">{userName}</span> sana abone oldu
          </p>
        </div>
      </div>
    ), {
      duration: 4000,
    });
  },

  achievement: (title: string, description: string) => {
    toast.custom(() => (
      <div className="glass-card rounded-xl p-4 flex items-center gap-4 min-w-[350px] border-l-4 border-yellow-500">
        <div className="w-12 h-12 rounded-full bg-yellow-500/20 flex items-center justify-center shrink-0 animate-bounce">
          <svg className="w-6 h-6 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
        </div>
        <div className="flex-1">
          <p className="font-semibold text-yellow-500">{title}</p>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
      </div>
    ), {
      duration: 6000,
    });
  },
};
