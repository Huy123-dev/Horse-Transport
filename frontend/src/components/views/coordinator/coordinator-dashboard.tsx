"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { apiGet } from "@/lib/api-client";
import { getNotifications, type NotificationItem } from "@/lib/notifications";
import { useAppStore } from "@/store/app-store";
import { PageHeader } from "@/components/app/page-header";
import { StatCard } from "@/components/app/stat-card";
import { StatusBadge } from "@/components/app/status-badge";
import { EmptyState, LoadingState, ErrorState } from "@/components/app/empty-state";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Route, Truck, PackageCheck, Bell, MapPin, ChevronRight, Clock, Plus, PieChartIcon, BarChart3 } from "lucide-react";
import { formatDateTime, formatRouteDetails, planCode, requestCode, assetStatusLabel, transportPlanStatusLabel } from "@/lib/constants";
import { StatusPieChart, TripVolumeChart } from "@/components/app/charts";

interface TransportPlan {
  planId: string;
  requestId: string;
  routeDetails: string | null;
  departureTime: string;
  arrivalTime: string;
  status: string;
}

interface TransportRequest {
  requestId: string;
  status: string;
  origin: { name: string } | null;
  destination: { name: string } | null;
}

interface TransportAsset {
  assetId: string;
  status: string;
}

interface DashboardData {
  plans: TransportPlan[];
  requests: TransportRequest[];
  assets: TransportAsset[];
  notifications: NotificationItem[];
}

const EMPTY_ARRAY: never[] = [];

async function fetchDashboardData(): Promise<DashboardData> {
  const [plans, requests, assets, notifications] = await Promise.all([
    apiGet<TransportPlan[]>("/transport-plans"),
    apiGet<TransportRequest[]>("/transport-requests"),
    apiGet<TransportAsset[]>("/transport-assets"),
    getNotifications(true),
  ]);
  return { plans, requests, assets, notifications };
}

