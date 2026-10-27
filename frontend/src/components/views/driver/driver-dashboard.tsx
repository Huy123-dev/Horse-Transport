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
  Truck,
  MapPin,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Navigation,
  FileCheck,
  ShieldAlert,
  ArrowRight,
} from "lucide-react";
import { formatDateTime, formatRouteDetails, planCode, transportPlanStatusLabel } from "@/lib/constants";
import { StatusPieChart } from "@/components/app/charts";

export function DriverDashboard() {
  const { navigate, user } = useAppStore();
  const [plans, setPlans] = useState<DriverTransportPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    void getDriverPlans()
      .then((data) => {
        if (active) setPlans(data);
      })
      .catch((cause: unknown) => {
        if (active) setError(cause instanceof Error ? cause.message : "Không thể tải kế hoạch được giao.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} />;

  const inProgressPlans = plans.filter((p) => p.status === "IN_PROGRESS");
  const upcomingPlans = plans
    .filter((p) => p.status === "READY" || p.status === "PLANNING")
    .sort((a, b) => new Date(a.departureTime).getTime() - new Date(b.departureTime).getTime());
  const completedPlans = plans.filter((p) => p.status === "COMPLETED");

  const primaryTrip = inProgressPlans[0] || upcomingPlans[0] || null;
  const recentPlans = plans.slice(0, 6);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Bảng điều khiển Tài xế"
        description="Quản lý lịch trình vận chuyển, kiểm soát phương tiện và cập nhật mốc hành trình theo thời gian thực."
        icon={<Truck className="h-5 w-5" />}
      />

      {/* Thẻ thống kê chỉ số */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Tổng chuyến được giao"
          value={plans.length}
          icon={<ClipboardList className="h-6 w-6" />}
          tone="default"
          delay={0}
        />
        <StatCard
          label="Chuyến đang vận hành"
          value={inProgressPlans.length}
          icon={<Truck className="h-6 w-6" />}
          tone="info"
          hint="Phương tiện đang trên đường"
          delay={0.05}
        />
        <StatCard
          label="Chuyến sắp khởi hành"
          value={upcomingPlans.length}
          icon={<Clock className="h-6 w-6" />}
          tone="warning"
          hint="Sẵn sàng hoặc đang lập kế hoạch"
          delay={0.1}
        />
        <StatCard
          label="Chuyến đã hoàn thành"
          value={completedPlans.length}
          icon={<CheckCircle2 className="h-6 w-6" />}
          tone="success"
          hint="Giao nhận và ký chứng từ POD thành công"
          delay={0.15}
        />
      </div>

      {/* Chuyến xe trọng tâm: Đang vận chuyển hoặc sắp khởi hành */}
      {primaryTrip ? (
        <Card className="border-primary/30 bg-gradient-to-br from-card to-primary/5 shadow-sm">
          <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-3 gap-2">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Badge variant={primaryTrip.status === "IN_PROGRESS" ? "default" : "secondary"} className="gap-1">
                  {primaryTrip.status === "IN_PROGRESS" ? (
                    <>
                      <Truck className="h-3.5 w-3.5 animate-pulse" /> Đang vận hành
                    </>
                  ) : (
                    <>
                      <Clock className="h-3.5 w-3.5" /> Chuyến xe tiếp theo
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
              className="gap-1.5 self-start sm:self-auto"
            >
              Xem chi tiết chuyến <ArrowRight className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4 rounded-lg border border-border/80 bg-background/80 p-3">
              <div>
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Navigation className="h-3.5 w-3.5 text-primary" /> Tuyến đường vận chuyển
                </span>
                <p className="text-sm font-semibold mt-1 text-foreground">
                  {formatRouteDetails(primaryTrip.routeDetails)}
                </p>
              </div>
              <div>
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5 text-blue-500" /> Thời gian khởi hành
                </span>
                <p className="text-sm font-medium mt-1">
                  {formatDateTime(primaryTrip.departureTime)}
                </p>
              </div>
              <div>
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5 text-emerald-500" /> Dự kiến đến nơi
                </span>
                <p className="text-sm font-medium mt-1">
                  {formatDateTime(primaryTrip.arrivalTime)}
                </p>
              </div>
              <div>
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Truck className="h-3.5 w-3.5 text-purple-500" /> Ngựa vận chuyển
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

            {/* Thanh tác vụ nhanh */}
            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border/60 pt-3 text-xs text-muted-foreground">
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5 text-primary" /> Cập nhật GPS liên tục
                </span>
                <span className="flex items-center gap-1">
                  <ShieldAlert className="h-3.5 w-3.5 text-amber-500" /> Hỗ trợ SOS 24/7
                </span>
                <span className="flex items-center gap-1">
                  <FileCheck className="h-3.5 w-3.5 text-emerald-500" /> Ký nhận POD điện tử
                </span>
              </div>
              <StatusBadge status={transportPlanStatusLabel(primaryTrip.status)} />
            </div>
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Danh sách kế hoạch được giao gần đây */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle className="text-base">Kế hoạch vận chuyển được giao</CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                Các chuyến xe trong lịch phân công nhiệm vụ của bạn
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
            {recentPlans.length === 0 ? (
              <EmptyState
                icon={<Truck className="h-6 w-6" />}
                title="Chưa có chuyến được phân công"
                description="Khi Điều phối viên chỉ định bạn vào chuyến vận chuyển mới, thông tin sẽ tự động hiển thị tại đây."
              />
            ) : (
              <div className="space-y-2.5">
                {recentPlans.map((plan) => (
                  <button
                    key={plan.planId}
                    onClick={() => navigate("trip-detail", { id: plan.planId })}
                    className="flex w-full flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-lg border border-border bg-card p-3.5 text-left transition-all hover:border-primary/40 hover:shadow-sm"
                  >
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary mt-0.5 sm:mt-0">
                        <Truck className="h-5 w-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="truncate text-sm font-semibold">
                            Kế hoạch {planCode(plan.planId)}
                          </p>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                          <Navigation className="h-3 w-3 shrink-0 text-primary" />
                          <span className="truncate">{formatRouteDetails(plan.routeDetails)}</span>
                        </p>
                        <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                          <Calendar className="h-3 w-3 shrink-0" />
                          {formatDateTime(plan.departureTime)}
                        </p>
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

        {/* Cột phải: Nhiệm vụ ưu tiên & Biểu đồ trạng thái */}
        <div className="space-y-6">
          {/* Hướng dẫn công việc ưu tiên của Tài xế */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <ClipboardList className="h-4 w-4 text-primary" /> Công việc ưu tiên của Tài xế
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-xs text-muted-foreground">
              <div className="flex items-start gap-2.5 rounded-md border border-border/60 bg-muted/30 p-2.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-foreground">1. Kiểm tra xe trước chuyến</p>
                  <p className="text-muted-foreground mt-0.5">
                    Kiểm tra hệ thống điều hòa, sàn xe chống trơn trượt và bình nước dự phòng.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-2.5 rounded-md border border-border/60 bg-muted/30 p-2.5">
                <MapPin className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-foreground">2. Ghi nhận mốc hành trình</p>
                  <p className="text-muted-foreground mt-0.5">
                    Cập nhật tọa độ GPS tại các trạm thu phí, điểm dừng nghỉ và trạm kiểm dịch.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-2.5 rounded-md border border-border/60 bg-muted/30 p-2.5">
                <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-foreground">3. Báo cáo sự cố tức thời</p>
                  <p className="text-muted-foreground mt-0.5">
                    Khi gặp sự cố kỹ thuật, gửi thông báo SOS để điều phối viên kịp thời hỗ trợ.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-2.5 rounded-md border border-border/60 bg-muted/30 p-2.5">
                <FileCheck className="h-4 w-4 text-purple-500 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-foreground">4. Bàn giao ký nhận POD</p>
                  <p className="text-muted-foreground mt-0.5">
                    Thu thập chữ ký xác nhận của người nhận và tải ảnh biên bản bàn giao thành công.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Biểu đồ phân bổ trạng thái */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Phân bổ trạng thái chuyến</CardTitle>
            </CardHeader>
            <CardContent>
              {plans.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-4">Chưa có dữ liệu chuyến</p>
              ) : (
                <StatusPieChart
                  data={countStatuses(plans.map((plan) => transportPlanStatusLabel(plan.status)))}
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
