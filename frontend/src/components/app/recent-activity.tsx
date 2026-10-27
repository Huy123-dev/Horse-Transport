"use client";

import { useEffect, useState } from "react";
import { apiGet } from "@/lib/api-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, Clock, User, FileText, CheckCircle2, XCircle, Plus, Route, Truck, ShieldCheck, CreditCard } from "lucide-react";
import { formatDateTime } from "@/lib/constants";
import { motion } from "framer-motion";

const ACTION_ICONS: { match: string; icon: any; tone: string }[] = [
  { match: "tạo", icon: Plus, tone: "info" },
  { match: "phê duyệt", icon: CheckCircle2, tone: "success" },
  { match: "từ chối", icon: XCircle, tone: "danger" },
  { match: "thẩm định", icon: ShieldCheck, tone: "info" },
  { match: "kế hoạch", icon: Route, tone: "info" },
  { match: "phân bổ", icon: Truck, tone: "info" },
  { match: "chặng", icon: Route, tone: "info" },
  { match: "sẵn sàng", icon: CheckCircle2, tone: "success" },
  { match: "thanh toán", icon: CreditCard, tone: "success" },
  { match: "hóa đơn", icon: CreditCard, tone: "info" },
  { match: "mốc", icon: Clock, tone: "info" },
  { match: "sự cố", icon: XCircle, tone: "danger" },
  { match: "bàn giao", icon: CheckCircle2, tone: "success" },
  { match: "đăng nhập", icon: User, tone: "default" },
];

const TONE_CLASSES: Record<string, string> = {
  default: "bg-muted text-muted-foreground",
  success: "bg-[var(--success-bg)] text-[var(--success-fg)]",
  warning: "bg-[var(--warning-bg)] text-[var(--warning-fg)]",
  danger: "bg-[var(--danger-bg)] text-[var(--danger-fg)]",
  info: "bg-[var(--info-bg)] text-[var(--info-fg)]",
};

function getActionIcon(action: string) {
  const lower = action.toLowerCase();
  const found = ACTION_ICONS.find((a) => lower.includes(a.match));
  return found || { icon: Activity, tone: "default" };
}

export function RecentActivity() {
  const [activities, setActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const data = await apiGet("/recent-activity");
        if (active) setActivities(data.activities);
      } catch { /* ignore */ }
      finally { if (active) setLoading(false); }
    })();
    return () => { active = false; };
  }, []);

  if (loading) {
    return (
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Activity className="h-4 w-4 text-primary" /> Hoạt động gần đây</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="skeleton-shimmer h-8 w-8 rounded-lg" />
                <div className="flex-1 space-y-1">
                  <div className="skeleton-shimmer h-3 w-1/2 rounded" />
                  <div className="skeleton-shimmer h-2 w-1/3 rounded" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (activities.length === 0) return null;

  return (
    <Card className="card-hover">
      <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Activity className="h-4 w-4 text-primary" /> Hoạt động gần đây</CardTitle></CardHeader>
      <CardContent>
        <div className="relative space-y-1 before:absolute before:left-[15px] before:top-2 before:h-[calc(100%-1rem)] before:w-0.5 before:bg-border">
          {activities.map((a, i) => {
            const { icon: Icon, tone } = getActionIcon(a.action);
            return (
              <motion.div
                key={a.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05, duration: 0.2 }}
                className="relative flex gap-3 pb-2"
              >
                <div className={`z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ring-4 ring-background ${TONE_CLASSES[tone]}`}>
                  <Icon className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1 pt-0.5">
                  <p className="text-sm font-medium leading-tight">{a.action}</p>
                  {a.details && <p className="mt-0.5 text-xs text-muted-foreground line-clamp-1">{a.details}</p>}
                  <div className="mt-1 flex items-center gap-2 text-[10px] text-muted-foreground">
                    <span className="flex items-center gap-0.5"><User className="h-2.5 w-2.5" />{a.user}</span>
                    <span>·</span>
                    <span className="flex items-center gap-0.5"><Clock className="h-2.5 w-2.5" />{formatDateTime(a.time)}</span>
                    {a.competitionName && <><span>·</span><span className="flex items-center gap-0.5 truncate"><FileText className="h-2.5 w-2.5" />{a.competitionName}</span></>}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
