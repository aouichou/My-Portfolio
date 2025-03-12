// components/ui/badge.tsx
import { cn } from "@/library/utils";
import { HTMLAttributes } from "react";

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: "default" | "outline";
}

export const Badge = ({
  className,
  variant = "default",
  ...props
}: BadgeProps) => {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-2 py-1 text-sm font-medium transition-colors",
        variant === "default" && "bg-primary text-primary-foreground",
        variant === "outline" && "border border-input bg-transparent",
        className
      )}
      {...props}
    />
  );
};