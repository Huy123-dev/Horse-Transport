import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { motion, useMotionValue, useTransform, animate } from "framer-motion";
import { useEffect, useState } from "react";

function CountUp({ value, duration = 0.8 }: { value: number; duration?: number }) {
  const count = useMotionValue(0);
  const rounded = useTransform(count, (latest) => Math.round(latest).toLocaleString("vi-VN"));
  const [display, setDisplay] = useState("0");

  useEffect(() => {
    const controls = animate(count, value, { duration, ease: "easeOut" });
    const unsub = rounded.on("change", (v) => setDisplay(v));
    return () => { controls.stop(); unsub(); };
  }, [value, count, rounded, duration]);

  return <>{display}</>;
}

export function StatCard({
  label,
  value,
  icon,
  tone = "default",
  hint,
  tooltip,
  className,
  delay = 0,
}: {
  label: string;
  value: string | number;
  icon?: React.ReactNode;
  tone?: "default" | "success" | "warning" | "danger" | "info";
  hint?: string;
  tooltip?: string;
  className?: string;
  delay?: number;
}) {
  const toneBg: Record<string, string> = {
    default: "bg-primary/10 text-primary",
    success: "bg-[var(--success-bg)] text-[var(--success-fg)]",
    warning: "bg-[var(--warning-bg)] text-[var(--warning-fg)]",
    danger: "bg-[var(--danger-bg)] text-[var(--danger-fg)]",
    info: "bg-[var(--info-bg)] text-[var(--info-fg)]",
  };

  const numericValue = typeof value === "number" ? value : parseInt(String(value).replace(/[^\d]/g, ""), 10);
  const isNumeric = !isNaN(numericValue) && numericValue > 0 && typeof value !== "string";

  const card = (
    <Card className="card-hover group overflow-hidden">
      {/* Top accent bar */}
      <div className={cn("h-1 w-full", {
        "bg-primary": tone === "default",
        "bg-[var(--success)]": tone === "success",
        "bg-[var(--warning)]": tone === "warning",
        "bg-[var(--danger)]": tone === "danger",
        "bg-[var(--copper)]": tone === "info",
      })} />
      <CardContent className="flex items-center gap-4 p-5">
        {icon && (
          <motion.div
            whileHover={{ scale: 1.08, rotate: -3 }}
            transition={{ type: "spring", stiffness: 400, damping: 15 }}
            className={cn("flex h-12 w-12 shrink-0 items-center justify-center rounded-xl", toneBg[tone])}
          >
            {icon}
          </motion.div>
        )}
        <div className="min-w-0">
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="text-2xl font-bold tracking-tight text-foreground">
            {isNumeric ? <CountUp value={numericValue} /> : value}
          </p>
          {hint && <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>}
        </div>
      </CardContent>
    </Card>
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay, ease: [0.4, 0, 0.2, 1] }}
      className={className}
    >
      {tooltip ? (
        <TooltipProvider delayDuration={300}>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="cursor-help">{card}</div>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="max-w-xs">
              <p className="text-xs">{tooltip}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      ) : card}
    </motion.div>
  );
}
