// components/ui/separator.tsx

import { HTMLAttributes } from "react";
import { cn } from "@/library/utils";

interface SeparatorProps extends HTMLAttributes<HTMLDivElement> {
  orientation?: "horizontal" | "vertical";
}

export const Separator = ({
  className,
  orientation = "horizontal",
  ...props
}: SeparatorProps) => {
  return (
    <div
      className={cn(
        "shrink-0 bg-border",
        orientation === "horizontal" ? "h-[1px] w-full" : "h-full w-[1px]",
        className
      )}
      {...props}
    />
  );
};