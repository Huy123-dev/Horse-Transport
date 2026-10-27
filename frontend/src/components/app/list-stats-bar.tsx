"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { FileText, CheckCircle2, Clock, AlertTriangle } from "lucide-react";

export function ListStatsBar({
  total,
  filtered,
  stats,
  className,
}: {
  total: number;
  filtered: number;
  stats?: { label: string; value: string | number; tone?: string }[];
  className?: string;
}) {
  const toneClasses: Record<string, string> = {
    success: "text-[var(--success-fg)]",
    warning: "text-[var(--warning-fg)]",
    danger: "text-[var(--danger-fg)]",
    info: "text-[var(--info-fg)]",
    default: "text-foreground",
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className={cn("flex flex-wrap items-center gap-4 rounded-lg border border-border bg-muted/30 px-4 py-2.5 text-sm", className)}
    >
      <div className="flex items-center gap-2">
        <FileText className="h-4 w-4 text-muted-foreground" />
        <span className="text-muted-foreground">Hiển thị</span>
        <span className="font-semibold text-foreground">{filtered}</span>
        <span className="text-muted-foreground">/ {total}</span>
      </div>
      {stats && stats.length > 0 && (
        <>
          <div className="h-4 w-px bg-border" />
          <div className="flex flex-wrap items-center gap-4">
            {stats.map((s, i) => (
              <div key={i} className="flex items-center gap-1.5">
                <span className="text-muted-foreground">{s.label}:</span>
                <span className={cn("font-semibold", toneClasses[s.tone || "default"])}>{s.value}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </motion.div>
  );
}
