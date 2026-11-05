"use client";

import React from "react";
import { GraduationCap } from "lucide-react";

interface LogoProps {
  className?: string;
  size?: "sm" | "md" | "lg";
  showText?: boolean;
  subtitle?: string;
  logoUrl?: string | null;
}

export function Logo({
  className = "",
  size = "md",
  showText = true,
  subtitle,
  logoUrl,
}: LogoProps) {
  const iconSizes = {
    sm: "w-8 h-8 rounded-lg",
    md: "w-10 h-10 rounded-lg",
    lg: "w-12 h-12 rounded-lg",
  };

  const capSizes = {
    sm: "w-4 h-4",
    md: "w-5 h-5",
    lg: "w-6 h-6",
  };

  const textSizes = {
    sm: "text-base",
    md: "text-lg",
    lg: "text-2xl",
  };

  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      {logoUrl ? (
        <div
          className={`${iconSizes[size]} bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-1 flex items-center justify-center shrink-0 shadow-sm overflow-hidden`}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={logoUrl}
            alt="Logo"
            className="w-full h-full object-contain"
          />
        </div>
      ) : (
        <div
          className={`${iconSizes[size]} bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-sm`}
        >
          <GraduationCap className={capSizes[size]} strokeWidth={1.5} />
        </div>
      )}

      {showText && (
        <div className="leading-tight overflow-hidden">
          <div className="flex items-center space-x-1">
            <span className={`font-bold tracking-tight text-slate-900 dark:text-slate-100 ${textSizes[size]}`}>
              Klass<span className="text-blue-600 dark:text-blue-400">werk</span>
            </span>
          </div>
          {subtitle && (
            <p className="text-[11px] text-slate-400 dark:text-slate-500 font-medium truncate">
              {subtitle}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
