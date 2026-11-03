"use client";

import { useCallback, useEffect, useState } from "react";
import { apiGet } from "@/lib/api-client";
import { useAppStore } from "@/store/app-store";
import { ROLE_LABELS, formatRouteDetails, inspectionStatusLabel, planCode, requestCode, transportPlanStatusLabel, transportRequestStatusLabel } from "@/lib/constants";
import { PageHeader } from "@/components/app/page-header";
import { StatCard } from "@/components/app/stat-card";
import { StatusBadge } from "@/components/app/status-badge";
import { EmptyState, ErrorState, LoadingState } from "@/components/app/empty-state";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Activity, ClipboardCheck, FileText, Heart, Route, Truck } from "lucide-react";
import { formatDate, formatDateTime, formatMoney } from "@/lib/constants";
import { getDashboardStats, type DashboardStats } from "@/lib/dashboard-api";
import { StatusPieChart } from "@/components/app/charts";

interface TransportRequest {
  requestId: string;
  customerName: string;
  origin: { name: string };
  destination: { name: string };
  scheduledDepartureDate: string | null;
  status: string;
  updatedAt: string;
}

interface TransportPlan {
  planId: string;
  requestId: string;
  routeDetails: string | null;
  departureTime: string;
  arrivalTime: string;
  status: string;
  coordinatorName: string | null;
}

interface TransportAsset {
  assetId: string;
  name: string;
  status: string;
}

interface Inspection {
  inspectionId: string;
  requestId: string;
  horseName: string;
  agencyName: string;
  status: string;
  updatedAt: string;
}

interface DashboardData {
  requests: TransportRequest[];
  plans: TransportPlan[];
  assets: TransportAsset[];
  inspections: Inspection[];
  incidentCount: number;
  stats: DashboardStats | null;
}

type SupportedDashboardRole = "LOGISTICS_MANAGER" | "TRANSPORT_SPECIALIST" | "FLEET_COORDINATOR";

function normalized(status?: string | null): string {
  if (!status || typeof status !== "string") return "";
  return status.trim().toLowerCase().replaceAll("_", " ");
}

function isPendingRequest(status: string): boolean {
  return ["pending", "dang tham dinh"].includes(normalized(status));
}

function isActivePlan(status: string): boolean {
  return ["ready", "in progress", "san sang", "dang thuc hien"].includes(normalized(status));
}

function isAvailableAsset(status: string): boolean {
  return ["available", "san sang"].includes(normalized(status));
}

function isActiveInspection(status: string): boolean {
  return ["pending", "processing", "needs info", "cho xu ly", "dang xu ly", "yeu cau bo sung ho so"].includes(normalized(status));
}

function emptyData(): DashboardData {
  return { requests: [], plans: [], assets: [], inspections: [], incidentCount: 0, stats: null };
}

function formatRevenueByCurrency(stats: DashboardStats): string {
  if (stats.paidRevenueByCurrency.length === 0) return formatMoney(0, "USD");
  return stats.paidRevenueByCurrency.map(({ amount, currency }) =>
    formatMoney(amount, currency)
  ).join(" · ");
}