export function CoordinatorDashboard() {
  const { navigate } = useAppStore();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setData(await fetchDashboardData());
    } catch (cause: unknown) {
      setData(null);
      setError(cause instanceof Error ? cause.message : "Không thể tải dữ liệu tổng quan điều phối.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    void fetchDashboardData()
      .then((dashboardData) => {
        if (active) setData(dashboardData);
      })
      .catch((cause: unknown) => {
        if (active) setError(cause instanceof Error ? cause.message : "Không thể tải dữ liệu tổng quan điều phối.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, []);

  const chartData = useMemo(() => {
    if (!data) return null;

    const plansByStatus = data.plans.reduce<Record<string, number>>((counts, plan) => {
      const label = transportPlanStatusLabel(plan.status);
      counts[label] = (counts[label] ?? 0) + 1;
      return counts;
    }, {});

    const now = new Date();
    const months: { month: string; trips: number }[] = [];
    for (let offset = 5; offset >= 0; offset -= 1) {
      const date = new Date(now.getFullYear(), now.getMonth() - offset, 1);
      const key = `${date.getFullYear()}-${date.getMonth()}`;
      const month = date.toLocaleDateString("vi-VN", { month: "short", year: "2-digit" });
      const trips = data.plans.filter((plan) => {
        const departure = new Date(plan.departureTime);
        return !Number.isNaN(departure.getTime())
          && `${departure.getFullYear()}-${departure.getMonth()}` === key;
      }).length;
      months.push({ month, trips });
    }

    const assetsByStatus = data.assets.reduce<Record<string, number>>((counts, asset) => {
      const label = assetStatusLabel(asset.status);
      counts[label] = (counts[label] ?? 0) + 1;
      return counts;
    }, {});

    return {
      plansByStatus: Object.entries(plansByStatus).map(([name, value]) => ({ name, value })),
      tripVolume: months,
      assetsByStatus: Object.entries(assetsByStatus).map(([name, value]) => ({ name, value })),
    };
  }, [data]);

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} onRetry={() => void load()} />;
  if (!data) return <ErrorState message="Không có dữ liệu tổng quan." onRetry={() => void load()} />;

  const plans = data.plans;
  const requests = data.requests;
  const assets = data.assets;
  const planRequestIds = new Set(plans.map((plan) => plan.requestId));
  const approvedNoPlan = requests.filter((request) =>
    isApproved(request.status) && !planRequestIds.has(request.requestId)
  ).length;
  const planning = plans.filter((plan) => isStatus(plan.status, "PLANNING", "Đang lập kế hoạch")).length;
  const active = plans.filter((plan) =>
    isStatus(plan.status, "READY", "Sẵn sàng") || isStatus(plan.status, "IN_PROGRESS", "Đang thực hiện")
  ).length;
  const readyAssets = assets.filter((asset) => isStatus(asset.status, "AVAILABLE", "Sẵn sàng sử dụng")).length;
  const recent = [...plans]
    .sort((left, right) => new Date(right.departureTime).getTime() - new Date(left.departureTime).getTime())
    .slice(0, 5);
  const requestsById = new Map(requests.map((request) => [request.requestId, request]));
  const notifications = data.notifications.slice(0, 5);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tổng quan Điều phối"
        description="Lập kế hoạch lộ trình và điều phối phương tiện"
        icon={<Route className="h-5 w-5" />}
        actions={<Button onClick={() => navigate("plan-create")} className="gap-2"><Plus className="h-4 w-4" /> Lập kế hoạch</Button>}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Đơn chờ lập kế hoạch" value={approvedNoPlan} icon={<Route className="h-6 w-6" />} tone="warning" hint="Đã phê duyệt, chưa có kế hoạch" delay={0} />
        <StatCard label="Đang lập kế hoạch" value={planning} icon={<Clock className="h-6 w-6" />} tone="info" delay={0.05} />
        <StatCard label="Chuyến đang chạy" value={active} icon={<Truck className="h-6 w-6" />} tone="success" delay={0.1} />
        <StatCard label="Phương tiện sẵn sàng" value={`${readyAssets}/${assets.length}`} icon={<PackageCheck className="h-6 w-6" />} tone="default" delay={0.15} />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="card-hover lg:col-span-1">
          <CardHeader><CardTitle className="flex items-center gap-2 text-base"><PieChartIcon className="h-4 w-4 text-primary" /> Kế hoạch theo trạng thái</CardTitle></CardHeader>
          <CardContent><StatusPieChart data={chartData?.plansByStatus ?? EMPTY_ARRAY} /></CardContent>
        </Card>
        <Card className="card-hover lg:col-span-2">
          <CardHeader><CardTitle className="flex items-center gap-2 text-base"><BarChart3 className="h-4 w-4 text-primary" /> Khối lượng chuyến 6 tháng</CardTitle></CardHeader>
          <CardContent>
            {plans.length === 0
              ? <EmptyState title="Chưa có dữ liệu chuyến" description="Biểu đồ sẽ cập nhật khi hệ thống có kế hoạch vận chuyển." />
              : <TripVolumeChart data={chartData?.tripVolume ?? EMPTY_ARRAY} />}
          </CardContent>
        </Card>
      </div>

      <Card className="card-hover">
        <CardHeader><CardTitle className="flex items-center gap-2 text-base"><PackageCheck className="h-4 w-4 text-primary" /> Tình trạng phương tiện</CardTitle></CardHeader>
        <CardContent><StatusPieChart data={chartData?.assetsByStatus ?? EMPTY_ARRAY} /></CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Kế hoạch gần đây</CardTitle>
            <Button variant="ghost" size="sm" onClick={() => navigate("plans")} className="gap-1 text-muted-foreground">Xem tất cả <ChevronRight className="h-4 w-4" /></Button>
          </CardHeader>
          <CardContent>
            {recent.length === 0 ? (
              <EmptyState icon={<Route className="h-6 w-6" />} title="Chưa có kế hoạch" description="Các kế hoạch lộ trình sẽ hiển thị tại đây." />
            ) : (
              <div className="space-y-2">
                {recent.map((plan) => {
                  const request = requestsById.get(plan.requestId);
                  const route = request?.origin?.name && request.destination?.name
                    ? `${request.origin.name} → ${request.destination.name}`
                    : formatRouteDetails(plan.routeDetails);
                  return (
                    <button key={plan.planId} onClick={() => navigate("plan-detail", { id: plan.planId })} className="flex w-full items-center gap-4 rounded-lg border border-border bg-card p-3 text-left transition-all hover:border-primary/40 hover:shadow-sm">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"><Route className="h-5 w-5" /></div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold">{route ? `${planCode(plan.planId)} · ${route}` : `Kế hoạch ${planCode(plan.planId)}`}</p>
                        <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />Yêu cầu {requestCode(plan.requestId)}</span>
                          <span>{formatDateTime(plan.departureTime)}</span>
                        </div>
                      </div>
                      <StatusBadge status={transportPlanStatusLabel(plan.status)} />
                    </button>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between"><CardTitle className="text-base">Thông báo chưa đọc</CardTitle><Bell className="h-4 w-4 text-muted-foreground" /></CardHeader>
          <CardContent>
            {notifications.length === 0 ? <p className="py-8 text-center text-sm text-muted-foreground">Không có thông báo chưa đọc</p> : (
              <div className="space-y-3">
                {notifications.map((notification) => (
                  <div key={notification.notificationId} className="rounded-lg border border-border p-3">
                    <p className="text-sm font-medium leading-tight">{notification.title}</p>
                    <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{notification.message || ""}</p>
                    <p className="mt-1 text-[10px] text-muted-foreground">{formatDateTime(notification.createdAt)}</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function isApproved(status: string): boolean {
  return normalizeStatus(status) === "approved" || normalizeStatus(status) === "da phe duyet";
}

function isStatus(status: string, code: string, label: string): boolean {
  const normalized = normalizeStatus(status);
  return normalized === normalizeStatus(code) || normalized === normalizeStatus(label);
}

function normalizeStatus(status: string): string {
  return status.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase().replace(/_/g, " ");
}
