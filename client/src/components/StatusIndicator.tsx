import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

interface StatusIndicatorProps {
  status: "online" | "offline" | "starting" | "error";
  className?: string;
  label?: string;
}

const statusColors = {
  online: "bg-primary shadow-[0_0_10px_hsl(160_84%_39%)]",
  offline: "bg-muted-foreground/30",
  starting: "bg-yellow-500 shadow-[0_0_10px_hsl(45_93%_47%)]",
  error: "bg-destructive shadow-[0_0_10px_hsl(0_84%_60%)]",
};

const statusText = {
  online: "Active",
  offline: "Inactive",
  starting: "Booting",
  error: "Critical",
};

export function StatusIndicator({ status, className, label }: StatusIndicatorProps) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className="relative flex items-center justify-center">
        <div className={cn("h-2.5 w-2.5 rounded-full", statusColors[status])} />
        {status === "online" && (
          <motion.div
            initial={{ scale: 1, opacity: 0.5 }}
            animate={{ scale: 2, opacity: 0 }}
            transition={{ duration: 1.5, repeat: Infinity }}
            className={cn("absolute h-2.5 w-2.5 rounded-full bg-primary")}
          />
        )}
      </div>
      <span className={cn("text-xs font-mono uppercase tracking-wider font-medium", 
        status === "online" ? "text-primary" : 
        status === "error" ? "text-destructive" : 
        status === "starting" ? "text-yellow-500" : "text-muted-foreground"
      )}>
        {label || statusText[status]}
      </span>
    </div>
  );
}