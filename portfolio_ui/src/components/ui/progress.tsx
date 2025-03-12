// components/ui/progress.tsx

import { cn } from "@/library/utils";

interface ProgressProps {
	value: number;
	className?: string;
  }
  
  export const Progress = ({ value, className }: ProgressProps) => {
	return (
	  <div className={cn("h-2 w-full overflow-hidden rounded-full bg-secondary", className)}>
		<div
		  className="h-full rounded-full bg-primary transition-all duration-300"
		  style={{ width: `${value}%` }}
		/>
	  </div>
	);
  };