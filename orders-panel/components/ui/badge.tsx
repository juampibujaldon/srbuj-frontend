import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide",
  {
    variants: {
      variant: {
        default: "border-transparent bg-brand-soft text-brand-contrast",
        warning: "border-transparent bg-yellow-200 text-yellow-900",
        success: "border-transparent bg-emerald-200 text-emerald-900",
        danger: "border-transparent bg-red-200 text-red-900",
        info: "border-transparent bg-blue-200 text-blue-900",
        outline: "text-brand border-brand/50"
      }
    },
    defaultVariants: {
      variant: "default"
    }
  }
);

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
