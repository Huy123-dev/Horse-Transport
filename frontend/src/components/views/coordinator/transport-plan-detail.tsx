"use client";

import { useCallback, useEffect, useState } from "react";
import { ApiError, apiDelete, apiGet, apiPost } from "@/lib/api-client";
import { useAppStore } from "@/store/app-store";
import { PageHeader } from "@/components/app/page-header";
import { StatusBadge } from "@/components/app/status-badge";
import { ErrorState, LoadingState, EmptyState } from "@/components/app/empty-state";
import { BackendUnavailableView } from "@/components/views/shared/backend-unavailable-view";
import { JourneyTimeline } from "@/components/views/shared/journey-timeline";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, ClipboardCheck, HeartPulse, MapPin, PackageCheck, Plus, Route, ShieldAlert, Trash2 } from "lucide-react";
import { assetStatusLabel, formatDateTime, formatRouteDetails, incidentStatusLabel, planCode, requestCode, STOP_TYPES, transportPlanStatusLabel } from "@/lib/constants";
import { useToast } from "@/hooks/use-toast";

interface TransportPlan {
  planId: string;
  requestId: string;
  routeDetails: string | null;
  departureTime: string;
  arrivalTime: string;
  status: string;
  coordinatorName: string | null;
}

interface RouteStop {
  stopId: string;
  sequenceNo: number;
  locationName: string | null;
  stopName: string | null;
  stopType: string;
  plannedArrivalTime: string | null;
  plannedDepartureTime: string | null;
  actualArrivalTime: string | null;
  actualDepartureTime: string | null;
  notes: string | null;
}

interface TrackingRecord {
  logId: string;
  milestone: string | null;
  latitude: number;
  longitude: number;
  reportedAt: string;
  reportedByName: string | null;
}

interface HealthRecord {
  logId: string;
  horseId: string;
  horseName: string;
  stressLevel: number | null;
  heartRate: number | null;
  temperature: number | null;
  appetiteStatus: string | null;
  notes: string | null;
  loggedAt: string;
  loggedByName: string | null;
}

interface IncidentRecord {
  incidentId: string;
  category: string;
  description: string;
  sos: boolean;
  status: string;
  additionalCost: number | null;
  costApproved: boolean;
  costApprovedByName: string | null;
  reportedAt: string;
}

interface DeliveryRecord {
  deliveryId: string;
  recipientName: string;
  deliveredAt: string;
  podDocumentUrl: string | null;
}

interface AssignmentRecord {
  assignmentId: string;
  assetId: string | null;
  assetName: string | null;
  assetType: string | null;
  driverUserId: string | null;
  driverName: string | null;
  attendantUserId: string | null;
  attendantName: string | null;
  assignedAt: string;
}

interface AssignmentOption {
  id: string;
  label: string;
  status: string | null;
}

interface AssignmentOptions {
  assets: AssignmentOption[];
  crew: AssignmentOption[];
  drivers: AssignmentOption[];
  attendants: AssignmentOption[];
}