export function RoleDashboard({ role }: { role: SupportedDashboardRole }) {
  const { navigate } = useAppStore();
  const [data, setData] = useState<DashboardData>(emptyData);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      let result = emptyData();
      if (role === "LOGISTICS_MANAGER") {
        const [requests, incidents, plans, stats] = await Promise.all([
          apiGet<TransportRequest[]>("/transport-requests"),
          apiGet<unknown[]>("/incidents"),
          apiGet<TransportPlan[]>("/transport-plans"),
          getDashboardStats(),
        ]);
        result = { ...result, requests, plans, incidentCount: incidents.length, stats };
        setData(result);
        return;
      }
      if (role === "FLEET_COORDINATOR") {
        const [plans, assets] = await Promise.all([
          apiGet<TransportPlan[]>("/transport-plans"),
          apiGet<TransportAsset[]>("/transport-assets"),
        ]);
        result = { ...result, plans, assets };
      } else if (role === "TRANSPORT_SPECIALIST") {
        const [requests, inspections] = await Promise.all([
          apiGet<TransportRequest[]>("/transport-requests"),
          apiGet<Inspection[]>("/inspections"),
        ]);
        result = { ...result, requests, inspections };
      }
      setData(result);
    } catch (loadError: unknown) {
      setError(loadError instanceof Error ? loadError.message : "Không thể tải dữ liệu tổng quan.");
    } finally {
      setLoading(false);
    }
  }, [role]);

  useEffect(() => {
    void Promise.resolve().then(load);
  }, [load]);

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} onRetry={() => void load()} />;

  const pendingRequests = data.requests.filter((request) => isPendingRequest(request.status));
  const title = role === "FLEET_COORDINATOR"
    ? "Tổng quan Điều phối"
    : role === "TRANSPORT_SPECIALIST"
      ? "Tổng quan Chuyên viên"
      : "Tổng quan Quản lý Logistics";

  return (
    <div className="space-y-6">
      <PageHeader
        title={title}
        description={ROLE_LABELS[role] ?? role}
        icon={<Activity className="h-5 w-5" />}
        actions={
          role === "LOGISTICS_MANAGER"
            ? <div className="flex flex-wrap gap-2">
                <Button onClick={() => navigate("approvals")}>Mở hàng đợi phê duyệt</Button>
                <Button variant="outline" onClick={() => navigate("staff")}>Quản lý nhân sự</Button>
              </div>
            : role === "FLEET_COORDINATOR"
              ? <Button onClick={() => navigate("plans")}>Mở kế hoạch vận chuyển</Button>
              : role === "TRANSPORT_SPECIALIST"
                ? <Button onClick={() => navigate("inspections")}>Mở hồ sơ kiểm định</Button>
                : undefined
        }
      />

      {role === "LOGISTICS_MANAGER" ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Tổng yêu cầu vận chuyển" value={data.stats?.totalTransportRequests ?? 0} icon={<FileText className="h-6 w-6" />} tone="info" />
            <StatCard label="Chuyến đang chạy" value={data.stats?.inProgressPlans ?? 0} icon={<Truck className="h-6 w-6" />} tone="success" />
            <StatCard label="Chuyến đã hoàn thành" value={data.stats?.completedPlans ?? 0} icon={<Route className="h-6 w-6" />} tone="default" />
            <StatCard
              label="Doanh thu hóa đơn đã thanh toán"
              value={data.stats ? formatRevenueByCurrency(data.stats) : "—"}
              icon={<Activity className="h-6 w-6" />}
              tone="info"
              tooltip="Tổng được nhóm theo đơn vị tiền tệ; hệ thống chưa áp dụng tỷ giá quy đổi."
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Chờ thẩm định: {pendingRequests.length} · Sự cố ghi nhận: {data.incidentCount}
          </p>
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader><CardTitle className="text-base">Phân bố yêu cầu</CardTitle></CardHeader>
              <CardContent>
                <StatusPieChart data={statusCounts(data.requests.map((request) => transportRequestStatusLabel(request.status)))} />
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-base">Trạng thái chuyến vận chuyển</CardTitle></CardHeader>
              <CardContent>
                <StatusPieChart data={statusCounts(data.plans.map((plan) => transportPlanStatusLabel(plan.status)))} />
              </CardContent>
            </Card>
          </div>
          <RequestQueue requests={data.requests} onOpen={(id) => navigate("request-detail", { id })} />
        </>
      ) : null}

      {role === "FLEET_COORDINATOR" ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Kế hoạch" value={data.plans.length} icon={<Route className="h-6 w-6" />} tone="info" />
            <StatCard label="Đang lập kế hoạch" value={data.plans.filter((plan) => normalized(plan.status) === "planning" || normalized(plan.status) === "dang lap ke hoach").length} icon={<ClipboardCheck className="h-6 w-6" />} tone="warning" />
            <StatCard label="Sẵn sàng/đang chạy" value={data.plans.filter((plan) => isActivePlan(plan.status)).length} icon={<Truck className="h-6 w-6" />} tone="success" />
            <StatCard label="Phương tiện sẵn sàng" value={`${data.assets.filter((asset) => isAvailableAsset(asset.status)).length}/${data.assets.length}`} icon={<Heart className="h-6 w-6" />} />
          </div>
          <Card>
            <CardHeader><CardTitle className="text-base">Trạng thái kế hoạch</CardTitle></CardHeader>
            <CardContent><StatusPieChart data={statusCounts(data.plans.map((plan) => transportPlanStatusLabel(plan.status)))} /></CardContent>
          </Card>
          <PlanQueue plans={data.plans} onOpen={(id) => navigate("plan-detail", { id })} />
        </>
      ) : null}

      {role === "TRANSPORT_SPECIALIST" ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <StatCard label="Bản ghi kiểm định" value={data.inspections.length} icon={<ClipboardCheck className="h-6 w-6" />} tone="info" />
            <StatCard label="Đang xử lý / cần bổ sung" value={data.inspections.filter((item) => isActiveInspection(item.status)).length} icon={<FileText className="h-6 w-6" />} tone="warning" />
            <StatCard label="Yêu cầu vận chuyển" value={data.requests.length} icon={<Route className="h-6 w-6" />} />
          </div>
          <Card>
            <CardHeader><CardTitle className="text-base">Trạng thái hồ sơ kiểm định</CardTitle></CardHeader>
            <CardContent><StatusPieChart data={statusCounts(data.inspections.map((item) => inspectionStatusLabel(item.status)))} /></CardContent>
          </Card>
          <InspectionQueue inspections={data.inspections} onOpen={(id) => navigate("inspection-detail", { id })} />
        </>
      ) : null}
    </div>
  );
}

