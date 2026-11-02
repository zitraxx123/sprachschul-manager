"use client";

import React from "react";
import { toast as sonnerToast, Toaster as SonnerToaster } from "sonner";
import { useTheme } from "next-themes";

export const toast = sonnerToast;

export function Toaster() {
  const { resolvedTheme } = useTheme();

  return (
    <SonnerToaster
      richColors
      closeButton
      position="top-right"
      theme={(resolvedTheme as "light" | "dark") || "system"}
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-white group-[.toaster]:dark:bg-slate-900 group-[.toaster]:text-slate-900 group-[.toaster]:dark:text-slate-100 group-[.toaster]:border-slate-200 group-[.toaster]:dark:border-slate-800 group-[.toaster]:shadow-lg font-sans rounded-xl text-xs",
          description: "group-[.toast]:text-slate-500 group-[.toast]:dark:text-slate-400 text-[11px]",
          actionButton: "group-[.toast]:bg-blue-600 group-[.toast]:text-white font-medium text-xs",
          cancelButton: "group-[.toast]:bg-slate-100 group-[.toast]:dark:bg-slate-800 group-[.toast]:text-slate-600 group-[.toast]:dark:text-slate-300 font-medium text-xs",
          closeButton: "group-[.toast]:bg-white group-[.toast]:dark:bg-slate-800 group-[.toast]:text-slate-400 group-[.toast]:dark:text-slate-500 group-[.toast]:border-slate-200 group-[.toast]:dark:border-slate-700",
        },
      }}
    />
  );
}

export function useToast() {
  return sonnerToast;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <Toaster />
    </>
  );
}
