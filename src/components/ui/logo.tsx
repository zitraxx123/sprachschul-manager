"use client";

import React from "react";
import { GraduationCap } from "lucide-react";

interface LogoProps {
  className?: string;
  size?: "sm" | "md" | "lg";
  showText?: boolean;
  subtitle?: string;
}

export function Logo({
  className = "",
  size = "md",
  showText = true,
  subtitle,
}: LogoProps) {
  const iconSizes = {
    sm: "w-7 h-7 rounded-lg",
    md: "w-9 h-9 rounded-xl",
    lg: "w-12 h-12 rounded-xl",
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
    <div className={`flex items-center space-x-2.5 ${className}`}>
      <div
        className={`${iconSizes[size]} bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-sm`}
      >
        <GraduationCap className={capSizes[size]} />
      </div>

      {showText && (
        <div className="leading-tight overflow-hidden">
          <div className="flex items-center space-x-1">
            <span className={`font-bold tracking-tight text-slate-900 ${textSizes[size]}`}>
              Sprachschul<span className="text-blue-600">-Manager</span>
            </span>
          </div>
          {subtitle && (
            <p className="text-[11px] text-slate-400 font-medium truncate">
              {subtitle}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