function statusCounts(statuses: string[]): { name: string; value: number }[] {
  const counts = statuses.reduce<Record<string, number>>((current, status) => {
    current[status] = (current[status] ?? 0) + 1;
    return current;
  }, {});
  return Object.entries(counts).map(([name, value]) => ({ name, value }));
}

function RequestQueue({ requests, onOpen }: { requests: TransportRequest[]; onOpen: (id: string) => void }) {
  const recent = [...requests].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, 8);
  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Yêu cầu gần đây</CardTitle></CardHeader>
      <CardContent className="space-y-2">
        {recent.length === 0 ? <EmptyState title="Chưa có yêu cầu" /> : recent.map((request) => (
          <button key={request.requestId} onClick={() => onOpen(request.requestId)} className="flex w-full items-center gap-3 rounded-lg border border-border p-3 text-left hover:border-primary/40">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">{requestCode(request.requestId)} · {request.customerName}</p>
              <p className="mt-1 text-xs text-muted-foreground">{request.origin?.name || "Chưa xác định"} → {request.destination?.name || "Chưa xác định"} · {formatDate(request.scheduledDepartureDate)}</p>
            </div>
            <StatusBadge status={transportRequestStatusLabel(request.status)} />
          </button>
        ))}
      </CardContent>
    </Card>
  );
}

function PlanQueue({ plans, onOpen }: { plans: TransportPlan[]; onOpen: (id: string) => void }) {
  const recent = [...plans].sort((a, b) => b.departureTime.localeCompare(a.departureTime)).slice(0, 8);
  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Kế hoạch gần đây</CardTitle></CardHeader>
      <CardContent className="space-y-2">
        {recent.length === 0 ? <EmptyState title="Chưa có kế hoạch" /> : recent.map((plan) => (
          <button key={plan.planId} onClick={() => onOpen(plan.planId)} className="flex w-full items-center gap-3 rounded-lg border border-border p-3 text-left hover:border-primary/40">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">{formatRouteDetails(plan.routeDetails) || `Kế hoạch ${planCode(plan.planId)}`}</p>
              <p className="mt-1 text-xs text-muted-foreground">Yêu cầu {requestCode(plan.requestId)} · {formatDateTime(plan.departureTime)}</p>
            </div>
            <StatusBadge status={transportPlanStatusLabel(plan.status)} />
          </button>
        ))}
      </CardContent>
    </Card>
  );
}

function InspectionQueue({ inspections, onOpen }: { inspections: Inspection[]; onOpen: (id: string) => void }) {
  const recent = [...inspections].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, 8);
  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Hồ sơ kiểm định gần đây</CardTitle></CardHeader>
      <CardContent className="space-y-2">
        {recent.length === 0 ? <EmptyState title="Chưa có bản ghi kiểm định" /> : recent.map((inspection) => (
          <button key={inspection.inspectionId} onClick={() => onOpen(inspection.inspectionId)} className="flex w-full items-center gap-3 rounded-lg border border-border p-3 text-left hover:border-primary/40">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">{inspection.horseName} · {inspection.agencyName}</p>
              <p className="mt-1 text-xs text-muted-foreground">Yêu cầu {requestCode(inspection.requestId)} · {formatDate(inspection.updatedAt)}</p>
            </div>
            <StatusBadge status={inspectionStatusLabel(inspection.status)} />
          </button>
        ))}
      </CardContent>
    </Card>
  );
}
