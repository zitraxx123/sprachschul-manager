import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold select-none transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-blue-100 dark:bg-blue-950/80 text-blue-800 dark:text-blue-300 dark:border dark:border-blue-800/60",
        secondary:
          "border-transparent bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 dark:border dark:border-slate-700",
        success:
          "border-transparent bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 dark:border dark:border-emerald-800/60",
        destructive:
          "border-transparent bg-red-100 dark:bg-red-950/80 text-red-800 dark:text-red-300 dark:border dark:border-red-800/60",
        outline: "text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 bg-transparent",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
