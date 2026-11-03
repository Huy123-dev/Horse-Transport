"use client";

import { useEffect, useState, useCallback } from "react";
import { apiGet, apiPost, apiPut } from "@/lib/api-client";
import { useAppStore } from "@/store/app-store";
import { useToast } from "@/hooks/use-toast";
import { PageHeader } from "@/components/app/page-header";
import { StatusBadge } from "@/components/app/status-badge";
import { LoadingState, ErrorState, EmptyState } from "@/components/app/empty-state";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft, Route, MapPin, Plus, Trash2, CheckCircle2, AlertTriangle, Truck, Users,
  PackageCheck, UserCheck, ShieldCheck, Clock, Flag, Navigation,
} from "lucide-react";
import { formatDateTime, planCode, STOP_TYPES, transportPlanStatusLabel } from "@/lib/constants";

export function PlanDetail() {
  const { params, navigate, user } = useAppStore();
  const { toast } = useToast();
  const [plan, setPlan] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("route");
  const [actionLoading, setActionLoading] = useState(false);


  const [locations, setLocations] = useState<any[]>([]);
  const [assets, setAssets] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [readiness, setReadiness] = useState<any>(null);


  const [stopForm, setStopForm] = useState({ locationId: "", stopName: "", stopType: "TRANSIT", plannedArrivalTime: "", plannedDepartureTime: "" });


  const [assignments, setAssignments] = useState<any[]>([]);

  const load = useCallback(async () => {
    try {
      const d = await apiGet(`/trips/${params.id}`);
      setPlan(d.trip);

      if (d.trip.assignments?.length) {
        setAssignments(d.trip.assignments.map((a: any) => ({ assetId: a.assetId || "", driverUserId: a.driverUserId || "", attendantUserId: a.attendantUserId || "", role: a.role })));
      }
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }, [params.id]);

  useEffect(() => {
    const timer = window.setTimeout(() => { void load(); }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  useEffect(() => {
    (async () => {
      try {
        const [l, a, u] = await Promise.all([apiGet("/locations"), apiGet("/assets"), apiGet("/users").catch(() => ({ users: [] }))]);
        setLocations(l.locations);
        setAssets(a.assets);
        setUsers(u.users);
      } catch (error) {
        toast({
          title: "Không thể tải dữ liệu lập kế hoạch",
          description: error instanceof Error ? error.message : "Vui lòng thử lại.",
          variant: "destructive",
        });
      }
    })();
  }, []);

  const loadReadiness = useCallback(async () => {
    try {
      setReadiness(await apiGet(`/trips/${params.id}/readiness`));
    } catch (error) {
      toast({
        title: "Không thể tải trạng thái sẵn sàng",
        description: error instanceof Error ? error.message : "Vui lòng thử lại.",
        variant: "destructive",
      });
    }
  }, [params.id]);

  useEffect(() => {
    if (activeTab !== "readiness") return;
    const timer = window.setTimeout(() => { void loadReadiness(); }, 0);
    return () => window.clearTimeout(timer);
  }, [activeTab, loadReadiness]);

  const handleAddStop = async () => {
    if (!stopForm.stopName || !stopForm.stopType) { toast({ title: "Thiếu thông tin", variant: "destructive" }); return; }
    setActionLoading(true);
    try {
      const seq = (plan.stops?.length || 0) + 1;
      await apiPost(`/trips/${params.id}/stops`, { ...stopForm, sequenceNo: seq, plannedArrivalTime: stopForm.plannedArrivalTime || null, plannedDepartureTime: stopForm.plannedDepartureTime || null });
      toast({ title: "Đã thêm chặng" });
      setStopForm({ locationId: "", stopName: "", stopType: "TRANSIT", plannedArrivalTime: "", plannedDepartureTime: "" });
      load();
    } catch (e: any) { toast({ title: "Lỗi", description: e.message, variant: "destructive" }); }
    finally { setActionLoading(false); }
  };

  const handleSaveAssignments = async () => {
    setActionLoading(true);
    try {
      await apiPut(`/trips/${params.id}/assignments`, { assignments: assignments.filter((a) => a.assetId || a.driverUserId || a.attendantUserId) });
      toast({ title: "Đã phân bổ phương tiện & nhân sự" });
      load();
    } catch (e: any) { toast({ title: "Lỗi", description: e.message, variant: "destructive" }); }
    finally { setActionLoading(false); }
  };

  const handleConfirmReady = async () => {
    setActionLoading(true);
    try {
      await apiPost(`/trips/${params.id}/readiness`);
      toast({ title: "Đã xác nhận sẵn sàng khởi hành" });
      load();
    } catch (e: any) { toast({ title: "Lỗi", description: e.message, variant: "destructive" }); }
    finally { setActionLoading(false); }
  };

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} />;
  if (!plan) return <ErrorState message="Không tìm thấy kế hoạch" />;

  const isCoordinator = user?.roleId === "FLEET_COORDINATOR";
  const canPlan = isCoordinator && plan.status === "Đang lập kế hoạch";

  return (
    <div className="space-y-6">
      <PageHeader title={plan.request?.competitionName || `Kế hoạch ${planCode(plan.planId)}`} description={`${plan.request?.origin?.name} → ${plan.request?.destination?.name}`} icon={<Route className="h-5 w-5" />}
        actions={<div className="flex items-center gap-2"><StatusBadge status={transportPlanStatusLabel(plan.status)} /><Button variant="outline" size="sm" onClick={() => navigate("plans")} className="gap-2"><ArrowLeft className="h-4 w-4" /> Quay lại</Button></div>}
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground flex items-center gap-1"><Navigation className="h-3 w-3" /> Khởi hành</p><p className="mt-1 text-sm font-semibold">{formatDateTime(plan.departureTime)}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground flex items-center gap-1"><Flag className="h-3 w-3" /> Đến nơi</p><p className="mt-1 text-sm font-semibold">{formatDateTime(plan.arrivalTime)}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground flex items-center gap-1"><Clock className="h-3 w-3" /> Điều phối viên</p><p className="mt-1 text-sm font-semibold">{plan.coordinator?.name || "—"}</p></CardContent></Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex w-full flex-wrap justify-start gap-1 h-auto p-1">
          <TabsTrigger value="route" className="gap-1.5"><Route className="h-4 w-4" /> Lộ trình</TabsTrigger>
          <TabsTrigger value="assignment" className="gap-1.5"><PackageCheck className="h-4 w-4" /> Phân bổ</TabsTrigger>
          <TabsTrigger value="readiness" className="gap-1.5"><ShieldCheck className="h-4 w-4" /> Sẵn sàng</TabsTrigger>
        </TabsList>

        {/* Route Tab */}
        <TabsContent value="route" className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Các chặng lộ trình</CardTitle></CardHeader>
            <CardContent>
              {plan.stops?.length === 0 ? (
                <EmptyState icon={<MapPin className="h-6 w-6" />} title="Chưa có chặng nào" description="Thêm các điểm dừng trên lộ trình vận chuyển." className="py-8" />
              ) : (
                <div className="relative space-y-3 before:absolute before:left-[19px] before:top-2 before:h-[calc(100%-1rem)] before:w-0.5 before:bg-border">
                  {plan.stops.map((stop: any, idx: number) => (
                    <div key={stop.stopId} className="relative flex items-start gap-4">
                      <div className={`z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xs font-bold ring-4 ring-background ${stop.status === "Đã đến" ? "bg-[var(--success)] text-white" : stop.status === "Đã khởi hành" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>{stop.sequenceNo}</div>
                      <div className="flex-1 rounded-lg border border-border p-3">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-semibold">{stop.stopName}</p>
                          <Badge variant="outline" className="bg-primary/5">{STOP_TYPES[stop.stopType] || stop.stopType}</Badge>
                        </div>
                        <div className="mt-1 flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-muted-foreground">
                          {stop.plannedArrivalTime && <span>Đến: {formatDateTime(stop.plannedArrivalTime)}</span>}
                          {stop.plannedDepartureTime && <span>Đi: {formatDateTime(stop.plannedDepartureTime)}</span>}
                        </div>
                        {stop.status !== "Chưa đến" && <div className="mt-1"><StatusBadge status={stop.status} /></div>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {canPlan && (
            <Card>
              <CardHeader><CardTitle className="text-base flex items-center gap-2"><Plus className="h-4 w-4" /> Thêm chặng</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-2"><Label>Địa điểm</Label><select value={stopForm.locationId} onChange={(e) => setStopForm({ ...stopForm, locationId: e.target.value, stopName: locations.find((l) => l.locationId === e.target.value)?.name || stopForm.stopName })} className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"><option value="">— Tùy chọn —</option>{locations.map((l) => <option key={l.locationId} value={l.locationId}>{l.name}</option>)}</select></div>
                  <div className="space-y-2"><Label>Loại chặng</Label><select value={stopForm.stopType} onChange={(e) => setStopForm({ ...stopForm, stopType: e.target.value })} className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm">{Object.entries(STOP_TYPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></div>
                </div>
                <div className="space-y-2"><Label>Tên chặng</Label><Input value={stopForm.stopName} onChange={(e) => setStopForm({ ...stopForm, stopName: e.target.value })} placeholder="VD: Trạm kiểm dịch Tokyo" /></div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-2"><Label>Dự kiến đến</Label><Input type="datetime-local" value={stopForm.plannedArrivalTime} onChange={(e) => setStopForm({ ...stopForm, plannedArrivalTime: e.target.value })} /></div>
                  <div className="space-y-2"><Label>Dự kiến đi</Label><Input type="datetime-local" value={stopForm.plannedDepartureTime} onChange={(e) => setStopForm({ ...stopForm, plannedDepartureTime: e.target.value })} /></div>
                </div>
                <Button onClick={handleAddStop} disabled={actionLoading} className="gap-2"><Plus className="h-4 w-4" /> Thêm chặng</Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Assignment Tab */}
        <TabsContent value="assignment" className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-base flex items-center gap-2"><PackageCheck className="h-4 w-4" /> Phân bổ phương tiện & nhân sự</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {assignments.map((a, idx) => (
                <div key={idx} className="rounded-lg border border-border p-3 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Phân bổ #{idx + 1}</span>
                    {canPlan && <Button size="sm" variant="ghost" onClick={() => setAssignments(assignments.filter((_, i) => i !== idx))} className="h-7 text-[var(--danger-fg)]"><Trash2 className="h-3.5 w-3.5" /></Button>}
                  </div>
                  <div className="grid gap-3 sm:grid-cols-3">
                    <div className="space-y-1.5"><Label className="text-xs flex items-center gap-1"><Truck className="h-3 w-3" /> Phương tiện</Label><select value={a.assetId} onChange={(e) => setAssignments(assignments.map((x, i) => i === idx ? { ...x, assetId: e.target.value } : x))} disabled={!canPlan} className="flex h-9 w-full rounded-md border border-input bg-background px-2 text-sm"><option value="">— Chọn —</option>{assets.map((as) => <option key={as.assetId} value={as.assetId}>{as.name}</option>)}</select></div>
                    <div className="space-y-1.5"><Label className="text-xs flex items-center gap-1"><UserCheck className="h-3 w-3" /> Tài xế</Label><select value={a.driverUserId} onChange={(e) => setAssignments(assignments.map((x, i) => i === idx ? { ...x, driverUserId: e.target.value } : x))} disabled={!canPlan} className="flex h-9 w-full rounded-md border border-input bg-background px-2 text-sm"><option value="">— Chọn —</option>{users.filter((u) => u.roleId === "DRIVER" || u.roleId === "DRIVER_ESCORT").map((u) => <option key={u.userId} value={u.userId}>{u.name}</option>)}</select></div>
                    <div className="space-y-1.5"><Label className="text-xs flex items-center gap-1"><Users className="h-3 w-3" /> Nhân viên đi kèm</Label><select value={a.attendantUserId} onChange={(e) => setAssignments(assignments.map((x, i) => i === idx ? { ...x, attendantUserId: e.target.value } : x))} disabled={!canPlan} className="flex h-9 w-full rounded-md border border-input bg-background px-2 text-sm"><option value="">— Chọn —</option>{users.filter((u) => u.roleId === "ESCORT" || u.roleId === "DRIVER_ESCORT").map((u) => <option key={u.userId} value={u.userId}>{u.name}</option>)}</select></div>
                  </div>
                </div>
              ))}
              {canPlan && (
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => setAssignments([...assignments, { assetId: "", driverUserId: "", attendantUserId: "", role: "DRIVER" }])} className="gap-1"><Plus className="h-3.5 w-3.5" /> Thêm phân bổ</Button>
                  <Button onClick={handleSaveAssignments} disabled={actionLoading} className="gap-2"><CheckCircle2 className="h-4 w-4" /> Lưu phân bổ</Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Readiness Tab */}
        <TabsContent value="readiness" className="space-y-4">
          {!readiness ? <LoadingState /> : (
            <Card>
              <CardHeader><CardTitle className="text-base flex items-center gap-2"><ShieldCheck className="h-4 w-4" /> Kiểm tra sẵn sàng khởi hành</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {readiness.checks.map((c: any) => (
                  <div key={c.key} className="flex items-center gap-3 rounded-lg border border-border p-3">
                    <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${c.passed ? "bg-[var(--success-bg)] text-[var(--success-fg)]" : "bg-[var(--warning-bg)] text-[var(--warning-fg)]"}`}>{c.passed ? <CheckCircle2 className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}</div>
                    <div className="flex-1"><p className="text-sm font-medium">{c.label}</p><p className="text-xs text-muted-foreground">{c.detail}</p></div>
                    <StatusBadge status={c.passed ? "Đạt" : "Chưa đạt"} />
                  </div>
                ))}
                <div className={`rounded-lg p-4 text-center ${readiness.ready ? "bg-[var(--success-bg)] text-[var(--success-fg)]" : "bg-[var(--warning-bg)] text-[var(--warning-fg)]"}`}>
                  <p className="font-semibold">{readiness.ready ? "✓ Sẵn sàng khởi hành" : "Chưa đủ điều kiện khởi hành"}</p>
                </div>
                {canPlan && readiness.ready && <Button onClick={handleConfirmReady} disabled={actionLoading} className="w-full gap-2"><CheckCircle2 className="h-4 w-4" /> Xác nhận sẵn sàng khởi hành</Button>}
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
