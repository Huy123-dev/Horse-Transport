import { useEffect, useState } from "react";
import { useAppStore } from "@/store/app-store";
import { getDriverPlans, type DriverTransportPlan } from "@/lib/driver-api";
import { PageHeader } from "@/components/app/page-header";
import { StatCard } from "@/components/app/stat-card";
import { StatusBadge } from "@/components/app/status-badge";
import { EmptyState, ErrorState, LoadingState } from "@/components/app/empty-state";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, ChevronRight, ClipboardList, Truck } from "lucide-react";
import { formatDateTime, planCode, transportPlanStatusLabel } from "@/lib/constants";
import { StatusPieChart } from "@/components/app/charts";

const ACTIVE_PLAN_STATUSES = new Set(["Sẵn sàng", "Đang thực hiện"]);

export function DriverDashboard() {
  const { navigate, user } = useAppStore();
  const [plans, setPlans] = useState<DriverTransportPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    void getDriverPlans()
      .then((data) => { if (active) setPlans(data); })
      .catch((cause: unknown) => {
        if (active) setError(cause instanceof Error ? cause.message : "Không thể tải kế hoạch được giao.");
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} />;

  const activePlans = plans.filter((plan) => ACTIVE_PLAN_STATUSES.has(transportPlanStatusLabel(plan.status)));
  const recentPlans = plans.slice(0, 5);
  const dashboardTitle = user?.roleId === "DRIVER"
    ? "Tổng quan Tài xế"
    : user?.roleId === "ESCORT"
      ? "Tổng quan Nhân viên đi kèm"
      : "Tổng quan Tài xế / Nhân viên đi kèm";

  return (
    <div className="space-y-6">
      <PageHeader
        title={dashboardTitle}
        description="Kế hoạch vận chuyển được phân công cho tài khoản của bạn."
        icon={<Truck className="h-5 w-5" />}
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <StatCard label="Tổng kế hoạch được giao" value={plans.length} icon={<ClipboardList className="h-6 w-6" />} tone="default" delay={0} />
        <StatCard label="Kế hoạch đang hoạt động" value={activePlans.length} icon={<Truck className="h-6 w-6" />} tone="info" hint="Sẵn sàng hoặc đang thực hiện" delay={0.05} />
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Trạng thái kế hoạch được giao</CardTitle></CardHeader>
        <CardContent>
          <StatusPieChart data={countStatuses(plans.map((plan) => transportPlanStatusLabel(plan.status)))} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Kế hoạch được giao gần đây</CardTitle>
          <button onClick={() => navigate("trips")} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
            Xem tất cả <ChevronRight className="h-3 w-3" />
          </button>
        </CardHeader>
        <CardContent>
          {recentPlans.length === 0 ? (
            <EmptyState
              icon={<Truck className="h-6 w-6" />}
              title="Chưa có chuyến được giao"
              description="Kế hoạch sẽ xuất hiện khi bạn được phân công làm tài xế hoặc nhân viên đi kèm."
            />
          ) : (
            <div className="space-y-2">
              {recentPlans.map((plan) => (
                <button
                  key={plan.planId}
                  onClick={() => navigate("trip-detail", { id: plan.planId })}
                  className="flex w-full items-center gap-4 rounded-lg border border-border bg-card p-3 text-left transition-all hover:border-primary/40 hover:shadow-sm"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Truck className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">Kế hoạch {planCode(plan.planId)}</p>
                    <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                      <Calendar className="h-3 w-3" />{formatDateTime(plan.departureTime)}
                    </p>
                  </div>
                  <StatusBadge status={transportPlanStatusLabel(plan.status)} />
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function countStatuses(statuses: string[]): { name: string; value: number }[] {
  const counts = statuses.reduce<Record<string, number>>((current, status) => {
    current[status] = (current[status] ?? 0) + 1;
    return current;
  }, {});
  return Object.entries(counts).map(([name, value]) => ({ name, value }));
}
