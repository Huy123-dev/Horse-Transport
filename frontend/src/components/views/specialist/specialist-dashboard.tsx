"use client";

import { useCallback, useEffect, useState } from "react";
import { apiGet } from "@/lib/api-client";
import { useAppStore } from "@/store/app-store";
import { PageHeader } from "@/components/app/page-header";
import { StatCard } from "@/components/app/stat-card";
import { StatusBadge } from "@/components/app/status-badge";
import { EmptyState, ErrorState, LoadingState } from "@/components/app/empty-state";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ClipboardCheck, FileText, HeartPulse, Route, ShieldCheck, Truck } from "lucide-react";
import { formatDateTime, formatRouteDetails, inspectionCode, inspectionStatusLabel, planCode, requestCode, transportPlanStatusLabel, transportRequestStatusLabel } from "@/lib/constants";
import { StatusPieChart } from "@/components/app/charts";

interface TransportRequest {
  requestId: string;
  customerName: string;
  origin: { name: string };
  destination: { name: string };
  scheduledDepartureDate: string | null;
  status: string;
}

interface TransportPlan {
  planId: string;
  requestId: string;
  routeDetails: string | null;
  departureTime: string;
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
  pendingSpecialistRequests: TransportRequest[];
  approvedRequests: TransportRequest[];
  plans: TransportPlan[];
  inspections: Inspection[];
}

function normalized(status?: string | null): string {
  if (!status || typeof status !== "string") return "";
  return status.trim().toLowerCase().replaceAll("_", " ");
}

function isApproved(status: string): boolean {
  return ["approved", "da phe duyet"].includes(normalized(status));
}

function isPlanning(status: string): boolean {
  return ["planning", "dang lap ke hoach"].includes(normalized(status));
}

