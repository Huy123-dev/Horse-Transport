"use client";

import { motion } from "framer-motion";
import { CheckCircle2, Circle, MapPin, Clock, Flag } from "lucide-react";
import { cn } from "@/lib/utils";
import { STOP_TYPES } from "@/lib/constants";

export function TripProgressBar({ stops, planStatus }: { stops: any[]; planStatus: string }) {
  if (!stops || stops.length === 0) return null;

  const completed = stops.filter((s) => s.status === "Đã khởi hành").length;
  const arrived = stops.filter((s) => s.status === "Đã đến").length;
  const total = stops.length;
  const progress = total > 0 ? ((completed + (arrived > 0 ? 0.5 : 0)) / total) * 100 : 0;

  const stageLabels: Record<string, string> = {
    "Đang lập kế hoạch": "Lập kế hoạch",
    "Sẵn sàng": "Sẵn sàng khởi hành",
    "Đang thực hiện": "Đang vận chuyển",
    "Hoàn thành": "Hoàn thành",
    "Tạm dừng": "Tạm dừng",
  };

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold">Tiến độ chuyến</p>
          <p className="text-xs text-muted-foreground">{stageLabels[planStatus] || planStatus}</p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold text-primary">{Math.round(progress)}%</p>
          <p className="text-xs text-muted-foreground">{completed}/{total} chặng hoàn thành</p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="relative mb-5 h-2 overflow-hidden rounded-full bg-muted">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className={cn(
            "h-full rounded-full",
            planStatus === "Hoàn thành" ? "bg-[var(--success)]" : "bg-gradient-to-r from-primary to-[var(--copper)]"
          )}
        />
      </div>

      {/* Stop dots */}
      <div className="flex items-center justify-between">
        {stops.map((stop, idx) => {
          const isCompleted = stop.status === "Đã khởi hành";
          const isCurrent = stop.status === "Đã đến";
          const isPending = stop.status === "Chưa đến";
          return (
            <div key={stop.stopId} className="flex flex-1 flex-col items-center gap-1.5">
              <div className="relative flex items-center">
                {idx > 0 && (
                  <div className={cn("absolute right-1/2 top-1/2 h-0.5 w-[calc(100%-1rem)] -translate-y-1/2", isCompleted ? "bg-[var(--success)]" : "bg-muted")} />
                )}
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: idx * 0.1, type: "spring", stiffness: 400, damping: 15 }}
                  className={cn(
                    "relative z-10 flex h-7 w-7 items-center justify-center rounded-full ring-4 ring-background",
                    isCompleted && "bg-[var(--success)] text-white",
                    isCurrent && "bg-primary text-primary-foreground animate-pulse-soft",
                    isPending && "bg-muted text-muted-foreground"
                  )}
                >
                  {isCompleted ? <CheckCircle2 className="h-4 w-4" /> : <span className="text-xs font-bold">{stop.sequenceNo}</span>}
                </motion.div>
              </div>
              <div className="text-center">
                <p className={cn("text-[10px] font-medium leading-tight max-w-[80px] truncate", isCurrent ? "text-primary" : "text-muted-foreground")}>{stop.stopName}</p>
                <p className="text-[9px] text-muted-foreground">{STOP_TYPES[stop.stopType] || stop.stopType}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