export function TransportPlanDetail() {
  const { params, navigate, user } = useAppStore();
  const { toast } = useToast();
  const [plan, setPlan] = useState<TransportPlan | null>(null);
  const [stops, setStops] = useState<RouteStop[] | null>(null);
  const [tracking, setTracking] = useState<TrackingRecord[] | null>(null);
  const [health, setHealth] = useState<HealthRecord[] | null>(null);
  const [incidents, setIncidents] = useState<IncidentRecord[] | null>(null);
  const [delivery, setDelivery] = useState<DeliveryRecord | null>(null);
  const [assignments, setAssignments] = useState<AssignmentRecord[] | null>(null);
  const [assignmentOptions, setAssignmentOptions] = useState<AssignmentOptions | null>(null);
  const [assignmentForm, setAssignmentForm] = useState({ assetId: "", driverUserId: "", attendantUserId: "" });
  const [assignmentSaving, setAssignmentSaving] = useState(false);
  const [routeStopForm, setRouteStopForm] = useState({
    sequenceNo: "",
    stopName: "",
    stopType: "REST",
    plannedArrivalTime: "",
    plannedDepartureTime: "",
    notes: "",
  });
  const [routeStopSaving, setRouteStopSaving] = useState(false);
  const [panelErrors, setPanelErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const canViewDriverResource = !["DRIVER", "ESCORT", "DRIVER_ESCORT"].includes(user?.roleId ?? "");
  const canManageAssignments = user?.roleId === "FLEET_COORDINATOR";
  const canManageStops = ["FLEET_COORDINATOR", "TRANSPORT_SPECIALIST"].includes(user?.roleId ?? "");
  const canViewAssignments = ["LOGISTICS_MANAGER", "TRANSPORT_SPECIALIST", "FLEET_COORDINATOR"].includes(user?.roleId ?? "");
  const assignedAttendantIds = new Set((assignments ?? [])
    .map((assignment) => assignment.attendantUserId)
    .filter((attendantId): attendantId is string => attendantId !== null));

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    setPlan(null);
    setStops(null);
    setTracking(null);
    setHealth(null);
    setIncidents(null);
    setDelivery(null);
    setAssignments(null);
    setAssignmentOptions(null);
    setPanelErrors({});
    try {
      const planData = await apiGet<TransportPlan>(`/transport-plans/${params.id}`);
      setPlan(planData);
      const loadPanel = async <T,>(
        name: string,
        path: string,
        setValue: (value: T) => void
      ) => {
        try {
          setValue(await apiGet<T>(path));
        } catch (panelError: unknown) {
          setPanelErrors((current) => ({
            ...current,
            [name]: panelError instanceof Error ? panelError.message : "Không thể tải dữ liệu.",
          }));
        }
      };
      await Promise.all([
        loadPanel("stops", `/transport-plans/${params.id}/stops`, setStops),
        loadPanel("tracking", `/transport-plans/${params.id}/tracking`, setTracking),
        loadPanel("health", `/transport-plans/${params.id}/health-logs`, setHealth),
        loadPanel("incidents", `/transport-plans/${params.id}/incidents`, setIncidents),
        ...(canViewAssignments
          ? [loadPanel("assignments", `/transport-plans/${params.id}/assignments`, setAssignments)]
          : []),
        ...(canManageAssignments
          ? [loadPanel("assignmentOptions", `/transport-plans/${params.id}/assignment-options`, setAssignmentOptions)]
          : []),
        (async () => {
          try {
            setDelivery(await apiGet<DeliveryRecord>(`/transport-plans/${params.id}/delivery`));
          } catch (deliveryError: unknown) {
            if (deliveryError instanceof ApiError && deliveryError.status === 404) {
              setDelivery(null);
            } else {
              setPanelErrors((current) => ({
                ...current,
                delivery: deliveryError instanceof Error ? deliveryError.message : "Không thể tải biên bản bàn giao.",
              }));
            }
          }
        })(),
      ]);
    } catch (loadError: unknown) {
      setError(loadError instanceof Error ? loadError.message : "Không thể tải kế hoạch vận chuyển.");
    } finally {
      setLoading(false);
    }
  }, [canManageAssignments, canViewAssignments, params.id]);

  useEffect(() => { void Promise.resolve().then(load); }, [load]);

  async function handleCreateRouteStop(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setRouteStopSaving(true);
    try {
      await apiPost(`/transport-plans/${params.id}/stops`, {
        sequenceNo: routeStopForm.sequenceNo ? Number(routeStopForm.sequenceNo) : null,
        stopName: routeStopForm.stopName.trim(),
        stopType: routeStopForm.stopType,
        plannedArrivalTime: routeStopForm.plannedArrivalTime || null,
        plannedDepartureTime: routeStopForm.plannedDepartureTime || null,
        notes: routeStopForm.notes.trim() || null,
      });
      setRouteStopForm({
        sequenceNo: "",
        stopName: "",
        stopType: "REST",
        plannedArrivalTime: "",
        plannedDepartureTime: "",
        notes: "",
      });
      toast({ title: "Đã thêm điểm dừng vào kế hoạch" });
      await load();
    } catch (routeStopError: unknown) {
      toast({
        title: "Không thể thêm điểm dừng",
        description: routeStopError instanceof Error ? routeStopError.message : "Không thể lưu điểm dừng.",
        variant: "destructive",
      });
    } finally {
      setRouteStopSaving(false);
    }
  }

  async function handleCreateAssignment(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const { assetId, driverUserId, attendantUserId } = assignmentForm;
    if (!assetId && !driverUserId && !attendantUserId) {
      toast({ title: "Thiếu phân công", description: "Chọn ít nhất một phương tiện hoặc nhân sự.", variant: "destructive" });
      return;
    }

    setAssignmentSaving(true);
    try {
      await apiPost(`/transport-plans/${params.id}/assignments`, {
        assetId: assetId || null,
        driverUserId: driverUserId || null,
        attendantUserId: attendantUserId || null,
      });
      setAssignmentForm({ assetId: "", driverUserId: "", attendantUserId: "" });
      toast({ title: "Đã phân công", description: "Phân công đã được lưu và thông báo cho nhân sự được chọn." });
      await load();
    } catch (assignmentError: unknown) {
      toast({
        title: "Không thể phân công",
        description: assignmentError instanceof Error ? assignmentError.message : "Không thể lưu phân công.",
        variant: "destructive",
      });
    } finally {
      setAssignmentSaving(false);
    }
  }

  async function handleDeleteAssignment(assignmentId: string) {
    if (!window.confirm("Bạn có chắc muốn hủy phân công này?")) return;
    try {
      await apiDelete(`/transport-assignments/${assignmentId}`);
      toast({ title: "Đã hủy phân công" });
      await load();
    } catch (assignmentError: unknown) {
      toast({
        title: "Không thể hủy phân công",
        description: assignmentError instanceof Error ? assignmentError.message : "Không thể hủy phân công.",
        variant: "destructive",
      });
    }
  }

  if (!canViewDriverResource) {
    return <BackendUnavailableView
      title="Chi tiết chuyến được giao"
      endpoint="/api/transport-plans/{id}"
      description="Backend chưa giới hạn GET kế hoạch, tracking và sức khỏe theo phân công tài xế. Trang này bị chặn cho Driver/Escort để tránh lộ dữ liệu chuyến của người khác."
    />;
  }
  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} onRetry={() => void load()} />;
  if (!plan) return <ErrorState message="Không tìm thấy kế hoạch vận chuyển." />;

  const backTo = params.requestId
    ? () => navigate("request-detail", { id: params.requestId })
    : () => navigate("plans");

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Kế hoạch ${planCode(plan.planId)}`}
        description={formatRouteDetails(plan.routeDetails) || `Yêu cầu ${requestCode(plan.requestId)}`}
        icon={<Route className="h-5 w-5" />}
        actions={
          <div className="flex items-center gap-2">
            <StatusBadge status={transportPlanStatusLabel(plan.status)} />
            <Button variant="outline" size="sm" onClick={backTo} className="gap-2">
              <ArrowLeft className="h-4 w-4" /> Quay lại
            </Button>
          </div>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Mã kế hoạch</p><p className="mt-1 break-all text-sm font-semibold">{plan.planId}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Yêu cầu gốc</p><Button variant="link" className="h-auto p-0 text-sm" onClick={() => navigate("request-detail", { id: plan.requestId, returnPlanId: plan.planId })}>{requestCode(plan.requestId)}</Button></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Khởi hành</p><p className="mt-1 text-sm font-medium">{formatDateTime(plan.departureTime)}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Dự kiến đến</p><p className="mt-1 text-sm font-medium">{formatDateTime(plan.arrivalTime)}</p><p className="mt-1 text-xs text-muted-foreground">Điều phối: {plan.coordinatorName || "Chưa phân công"}</p></CardContent></Card>
      </div>

      {["CUSTOMER", "LOGISTICS_MANAGER"].includes(user?.roleId ?? "") && (
        <JourneyTimeline planId={plan.planId} />
      )}

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2 text-base"><MapPin className="h-4 w-4" /> Điểm dừng</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {panelErrors.stops && <p role="alert" className="text-sm text-destructive">{panelErrors.stops}</p>}
          {stops?.length === 0 && <EmptyState icon={<MapPin className="h-5 w-5" />} title="Chưa có điểm dừng" />}
          {stops?.map((stop) => (
            <div key={stop.stopId} className="rounded-lg border border-border p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-medium">{stop.sequenceNo}. {stop.locationName || stop.stopName || "Điểm dừng"}</p>
                <StatusBadge status={STOP_TYPES[stop.stopType] || stop.stopType} />
              </div>
              <p className="mt-1 text-xs text-muted-foreground">Dự kiến: {stop.plannedArrivalTime ? formatDateTime(stop.plannedArrivalTime) : "—"} – {stop.plannedDepartureTime ? formatDateTime(stop.plannedDepartureTime) : "—"}</p>
              {(stop.actualArrivalTime || stop.actualDepartureTime) && <p className="mt-1 text-xs">Thực tế được ghi nhận: {stop.actualArrivalTime ? formatDateTime(stop.actualArrivalTime) : "chưa đến"} – {stop.actualDepartureTime ? formatDateTime(stop.actualDepartureTime) : "chưa rời"}</p>}
              {stop.notes && <p className="mt-1 text-sm text-muted-foreground">{stop.notes}</p>}
            </div>
          ))}
          {canManageStops && plan && ["planning", "dang lap ke hoach", "ready", "san sang"].includes(plan.status.trim().toLowerCase()) && (
            <form onSubmit={handleCreateRouteStop} className="grid gap-3 border-t border-border pt-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label htmlFor="route-stop-name" className="text-sm font-medium">Tên điểm dừng</label>
                <Input id="route-stop-name" required maxLength={150} value={routeStopForm.stopName}
                  onChange={(event) => setRouteStopForm((form) => ({ ...form, stopName: event.target.value }))} />
              </div>
              <div className="space-y-2">
                <label htmlFor="route-stop-type" className="text-sm font-medium">Loại điểm dừng</label>
                <select id="route-stop-type" value={routeStopForm.stopType}
                  onChange={(event) => setRouteStopForm((form) => ({ ...form, stopType: event.target.value }))}
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm">
                  <option value="TRANSIT">Trung chuyển</option>
                  <option value="CUSTOMS">Hải quan</option>
                  <option value="QUARANTINE">Kiểm dịch</option>
                  <option value="REST">Nghỉ</option>
                  <option value="REFUEL">Tiếp nhiên liệu</option>
                </select>
              </div>
              <div className="space-y-2">
                <label htmlFor="route-stop-sequence" className="text-sm font-medium">Thứ tự (để trống để thêm cuối tuyến)</label>
                <Input id="route-stop-sequence" type="number" min={1} step={1} value={routeStopForm.sequenceNo}
                  onChange={(event) => setRouteStopForm((form) => ({ ...form, sequenceNo: event.target.value }))} />
              </div>
              <div className="space-y-2">
                <label htmlFor="route-stop-arrival" className="text-sm font-medium">Giờ đến dự kiến</label>
                <Input id="route-stop-arrival" type="datetime-local" value={routeStopForm.plannedArrivalTime}
                  onChange={(event) => setRouteStopForm((form) => ({ ...form, plannedArrivalTime: event.target.value }))} />
              </div>
              <div className="space-y-2">
                <label htmlFor="route-stop-departure" className="text-sm font-medium">Giờ rời dự kiến</label>
                <Input id="route-stop-departure" type="datetime-local" value={routeStopForm.plannedDepartureTime}
                  onChange={(event) => setRouteStopForm((form) => ({ ...form, plannedDepartureTime: event.target.value }))} />
              </div>
              <div className="space-y-2">
                <label htmlFor="route-stop-notes" className="text-sm font-medium">Ghi chú</label>
                <Input id="route-stop-notes" value={routeStopForm.notes}
                  onChange={(event) => setRouteStopForm((form) => ({ ...form, notes: event.target.value }))} />
              </div>
              <Button type="submit" disabled={routeStopSaving} className="gap-2 sm:col-span-2 sm:justify-self-start">
                <Plus className="h-4 w-4" /> {routeStopSaving ? "Đang lưu..." : "Thêm điểm dừng"}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2 text-base"><PackageCheck className="h-4 w-4" /> Phương tiện và nhân sự</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {panelErrors.assignments && <p role="alert" className="text-sm text-destructive">{panelErrors.assignments}</p>}
          {assignments?.length === 0 && <EmptyState title="Chưa có phân công" description="Chưa ghi nhận phương tiện hoặc nhân sự cho kế hoạch này." />}
          {assignments?.map((assignment) => (
            <div key={assignment.assignmentId} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border p-3">
              <div className="min-w-0">
                <p className="text-sm font-medium">{assignment.assetName || "Chưa có phương tiện"}{assignment.assetType ? ` · ${assignment.assetType}` : ""}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Tài xế: {assignment.driverName || "—"} · Người đi kèm: {assignment.attendantName || "—"}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">Phân công lúc {formatDateTime(assignment.assignedAt)}</p>
              </div>
              {canManageAssignments && (
                <Button variant="outline" size="sm" onClick={() => void handleDeleteAssignment(assignment.assignmentId)} className="gap-2">
                  <Trash2 className="h-4 w-4" /> Hủy
                </Button>
              )}
            </div>
          ))}
          {canManageAssignments && (
            <form onSubmit={handleCreateAssignment} className="grid gap-3 border-t pt-4 sm:grid-cols-2">
              {panelErrors.assignmentOptions && <p role="alert" className="text-sm text-destructive sm:col-span-2">{panelErrors.assignmentOptions}</p>}
              <Select value={assignmentForm.assetId || "none"} onValueChange={(value) => setAssignmentForm((current) => ({ ...current, assetId: value === "none" ? "" : value }))}>
                <SelectTrigger className="w-full"><SelectValue placeholder="Chọn phương tiện (không bắt buộc)" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Không phân công phương tiện</SelectItem>
                  {assignmentOptions?.assets.map((asset) => (
                    <SelectItem key={asset.id} value={asset.id} disabled={assetStatusLabel(asset.status ?? "") === "Bảo trì"}>
                      {asset.label}{asset.status ? ` · ${assetStatusLabel(asset.status)}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={assignmentForm.driverUserId || "none"} onValueChange={(value) => setAssignmentForm((current) => ({ ...current, driverUserId: value === "none" ? "" : value }))}>
                <SelectTrigger className="w-full"><SelectValue placeholder="Chọn tài xế (không bắt buộc)" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Không phân công tài xế</SelectItem>
                  {assignmentOptions?.drivers.map((person) => <SelectItem key={person.id} value={person.id}>{person.label}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={assignmentForm.attendantUserId || "none"} onValueChange={(value) => setAssignmentForm((current) => ({ ...current, attendantUserId: value === "none" ? "" : value }))}>
                <SelectTrigger className="w-full"><SelectValue placeholder={`Chọn người đi kèm (${assignedAttendantIds.size}/4)`} /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Không phân công người đi kèm</SelectItem>
                  {assignmentOptions?.attendants.map((person) => (
                    <SelectItem
                      key={person.id}
                      value={person.id}
                      disabled={(assignedAttendantIds.size >= 4 && !assignedAttendantIds.has(person.id)) || assignedAttendantIds.has(person.id)}
                    >
                      {person.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button type="submit" disabled={assignmentSaving || !assignmentOptions} className="gap-2">
                <Plus className="h-4 w-4" /> {assignmentSaving ? "Đang lưu..." : "Thêm phân công"}
              </Button>
              <p className="text-xs text-muted-foreground sm:col-span-2">
                Nhân sự không thể được phân công vào hai chuyến trùng lịch; mỗi kế hoạch tối đa 4 người đi kèm.
              </p>
            </form>
          )}
          {!canManageAssignments && !canViewAssignments && (
            <p className="text-sm text-muted-foreground">Bạn không có quyền xem thông tin phân công.</p>
          )}
          <p className="text-xs text-muted-foreground">Trạng thái sẵn sàng phụ thuộc vào điều kiện nghiệp vụ và xác nhận kiểm định; việc phân công nhân sự là một điều kiện cần.</p>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2 text-base"><MapPin className="h-4 w-4" /> Các mốc hành trình</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {panelErrors.tracking && <p role="alert" className="text-sm text-destructive">{panelErrors.tracking}</p>}
            {tracking?.length === 0 && <EmptyState title="Chưa có mốc hành trình" />}
            {tracking?.map((record) => (
              <div key={record.logId} className="rounded-lg border p-3">
                <p className="text-sm font-medium">{record.milestone || "Cập nhật vị trí"}</p>
                <p className="mt-1 text-xs text-muted-foreground">{formatDateTime(record.reportedAt)} · {record.reportedByName || "Người báo cáo không rõ"}</p>
                <p className="mt-1 text-xs">Tọa độ do người dùng gửi: {record.latitude}, {record.longitude}</p>
              </div>
            ))}
            <p className="text-xs text-muted-foreground">Đây là các mốc do người dùng cập nhật, không phải theo dõi GPS trực tiếp.</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2 text-base"><HeartPulse className="h-4 w-4" /> Nhật ký sức khỏe</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {panelErrors.health && <p role="alert" className="text-sm text-destructive">{panelErrors.health}</p>}
            {health?.length === 0 && <EmptyState title="Chưa có bản ghi sức khỏe" />}
            {health?.map((record) => (
              <div key={record.logId} className="rounded-lg border p-3">
                <div className="flex flex-wrap items-center justify-between gap-2"><p className="text-sm font-medium">{record.horseName}</p><p className="text-xs text-muted-foreground">{formatDateTime(record.loggedAt)}</p></div>
                <p className="mt-1 text-xs">Nhịp tim: {record.heartRate ?? "—"} · Nhiệt độ: {record.temperature ?? "—"} °C · Căng thẳng: {record.stressLevel ?? "—"}</p>
                <p className="mt-1 text-xs">Ăn uống: {record.appetiteStatus || "—"} · Ghi nhận bởi: {record.loggedByName || "—"}</p>
                {record.notes && <p className="mt-1 text-sm text-muted-foreground">{record.notes}</p>}
              </div>
            ))}
            <p className="text-xs text-muted-foreground">Chỉ hiển thị dữ liệu đã nhập; đây không phải chẩn đoán y tế.</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2 text-base"><ShieldAlert className="h-4 w-4" /> Sự cố</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {panelErrors.incidents && <p role="alert" className="text-sm text-destructive">{panelErrors.incidents}</p>}
            {incidents?.length === 0 && <EmptyState title="Chưa có sự cố ghi nhận" />}
            {incidents?.map((incident) => (
              <div key={incident.incidentId} className="rounded-lg border p-3">
                <div className="flex flex-wrap items-center justify-between gap-2"><p className="text-sm font-medium">{incident.category}{incident.sos ? " · SOS" : ""}</p><StatusBadge status={incidentStatusLabel(incident.status)} /></div>
                <p className="mt-1 text-sm">{incident.description}</p>
                <p className="mt-1 text-xs text-muted-foreground">Báo lúc {formatDateTime(incident.reportedAt)}</p>
                {incident.additionalCost != null && <p className="mt-1 text-xs">Chi phí bổ sung: {incident.additionalCost} · {incident.costApproved ? `Đã duyệt bởi ${incident.costApprovedByName || "quản lý"}` : "Chưa được duyệt"}</p>}
                <p className="mt-1 text-xs text-muted-foreground">Sự cố phát sinh được ghi nhận theo lộ trình kế hoạch vận chuyển.</p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2 text-base"><ClipboardCheck className="h-4 w-4" /> Bàn giao</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {panelErrors.delivery && <p role="alert" className="text-sm text-destructive">{panelErrors.delivery}</p>}
            {delivery ? (
              <div className="rounded-lg border p-3">
                <p className="text-sm font-medium">Người nhận: {delivery.recipientName}</p>
                <p className="mt-1 text-xs text-muted-foreground">Bàn giao lúc {formatDateTime(delivery.deliveredAt)}</p>
                <p className="mt-1 break-all text-xs">Chứng từ POD: {delivery.podDocumentUrl || "Không có"}</p>
              </div>
            ) : !panelErrors.delivery ? <EmptyState title="Chưa có biên bản bàn giao" /> : null}
            <p className="text-xs text-muted-foreground">Biên bản bàn giao và chữ ký xác nhận do nhân sự được phân công thực hiện tại điểm đến.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
