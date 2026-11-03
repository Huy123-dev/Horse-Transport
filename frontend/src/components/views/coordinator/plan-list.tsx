"use client";

import { useEffect, useState } from "react";
import { apiGet } from "@/lib/api-client";
import { useAppStore } from "@/store/app-store";
import { PageHeader } from "@/components/app/page-header";
import { StatusBadge } from "@/components/app/status-badge";
import { EmptyState, LoadingState, ErrorState } from "@/components/app/empty-state";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Route, Search, Calendar, Truck, ChevronRight, Plus } from "lucide-react";
import { formatDateTime, formatRouteDetails, planCode, requestCode, transportPlanStatusLabel } from "@/lib/constants";

interface TransportPlan {
  planId: string;
  requestId: string;
  routeDetails: string | null;
  departureTime: string;
  arrivalTime: string;
  status: string;
  coordinatorName: string | null;
}

export function PlanList() {
  const { navigate, user } = useAppStore();
  const [plans, setPlans] = useState<TransportPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    (async () => {
      try { setPlans(await apiGet<TransportPlan[]>("/transport-plans")); }
      catch (e) { setError(e instanceof Error ? e.message : "Không thể tải danh sách kế hoạch."); }
      finally { setLoading(false); }
    })();
  }, []);

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} />;

  const filtered = plans.filter((plan) =>
    !search ||
    plan.routeDetails?.toLowerCase().includes(search.toLowerCase()) ||
    plan.requestId?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <PageHeader title="Kế hoạch lộ trình" description="Danh sách kế hoạch vận chuyển và tình trạng điều phối" icon={<Route className="h-5 w-5" />}
        actions={
          <div className="flex items-center gap-2">
            <div className="relative w-full sm:w-56"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input aria-label="Tìm kiếm" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Tìm kiếm" className="pl-9" /></div>
            {user?.roleId === "FLEET_COORDINATOR" && <Button onClick={() => navigate("plan-create")} className="gap-2"><Plus className="h-4 w-4" /> Tạo kế hoạch</Button>}
          </div>
        }
      />
      {filtered.length === 0 ? (
        <EmptyState icon={<Route className="h-6 w-6" />} title="Chưa có kế hoạch" description="Đơn đã phê duyệt sẽ sẵn sàng để lập kế hoạch." />
      ) : (
        <div className="space-y-3">
          {filtered.map((plan) => (
            <button key={plan.planId} onClick={() => navigate("plan-detail", { id: plan.planId })} className="flex w-full items-center gap-4 rounded-xl border border-border bg-card p-4 text-left transition-all hover:border-primary/40 hover:shadow-md">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"><Route className="h-6 w-6" /></div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{plan.routeDetails ? `${planCode(plan.planId)} · ${formatRouteDetails(plan.routeDetails)}` : `Kế hoạch ${planCode(plan.planId)}`}</p>
                <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{formatDateTime(plan.departureTime)} → {formatDateTime(plan.arrivalTime)}</span>
                  <span className="flex items-center gap-1"><Truck className="h-3 w-3" />Yêu cầu {requestCode(plan.requestId)}</span>
                  {plan.coordinatorName && <span>Điều phối: {plan.coordinatorName}</span>}
                </div>
              </div>
              <StatusBadge status={transportPlanStatusLabel(plan.status)} />
              <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
