"use client";

import { useEffect, useState } from "react";
import { apiGet } from "@/lib/api-client";
import { useAppStore } from "@/store/app-store";
import { PageHeader } from "@/components/app/page-header";
import { StatusBadge } from "@/components/app/status-badge";
import { EmptyState, LoadingState, ErrorState } from "@/components/app/empty-state";
import { Input } from "@/components/ui/input";
import { Truck, Search, Calendar, ChevronRight } from "lucide-react";
import { formatDateTime, formatRouteDetails, isCrewRole, planCode, requestCode, transportPlanStatusLabel } from "@/lib/constants";
import { getDriverPlans, type DriverTransportPlan } from "@/lib/driver-api";

interface StaffPlan {
  planId: string;
  requestId: string;
  routeDetails: string | null;
  departureTime: string;
  arrivalTime: string;
  status: string;
}

export function TripList() {
  const { navigate, user } = useAppStore();
  const [plans, setPlans] = useState<(DriverTransportPlan | StaffPlan)[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    let active = true;
    const result = isCrewRole(user?.roleId)
      ? getDriverPlans()
      : apiGet<StaffPlan[]>("/transport-plans");
    void result
      .then((data) => { if (active) setPlans(data); })
      .catch((cause: unknown) => {
        if (active) setError(cause instanceof Error ? cause.message : "Không thể tải kế hoạch được giao.");
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [user?.roleId]);

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} />;

  const query = search.trim().toLowerCase();
  const filtered = plans.filter((plan) =>
    !query || plan.planId.toLowerCase().includes(query)
      || (plan.requestId ?? "").toLowerCase().includes(query)
      || (plan.routeDetails ?? "").toLowerCase().includes(query)
      || transportPlanStatusLabel(plan.status).toLowerCase().includes(query));
  const isAssignedCrew = isCrewRole(user?.roleId);

  return (
    <div className="space-y-6">
      <PageHeader
        title={isAssignedCrew ? "Chuyến được giao" : "Chuyến vận chuyển"}
        description={isAssignedCrew ? "Các kế hoạch vận chuyển được phân công cho tài khoản của bạn." : "Danh sách kế hoạch vận chuyển trong phạm vi vai trò của bạn."}
        icon={<Truck className="h-5 w-5" />}
        actions={<div className="relative w-full sm:w-64"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input aria-label="Tìm kiếm" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Tìm kiếm" className="pl-9" /></div>}
      />
      {filtered.length === 0 ? (
        <EmptyState icon={<Truck className="h-6 w-6" />} title={plans.length === 0 ? "Chưa có chuyến được giao" : "Không tìm thấy kế hoạch"} description={plans.length === 0 ? "Kế hoạch sẽ hiển thị khi bạn được phân công làm tài xế hoặc nhân viên đi kèm." : "Thử tìm bằng mã kế hoạch hoặc trạng thái khác."} />
      ) : (
        <div className="space-y-3">
          {filtered.map((plan) => (
            <button key={plan.planId} onClick={() => navigate(isAssignedCrew ? "trip-detail" : "plan-detail", { id: plan.planId })} className="flex w-full items-center gap-4 rounded-xl border border-border bg-card p-4 text-left transition-all hover:border-primary/40 hover:shadow-md">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"><Truck className="h-6 w-6" /></div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{plan.routeDetails ? `${planCode(plan.planId)} · ${formatRouteDetails(plan.routeDetails)}` : `Kế hoạch ${planCode(plan.planId)}`}</p>
                <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                  <span>Yêu cầu {requestCode(plan.requestId)}</span>
                  <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />Khởi hành: {formatDateTime(plan.departureTime)}</span>
                  <span>Kết thúc: {formatDateTime(plan.arrivalTime)}</span>
                </div>
              </div>
              <StatusBadge status={transportPlanStatusLabel(plan.status)} />
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
