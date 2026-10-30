"use client";

import { useEffect, useState } from "react";
import { useAppStore } from "@/store/app-store";
import { getDriverPlans, type DriverTransportPlan } from "@/lib/driver-api";
import { PageHeader } from "@/components/app/page-header";
import { StatCard } from "@/components/app/stat-card";
import { StatusBadge } from "@/components/app/status-badge";
import { EmptyState, ErrorState, LoadingState } from "@/components/app/empty-state";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Calendar,
  ChevronRight,
  ClipboardList,
  Clock,
  Heart,
  Navigation,
  Stethoscope,
  Truck,
  ArrowRight,
  CheckCircle2,
} from "lucide-react";
import {
  formatDateTime,
  formatRouteDetails,
  planCode,
  transportPlanStatusLabel,
} from "@/lib/constants";
import { StatusPieChart } from "@/components/app/charts";

export function EscortDashboard() {
  const { navigate, user } = useAppStore();
  const [plans, setPlans] = useState<DriverTransportPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadData = async () => {
    try {
      setLoading(true);
      setError("");
      const planList = await getDriverPlans();
      setPlans(planList);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Không thể tải danh sách chuyến được phân công.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} onRetry={() => void loadData()} />;

  const inProgressPlans = plans.filter((p) => p.status === "IN_PROGRESS");
  const upcomingPlans = plans
    .filter((p) => p.status === "READY" || p.status === "PLANNING")
    .sort((a, b) => new Date(a.departureTime).getTime() - new Date(b.departureTime).getTime());
  const completedPlans = plans.filter((p) => p.status === "COMPLETED");

  const totalAssignedHorses = plans.reduce((acc, p) => acc + (p.horses?.length || p.horseIds?.length || 0), 0);
  const primaryTrip = inProgressPlans[0] || upcomingPlans[0] || null;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Bảng điều khiển Nhân viên đi kèm"
        description={`Xin chào ${user?.name || ""}! Quản lý các chuyến đi kèm, theo dõi thể trạng và ghi nhận nhật ký chăm sóc theo từng chuyến.`}
        icon={<Stethoscope className="h-5 w-5" />}
      />

      {/* Thẻ thống kê chỉ số */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Tổng chuyến tham gia"
          value={plans.length}
          icon={<Truck className="h-6 w-6" />}
          tone="default"
          delay={0}
        />
        <StatCard
          label="Chuyến đang áp tải"
          value={inProgressPlans.length}
          icon={<Stethoscope className="h-6 w-6" />}
          tone="info"
          hint="Đang trên lộ trình chăm sóc"
          delay={0.05}
        />
        <StatCard
          label="Chuyến sắp tới"
          value={upcomingPlans.length}
          icon={<Clock className="h-6 w-6" />}
          tone="warning"
          hint="Chuẩn bị tiếp nhận ngựa"
          delay={0.1}
        />
        <StatCard
          label="Tổng ngựa phụ trách"
          value={totalAssignedHorses}
          icon={<Heart className="h-6 w-6" />}
          tone="success"
          hint="Tổng cá thể trong các chuyến"
          delay={0.15}
        />
      </div>

      {/* Chuyến xe trọng tâm cần chăm sóc */}
      {primaryTrip && (
        <Card className="border-rose-500/30 bg-gradient-to-br from-card to-rose-500/5 shadow-sm">
          <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-3 gap-2">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Badge variant={primaryTrip.status === "IN_PROGRESS" ? "default" : "secondary"} className="gap-1">
                  {primaryTrip.status === "IN_PROGRESS" ? (
                    <>
                      <Stethoscope className="h-3.5 w-3.5 animate-pulse text-rose-500" /> Đang vận hành
                    </>
                  ) : (
                    <>
                      <Clock className="h-3.5 w-3.5" /> Chuyến tiếp theo
                    </>
                  )}
                </Badge>
                <span className="text-base font-bold text-foreground">
                  Kế hoạch {planCode(primaryTrip.planId)}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                Điều phối viên: {primaryTrip.coordinatorName || "Đang phân công"}
              </p>
            </div>
            <Button
              size="sm"
              onClick={() => navigate("trip-detail", { id: primaryTrip.planId })}
              className="gap-1.5 self-start sm:self-auto bg-rose-600 hover:bg-rose-700 text-white"
            >
              Mở sổ theo dõi sức khỏe <ArrowRight className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4 rounded-lg border border-border/80 bg-background/80 p-3">
              <div>
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Navigation className="h-3.5 w-3.5 text-rose-500" /> Lộ trình
                </span>
                <p className="text-sm font-semibold mt-1 text-foreground">
                  {formatRouteDetails(primaryTrip.routeDetails)}
                </p>
              </div>
              <div>
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5 text-blue-500" /> Khởi hành
                </span>
                <p className="text-sm font-medium mt-1">
                  {formatDateTime(primaryTrip.departureTime)}
                </p>
              </div>
              <div>
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5 text-emerald-500" /> Dự kiến đến
                </span>
                <p className="text-sm font-medium mt-1">
                  {formatDateTime(primaryTrip.arrivalTime)}
                </p>
              </div>
              <div>
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Heart className="h-3.5 w-3.5 text-rose-500" /> Ngựa cần chăm sóc
                </span>
                <p className="text-sm font-medium mt-1">
                  {primaryTrip.horses?.length || primaryTrip.horseIds?.length || 0} chú ngựa
                  {primaryTrip.horses && primaryTrip.horses.length > 0 && (
                    <span className="block text-xs text-muted-foreground truncate">
                      ({primaryTrip.horses.map((h) => h.name).join(", ")})
                    </span>
                  )}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Danh sách các chuyến được giao chăm sóc */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <ClipboardList className="h-4 w-4 text-primary" />
                Danh sách chuyến được phân công đi kèm
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                Nhấp vào chuyến để ghi nhận quan sát sức khỏe và nhật ký chăm sóc
              </p>
            </div>
            <button
              onClick={() => navigate("trips")}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Xem tất cả ({plans.length}) <ChevronRight className="h-3 w-3" />
            </button>
          </CardHeader>
          <CardContent>
            {plans.length === 0 ? (
              <EmptyState
                icon={<Stethoscope className="h-6 w-6" />}
                title="Chưa có chuyến được phân công"
                description="Khi Điều phối viên phân công bạn làm nhân viên đi kèm cho chuyến vận chuyển, thông tin sẽ hiển thị tại đây."
              />
            ) : (
              <div className="space-y-3">
                {plans.map((plan) => (
                  <button
                    key={plan.planId}
                    onClick={() => navigate("trip-detail", { id: plan.planId })}
                    className="flex w-full flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-lg border border-border bg-card p-3.5 text-left transition-all hover:border-primary/40 hover:shadow-sm"
                  >
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-rose-500/10 text-rose-500 mt-0.5 sm:mt-0">
                        <Heart className="h-5 w-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold">
                          Kế hoạch {planCode(plan.planId)}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                          <Navigation className="h-3 w-3 shrink-0 text-primary" />
                          <span className="truncate">{formatRouteDetails(plan.routeDetails)}</span>
                        </p>
                        <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3 shrink-0" />
                            {formatDateTime(plan.departureTime)}
                          </span>
                          <span className="flex items-center gap-1 text-rose-600 font-medium">
                            <Heart className="h-3 w-3 shrink-0" />
                            {plan.horses?.length || plan.horseIds?.length || 0} con ngựa
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between sm:justify-end gap-2 shrink-0 border-t sm:border-t-0 pt-2 sm:pt-0">
                      <StatusBadge status={transportPlanStatusLabel(plan.status)} />
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Cột phải: Nhiệm vụ trọng tâm của Escort & Biểu đồ */}
        <div className="space-y-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Stethoscope className="h-4 w-4 text-rose-500" /> Nhiệm vụ của Nhân viên đi kèm
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-xs text-muted-foreground">
              <div className="flex items-start gap-2.5 rounded-md border border-border/60 bg-muted/30 p-2.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-foreground">1. Ghi nhận thể trạng từng con ngựa</p>
                  <p className="text-muted-foreground mt-0.5">
                    Mở chi tiết chuyến để đo thân nhiệt, nhịp tim, mức căng thẳng và khả năng ăn uống.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-2.5 rounded-md border border-border/60 bg-muted/30 p-2.5">
                <Heart className="h-4 w-4 text-rose-500 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-foreground">2. Ghi nhận sau khi hoàn thành chuyến</p>
                  <p className="text-muted-foreground mt-0.5">
                    Hệ thống cho phép bổ sung nhật ký thể trạng ngay cả khi chuyến đã kết thúc để lưu hồ sơ theo dõi.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-2.5 rounded-md border border-border/60 bg-muted/30 p-2.5">
                <ClipboardList className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-foreground">3. Phối hợp báo sự cố khẩn cấp</p>
                  <p className="text-muted-foreground mt-0.5">
                    Kịp thời gửi thông báo SOS khi ngựa có dấu hiệu mệt mỏi bất thường hoặc cần hỗ trợ y tế.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Phân bổ trạng thái chuyến</CardTitle>
            </CardHeader>
            <CardContent>
              {plans.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-4">Chưa có dữ liệu chuyến</p>
              ) : (
                <StatusPieChart
                  data={countStatuses(plans.map((p) => transportPlanStatusLabel(p.status)))}
                />
              )}
            </CardContent>
          </Card>
        </div>
      </div>
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
