import React from "react";
import { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick?: () => void;
    icon?: LucideIcon;
  };
  children?: React.ReactNode;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  children,
}: EmptyStateProps) {
  const ActionIcon = action?.icon;

  return (
    <div className="text-center py-12 px-4 bg-gradient-to-b from-slate-50/60 to-white dark:from-slate-900/60 dark:to-slate-900 rounded-xl border border-dashed border-slate-200 dark:border-slate-800">
      <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center mx-auto mb-3 ring-8 ring-blue-50/50 dark:ring-blue-950/30 shadow-xs">
        <Icon className="w-6 h-6" strokeWidth={1.5} />
      </div>
      <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">{title}</h3>
      <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 max-w-sm mx-auto leading-relaxed">
        {description}
      </p>

      {action && (
        <div className="mt-4">
          <Button
            onClick={action.onClick}
            className="font-medium shadow-xs"
          >
            {ActionIcon && <ActionIcon className="w-4 h-4" strokeWidth={1.5} />}
            <span>{action.label}</span>
          </Button>
        </div>
      )}

      {children && <div className="mt-4">{children}</div>}
    </div>
  );
}