export function SpecialistDashboard() {
  const { navigate } = useAppStore();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [allRequests, plans, inspections] = await Promise.all([
        apiGet<TransportRequest[]>("/transport-requests"),
        apiGet<TransportPlan[]>("/transport-plans"),
        apiGet<Inspection[]>("/inspections"),
      ]);
      const plannedRequestIds = new Set(plans.map((plan) => plan.requestId));
      const pendingSpecialistRequests = allRequests.filter((r) => {
        const s = normalized(r.status);
        return s === "cho chuyen vien kiem tra" || s === "manager approved";
      });
      const approvedRequests = allRequests.filter((request) =>
        isApproved(request.status) && !plannedRequestIds.has(request.requestId));

      setData({
        pendingSpecialistRequests,
        approvedRequests,
        plans,
        inspections,
      });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Không thể tải dữ liệu chuyên viên.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void Promise.resolve().then(load);
  }, [load]);

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} onRetry={() => void load()} />;
  if (!data) return <ErrorState message="Không có dữ liệu tổng quan." />;

  const planningPlans = data.plans.filter((plan) => isPlanning(plan.status));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tổng quan Chuyên viên vận tải"
        description="Theo dõi thẩm định yêu cầu cấp 2, kế hoạch tuyến đường và hồ sơ kiểm định."
        icon={<ShieldCheck className="h-5 w-5" />}
        actions={
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => navigate("approvals")} variant="outline">Thẩm định yêu cầu</Button>
            <Button onClick={() => navigate("plans")} variant="outline">Danh sách kế hoạch</Button>
            <Button onClick={() => navigate("inspections")}>Hồ sơ kiểm định</Button>
          </div>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Chờ chuyên viên thẩm định" value={data.pendingSpecialistRequests.length} icon={<ShieldCheck className="h-6 w-6" />} tone="danger" />
        <StatCard label="Đã duyệt, chưa có kế hoạch" value={data.approvedRequests.length} icon={<FileText className="h-6 w-6" />} tone="warning" />
        <StatCard label="Kế hoạch đang lập" value={planningPlans.length} icon={<Route className="h-6 w-6" />} tone="info" />
        <StatCard label="Hồ sơ kiểm định" value={data.inspections.length} icon={<ClipboardCheck className="h-6 w-6" />} />
      </div>

      {data.pendingSpecialistRequests.length > 0 && (
        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base text-amber-800 dark:text-amber-400 flex items-center gap-2">
              <ShieldCheck className="h-5 w-5" /> Yêu cầu chờ chuyên viên thẩm định cấp 2 ({data.pendingSpecialistRequests.length})
            </CardTitle>
            <Button size="sm" onClick={() => navigate("approvals")}>Xem tất cả</Button>
          </CardHeader>
          <CardContent className="space-y-2">
            {data.pendingSpecialistRequests.slice(0, 3).map((request) => (
              <button
                key={request.requestId}
                onClick={() => navigate("approval-detail", { id: request.requestId })}
                className="flex w-full items-center gap-3 rounded-lg border border-border bg-card p-3 text-left transition-colors hover:border-primary/40"
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold">{requestCode(request.requestId)} · {request.customerName}</span>
                  <span className="mt-1 block text-xs text-muted-foreground">
                    {request.origin?.name || "Chưa xác định"} → {request.destination?.name || "Chưa xác định"}
                    {request.scheduledDepartureDate ? ` · ${formatDateTime(request.scheduledDepartureDate)}` : ""}
                  </span>
                </span>
                <StatusBadge status={transportRequestStatusLabel(request.status)} />
              </button>
            ))}
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-base">Trạng thái kế hoạch</CardTitle></CardHeader>
          <CardContent>
            <StatusPieChart data={countStatuses(data.plans.map((plan) => transportPlanStatusLabel(plan.status)))} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Trạng thái kiểm định</CardTitle></CardHeader>
          <CardContent>
            <StatusPieChart data={countStatuses(data.inspections.map((item) => inspectionStatusLabel(item.status)))} />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Route className="h-4 w-4" /> Kế hoạch cần hoàn thiện tuyến</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {planningPlans.length === 0 ? (
              <EmptyState title="Không có kế hoạch đang lập" description="Kế hoạch vận chuyển được tạo bởi Fleet Coordinator." />
            ) : planningPlans.map((plan) => (
              <button
                key={plan.planId}
                onClick={() => navigate("plan-detail", { id: plan.planId })}
                className="flex w-full items-center gap-3 rounded-lg border border-border p-3 text-left transition-colors hover:border-primary/40"
              >
                <Truck className="h-5 w-5 shrink-0 text-primary" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold">{formatRouteDetails(plan.routeDetails)}</span>
                  <span className="mt-1 block text-xs text-muted-foreground">
                    Yêu cầu {requestCode(plan.requestId)} · {formatDateTime(plan.departureTime)}
                  </span>
                </span>
                <StatusBadge status={transportPlanStatusLabel(plan.status)} />
              </button>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2 text-base"><FileText className="h-4 w-4" /> Yêu cầu đã duyệt chưa có kế hoạch</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {data.approvedRequests.length === 0 ? (
              <EmptyState title="Không có yêu cầu chờ lập kế hoạch" />
            ) : data.approvedRequests.map((request) => (
              <button
                key={request.requestId}
                onClick={() => navigate("request-detail", { id: request.requestId })}
                className="flex w-full items-center gap-3 rounded-lg border border-border p-3 text-left transition-colors hover:border-primary/40"
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold">{requestCode(request.requestId)} · {request.customerName}</span>
                  <span className="mt-1 block text-xs text-muted-foreground">
                    {request.origin?.name || "Chưa xác định"} → {request.destination?.name || "Chưa xác định"}
                    {request.scheduledDepartureDate ? ` · ${formatDateTime(request.scheduledDepartureDate)}` : ""}
                  </span>
                </span>
                <StatusBadge status={transportRequestStatusLabel(request.status)} />
              </button>
            ))}
            {data.approvedRequests.length > 0 && (
              <p className="rounded-md bg-muted/60 p-3 text-xs text-muted-foreground">
                Tạo kế hoạch vận chuyển thuộc quyền Fleet Coordinator; chuyên viên có thể mở kế hoạch hiện hữu để bổ sung điểm dừng.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2 text-base"><HeartPulse className="h-4 w-4" /> Hồ sơ kiểm định gần đây</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {data.inspections.length === 0 ? (
            <EmptyState title="Chưa có bản ghi kiểm định" />
          ) : data.inspections.slice(0, 6).map((inspection) => (
            <button
              key={inspection.inspectionId}
              onClick={() => navigate("inspection-detail", { id: inspection.inspectionId })}
              className="flex w-full items-center gap-3 rounded-lg border border-border p-3 text-left transition-colors hover:border-primary/40"
            >
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold">{inspectionCode(inspection.inspectionId)} · {inspection.horseName} · {inspection.agencyName}</span>
                <span className="mt-1 block text-xs text-muted-foreground">
                  Yêu cầu {requestCode(inspection.requestId)} · {formatDateTime(inspection.updatedAt)}
                </span>
              </span>
              <StatusBadge status={inspectionStatusLabel(inspection.status)} />
            </button>
          ))}
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
