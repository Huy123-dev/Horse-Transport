import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { useAppStore } from "@/store/app-store";
import {
  createDriverDelivery,
  createDriverHealthLog,
  createDriverIncident,
  createDriverTrackingLog,
  getDriverPlan,
  getDriverPlanDelivery,
  getDriverPlanHealthLogs,
  getDriverPlanIncidents,
  getDriverPlanStops,
  getDriverPlanTracking,
  type DriverDelivery,
  type DriverHealthLog,
  type DriverIncident,
  type DriverRouteStop,
  type DriverTrackingLog,
  type DriverTransportPlan,
} from "@/lib/driver-api";
import { uploadFile } from "@/lib/api-client";
import { useToast } from "@/hooks/use-toast";
import { PageHeader } from "@/components/app/page-header";
import { HorseImage } from "@/components/app/horse-image";
import { StatusBadge } from "@/components/app/status-badge";
import { EmptyState, ErrorState, LoadingState } from "@/components/app/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Activity, AlertTriangle, ArrowLeft, Heart, MapPin, Thermometer, Truck } from "lucide-react";
import { formatDateTime, incidentStatusLabel, planCode, transportPlanStatusLabel } from "@/lib/constants";

interface DriverPlanDetails {
  plan: DriverTransportPlan;
  stops: DriverRouteStop[];
  healthLogs: DriverHealthLog[];
  incidents: DriverIncident[];
  tracking: DriverTrackingLog[];
  delivery: DriverDelivery | null;
}

interface LoadState {
  planId: string;
  details?: DriverPlanDetails;
  error?: string;
}

function normalizedPlanStatus(status: string): string {
  return status.trim().toLowerCase().replaceAll("_", " ");
}

export function DriverPlanDetail() {
  const { params, navigate } = useAppStore();
  const { toast } = useToast();
  const planId = params.id;
  const [loadState, setLoadState] = useState<LoadState | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [actionLoading, setActionLoading] = useState(false);
  const [uploadingDeliveryField, setUploadingDeliveryField] = useState<"signature" | "pod" | null>(null);
  const [healthForm, setHealthForm] = useState({
    horseId: "",
    stressLevel: "",
    heartRate: "",
    temperature: "",
    appetiteStatus: "",
    notes: "",
  });
  const [trackingForm, setTrackingForm] = useState({ milestone: "", latitude: "", longitude: "" });
  const [incidentForm, setIncidentForm] = useState({
    category: "",
    description: "",
    sos: false,
    latitude: "",
    longitude: "",
    additionalCost: "",
  });
  const [deliveryForm, setDeliveryForm] = useState({
    recipientName: "",
    signatureImageUrl: "",
    podDocumentUrl: "",
  });

  useEffect(() => {
    let active = true;
    void Promise.all([
      getDriverPlan(planId),
      getDriverPlanStops(planId),
      getDriverPlanHealthLogs(planId),
      getDriverPlanIncidents(planId),
      getDriverPlanTracking(planId),
      getDriverPlanDelivery(planId),
    ])
      .then(([plan, stops, healthLogs, incidents, tracking, delivery]) => {
        if (active) setLoadState({ planId, details: { plan, stops, healthLogs, incidents, tracking, delivery } });
      })
      .catch((cause: unknown) => {
        if (active) {
          setLoadState({
            planId,
            error: cause instanceof Error ? cause.message : "Không thể tải dữ liệu kế hoạch.",
          });
        }
      });
    return () => { active = false; };
  }, [planId, attempt]);

  const currentState = loadState?.planId === planId ? loadState : null;
  if (!currentState) return <LoadingState variant="detail" />;
  if (currentState.error) {
    return <ErrorState message={currentState.error} onRetry={() => setAttempt((value) => value + 1)} />;
  }
  if (!currentState.details) return <LoadingState variant="detail" />;

  const { plan, stops, healthLogs, incidents, tracking, delivery } = currentState.details;
  const planStatus = normalizedPlanStatus(plan.status);
  const canRecordTripData = ["san sang", "ready", "dang thuc hien", "in progress"].includes(planStatus);
  const canRecordDelivery = ["dang thuc hien", "in progress"].includes(planStatus);

  const handleCreateHealthLog = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const stressLevel = healthForm.stressLevel === "" ? null : Number(healthForm.stressLevel);
    const heartRate = healthForm.heartRate === "" ? null : Number(healthForm.heartRate);
    const temperature = healthForm.temperature === "" ? null : Number(healthForm.temperature);
    if (stressLevel === null && heartRate === null && temperature === null
      && !healthForm.appetiteStatus.trim() && !healthForm.notes.trim()) {
      toast({ title: "Nhập ít nhất một chỉ số hoặc ghi chú", variant: "destructive" });
      return;
    }
    setActionLoading(true);
    try {
      await createDriverHealthLog({
        planId,
        horseId: healthForm.horseId,
        stressLevel,
        heartRate,
        temperature,
        appetiteStatus: healthForm.appetiteStatus.trim() || null,
        notes: healthForm.notes.trim() || null,
      });
      toast({ title: "Đã ghi nhật ký sức khỏe" });
      setHealthForm((form) => ({ ...form, notes: "" }));
      setAttempt((value) => value + 1);
    } catch (error) {
      toast({
        title: "Không thể ghi nhật ký sức khỏe",
        description: error instanceof Error ? error.message : "Vui lòng thử lại.",
        variant: "destructive",
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleCreateTrackingLog = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setActionLoading(true);
    try {
      await createDriverTrackingLog({
        planId,
        milestone: trackingForm.milestone.trim() || null,
        latitude: Number(trackingForm.latitude),
        longitude: Number(trackingForm.longitude),
      });
      toast({ title: "Đã cập nhật vị trí hành trình" });
      setTrackingForm({ milestone: "", latitude: "", longitude: "" });
      setAttempt((value) => value + 1);
    } catch (error) {
      toast({
        title: "Không thể cập nhật hành trình",
        description: error instanceof Error ? error.message : "Vui lòng thử lại.",
        variant: "destructive",
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleCreateIncident = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const latitude = incidentForm.latitude.trim() ? Number(incidentForm.latitude) : null;
    const longitude = incidentForm.longitude.trim() ? Number(incidentForm.longitude) : null;
    if ((latitude === null) !== (longitude === null)) {
      toast({ title: "Nhập cả vĩ độ và kinh độ hoặc để trống cả hai", variant: "destructive" });
      return;
    }
    setActionLoading(true);
    try {
      await createDriverIncident({
        planId,
        category: incidentForm.category.trim(),
        description: incidentForm.description.trim(),
        sos: incidentForm.sos,
        latitude,
        longitude,
        additionalCost: incidentForm.additionalCost.trim() ? Number(incidentForm.additionalCost) : null,
      });
      toast({
        title: incidentForm.sos ? "Đã gửi báo cáo SOS" : "Đã báo sự cố",
        variant: incidentForm.sos ? "destructive" : "default",
      });
      setIncidentForm({ category: "", description: "", sos: false, latitude: "", longitude: "", additionalCost: "" });
      setAttempt((value) => value + 1);
    } catch (error) {
      toast({
        title: "Không thể báo sự cố",
        description: error instanceof Error ? error.message : "Vui lòng thử lại.",
        variant: "destructive",
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleUploadDeliveryFile = async (file: File, field: "signatureImageUrl" | "podDocumentUrl") => {
    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: "File vượt quá giới hạn",
        description: "Kích thước tối đa là 10 MB.",
        variant: "destructive",
      });
      return;
    }
    setUploadingDeliveryField(field === "signatureImageUrl" ? "signature" : "pod");
    try {
      const url = await uploadFile(file);
      setDeliveryForm((form) => ({ ...form, [field]: url }));
      toast({ title: field === "signatureImageUrl" ? "Đã tải ảnh chữ ký" : "Đã tải chứng từ POD" });
    } catch (error) {
      toast({
        title: "Không thể tải file",
        description: error instanceof Error ? error.message : "Vui lòng thử lại.",
        variant: "destructive",
      });
    } finally {
      setUploadingDeliveryField(null);
    }
  };

  const handleCreateDelivery = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!deliveryForm.signatureImageUrl) {
      toast({ title: "Vui lòng tải ảnh chữ ký lên trước khi xác nhận", variant: "destructive" });
      return;
    }
    setActionLoading(true);
    try {
      await createDriverDelivery({
        planId,
        recipientName: deliveryForm.recipientName.trim(),
        signatureImageUrl: deliveryForm.signatureImageUrl.trim(),
        podDocumentUrl: deliveryForm.podDocumentUrl.trim() || null,
      });
      toast({ title: "Đã ghi nhận bàn giao" });
      setDeliveryForm({ recipientName: "", signatureImageUrl: "", podDocumentUrl: "" });
      setAttempt((value) => value + 1);
    } catch (error) {
      toast({
        title: "Không thể ghi nhận bàn giao",
        description: error instanceof Error ? error.message : "Vui lòng thử lại.",
        variant: "destructive",
      });
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Kế hoạch ${planCode(plan.planId)}`}
        description="Thông tin chỉ đọc của kế hoạch được phân công cho bạn."
        icon={<Truck className="h-5 w-5" />}
        actions={<Button variant="outline" onClick={() => navigate("trips")}><ArrowLeft className="mr-2 h-4 w-4" />Danh sách chuyến</Button>}
      />

      <Card>
        <CardContent className="grid gap-4 p-5 sm:grid-cols-3">
          <div>
            <p className="text-xs text-muted-foreground">Trạng thái</p>
            <div className="mt-1"><StatusBadge status={transportPlanStatusLabel(plan.status)} /></div>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Khởi hành</p>
            <p className="mt-1 text-sm font-medium">{formatDateTime(plan.departureTime)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Dự kiến đến</p>
            <p className="mt-1 text-sm font-medium">{formatDateTime(plan.arrivalTime)}</p>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="stops" className="space-y-4">
        <TabsList className="grid h-auto w-full grid-cols-5">
          <TabsTrigger value="stops" className="gap-2"><MapPin className="h-4 w-4" />Lộ trình</TabsTrigger>
          <TabsTrigger value="health" className="gap-2"><Heart className="h-4 w-4" />Sức khỏe</TabsTrigger>
          <TabsTrigger value="incidents" className="gap-2"><AlertTriangle className="h-4 w-4" />Sự cố</TabsTrigger>
          <TabsTrigger value="tracking" className="gap-2"><MapPin className="h-4 w-4" />Hành trình</TabsTrigger>
          <TabsTrigger value="delivery" className="gap-2"><Truck className="h-4 w-4" />Bàn giao</TabsTrigger>
        </TabsList>

        <TabsContent value="stops">
          <Card>
            <CardHeader><CardTitle className="text-base">Các điểm dừng</CardTitle></CardHeader>
            <CardContent>
              {stops.length === 0 ? (
                <EmptyState icon={<MapPin className="h-6 w-6" />} title="Chưa có điểm dừng" description="Chưa có điểm dừng nào được ghi nhận cho kế hoạch này." className="py-8" />
              ) : (
                <div className="space-y-3">
                  {stops.map((stop) => (
                    <div key={stop.stopId} className="flex gap-3 rounded-lg border border-border p-4">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">{stop.sequenceNo}</div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-medium">{stop.stopName}</p>
                          <Badge variant="outline">{stop.stopType}</Badge>
                        </div>
                        {stop.locationName && <p className="mt-1 text-sm text-muted-foreground">{stop.locationName}{stop.countryCode ? ` · ${stop.countryCode}` : ""}</p>}
                        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                          {stop.plannedArrivalTime && <span>Dự kiến đến: {formatDateTime(stop.plannedArrivalTime)}</span>}
                          {stop.actualArrivalTime && <span>Thực tế đến: {formatDateTime(stop.actualArrivalTime)}</span>}
                          {stop.plannedDepartureTime && <span>Dự kiến rời: {formatDateTime(stop.plannedDepartureTime)}</span>}
                          {stop.actualDepartureTime && <span>Thực tế rời: {formatDateTime(stop.actualDepartureTime)}</span>}
                        </div>
                        {stop.notes && <p className="mt-2 text-sm text-muted-foreground">{stop.notes}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="health">
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Heart className="h-4 w-4" />Nhật ký sức khỏe</CardTitle></CardHeader>
            <CardContent>
              {healthLogs.length === 0 ? (
                <EmptyState icon={<Heart className="h-6 w-6" />} title="Chưa có nhật ký sức khỏe" className="py-8" />
              ) : (
                <div className="space-y-3">
                  {healthLogs.map((log) => (
                    <div key={log.logId} className="rounded-lg border border-border p-4">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="font-medium">{log.horseName || `Hồ sơ ngựa #${log.horseId.slice(-8)}`}</p>
                        <span className="text-xs text-muted-foreground">{formatDateTime(log.loggedAt)}</span>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm">
                        {log.stressLevel !== null && <span className="flex items-center gap-1.5"><Activity className="h-4 w-4 text-muted-foreground" />Căng thẳng {log.stressLevel}/10</span>}
                        {log.heartRate !== null && <span>Nhịp tim {log.heartRate} lần/phút</span>}
                        {log.temperature !== null && <span className="flex items-center gap-1.5"><Thermometer className="h-4 w-4 text-muted-foreground" />{log.temperature} °C</span>}
                        {log.appetiteStatus && <span>Ăn uống: {log.appetiteStatus}</span>}
                      </div>
                      {log.notes && <p className="mt-3 border-t border-border pt-3 text-sm text-muted-foreground">{log.notes}</p>}
                      {log.loggedByName && <p className="mt-2 text-xs text-muted-foreground">Ghi nhận bởi {log.loggedByName}</p>}
                    </div>
                  ))}
                </div>
              )}
              {canRecordTripData ? (
                <form onSubmit={handleCreateHealthLog} className="mt-6 space-y-4 border-t border-border pt-5">
                  <h3 className="font-medium">Ghi nhận sức khỏe mới</h3>
                  {plan.horses.length > 0 && (
                    <div className="grid gap-2 sm:grid-cols-2">
                      {plan.horses.map((horse) => (
                        <div key={horse.horseId} className="flex items-center gap-3 rounded-md border p-2">
                          <HorseImage src={horse.imageUrl} name={horse.name} className="h-12 w-12 shrink-0 rounded-md" />
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium">{horse.name}</p>
                            <p className="truncate text-xs text-muted-foreground">{horse.microchipId}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2 sm:col-span-2">
                      <Label htmlFor="health-horse">Ngựa</Label>
                      <select
                        id="health-horse"
                        required
                        value={healthForm.horseId}
                        onChange={(event) => setHealthForm((form) => ({ ...form, horseId: event.target.value }))}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      >
                        <option value="">Chọn ngựa</option>
                        {plan.horseIds.map((horseId) => (
                          <option key={horseId} value={horseId}>Hồ sơ ngựa #{horseId.slice(-8)}</option>
                        ))}
                      </select>
                      {plan.horseIds.length === 0 && (
                        <p className="text-sm text-muted-foreground">Chưa có hồ sơ ngựa được gắn với kế hoạch này.</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="health-stress">Mức căng thẳng (1–10)</Label>
                      <Input id="health-stress" type="number" min="1" max="10" value={healthForm.stressLevel}
                        onChange={(event) => setHealthForm((form) => ({ ...form, stressLevel: event.target.value }))} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="health-heart-rate">Nhịp tim (lần/phút)</Label>
                      <Input id="health-heart-rate" type="number" min="10" max="250" value={healthForm.heartRate}
                        onChange={(event) => setHealthForm((form) => ({ ...form, heartRate: event.target.value }))} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="health-temperature">Nhiệt độ (°C)</Label>
                      <Input id="health-temperature" type="number" min="30" max="45" step="0.1" value={healthForm.temperature}
                        onChange={(event) => setHealthForm((form) => ({ ...form, temperature: event.target.value }))} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="health-appetite">Tình trạng ăn uống</Label>
                      <Input id="health-appetite" maxLength={50} value={healthForm.appetiteStatus}
                        onChange={(event) => setHealthForm((form) => ({ ...form, appetiteStatus: event.target.value }))} />
                    </div>
                    <div className="space-y-2 sm:col-span-2">
                      <Label htmlFor="health-notes">Ghi chú</Label>
                      <Textarea id="health-notes" value={healthForm.notes}
                        onChange={(event) => setHealthForm((form) => ({ ...form, notes: event.target.value }))} />
                    </div>
                  </div>
                  <Button type="submit" disabled={actionLoading || plan.horseIds.length === 0}>
                    {actionLoading ? "Đang gửi..." : "Lưu nhật ký sức khỏe"}
                  </Button>
                </form>
              ) : (
                <p className="mt-5 border-t border-border pt-4 text-sm text-muted-foreground">
                  Chỉ có thể ghi nhật ký khi kế hoạch sẵn sàng hoặc đang thực hiện.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="incidents">
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2 text-base"><AlertTriangle className="h-4 w-4" />Sự cố</CardTitle></CardHeader>
            <CardContent>
              {incidents.length === 0 ? (
                <EmptyState icon={<AlertTriangle className="h-6 w-6" />} title="Chưa có sự cố được ghi nhận" className="py-8" />
              ) : (
                <div className="space-y-3">
                  {incidents.map((incident) => (
                    <div key={incident.incidentId} className="rounded-lg border border-border p-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium">{incident.category}</p>
                        <StatusBadge status={incidentStatusLabel(incident.status)} />
                        {incident.sos && <Badge variant="destructive">SOS</Badge>}
                      </div>
                      <p className="mt-2 text-sm">{incident.description}</p>
                      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                        <span>Ghi nhận: {formatDateTime(incident.reportedAt)}</span>
                        {incident.latitude !== null && incident.longitude !== null && <span>{incident.latitude}, {incident.longitude}</span>}
                        {incident.additionalCost !== null && <span>Chi phí: {incident.additionalCost}</span>}
                        {incident.additionalCost !== null && <span>{incident.costApproved ? "Đã duyệt chi phí" : "Chưa duyệt chi phí"}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {canRecordTripData ? (
                <form onSubmit={handleCreateIncident} className="mt-6 space-y-4 border-t border-border pt-5">
                  <h3 className="font-medium">Báo cáo sự cố</h3>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="incident-category">Loại sự cố</Label>
                      <Input id="incident-category" required maxLength={50} value={incidentForm.category}
                        onChange={(event) => setIncidentForm((form) => ({ ...form, category: event.target.value }))} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="incident-additional-cost">Chi phí phát sinh (nếu có)</Label>
                      <Input id="incident-additional-cost" type="number" min="0" step="0.01" value={incidentForm.additionalCost}
                        onChange={(event) => setIncidentForm((form) => ({ ...form, additionalCost: event.target.value }))} />
                    </div>
                    <div className="space-y-2 sm:col-span-2">
                      <Label htmlFor="incident-description">Mô tả</Label>
                      <Textarea id="incident-description" required value={incidentForm.description}
                        onChange={(event) => setIncidentForm((form) => ({ ...form, description: event.target.value }))} />
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2 sm:col-span-2">
                      <div className="space-y-2">
                        <Label htmlFor="incident-latitude">Vĩ độ (nếu có)</Label>
                        <Input id="incident-latitude" type="number" min="-90" max="90" step="any" value={incidentForm.latitude}
                          onChange={(event) => setIncidentForm((form) => ({ ...form, latitude: event.target.value }))} />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="incident-longitude">Kinh độ (nếu có)</Label>
                        <Input id="incident-longitude" type="number" min="-180" max="180" step="any" value={incidentForm.longitude}
                          onChange={(event) => setIncidentForm((form) => ({ ...form, longitude: event.target.value }))} />
                      </div>
                    </div>
                    <label className="flex items-center gap-2 text-sm sm:col-span-2">
                      <input type="checkbox" checked={incidentForm.sos}
                        onChange={(event) => setIncidentForm((form) => ({ ...form, sos: event.target.checked }))} />
                      Đây là tình huống khẩn cấp (SOS)
                    </label>
                  </div>
                  <Button type="submit" variant={incidentForm.sos ? "destructive" : "default"} disabled={actionLoading}>
                    {actionLoading ? "Đang gửi..." : incidentForm.sos ? "Gửi báo cáo SOS" : "Gửi báo cáo sự cố"}
                  </Button>
                </form>
              ) : (
                <p className="mt-5 border-t border-border pt-4 text-sm text-muted-foreground">
                  Chỉ có thể báo sự cố khi kế hoạch sẵn sàng hoặc đang thực hiện.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tracking">
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2 text-base"><MapPin className="h-4 w-4" />Nhật ký hành trình</CardTitle></CardHeader>
            <CardContent>
              {tracking.length === 0 ? (
                <EmptyState icon={<MapPin className="h-6 w-6" />} title="Chưa có cập nhật hành trình" className="py-8" />
              ) : (
                <div className="space-y-3">
                  {tracking.map((entry) => (
                    <div key={entry.logId} className="rounded-lg border border-border p-4">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="font-medium">{entry.milestone || "Cập nhật vị trí"}</p>
                        <span className="text-xs text-muted-foreground">{formatDateTime(entry.reportedAt)}</span>
                      </div>
                      <p className="mt-2 text-sm">{entry.latitude}, {entry.longitude}</p>
                      {entry.reportedByName && <p className="mt-1 text-xs text-muted-foreground">Cập nhật bởi {entry.reportedByName}</p>}
                    </div>
                  ))}
                </div>
              )}
              {canRecordTripData ? (
                <form onSubmit={handleCreateTrackingLog} className="mt-6 space-y-4 border-t border-border pt-5">
                  <h3 className="font-medium">Cập nhật vị trí</h3>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2 sm:col-span-2">
                      <Label htmlFor="tracking-milestone">Mốc hành trình (không bắt buộc)</Label>
                      <Input id="tracking-milestone" maxLength={100} value={trackingForm.milestone}
                        onChange={(event) => setTrackingForm((form) => ({ ...form, milestone: event.target.value }))} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="tracking-latitude">Vĩ độ</Label>
                      <Input id="tracking-latitude" type="number" required min="-90" max="90" step="any"
                        value={trackingForm.latitude}
                        onChange={(event) => setTrackingForm((form) => ({ ...form, latitude: event.target.value }))} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="tracking-longitude">Kinh độ</Label>
                      <Input id="tracking-longitude" type="number" required min="-180" max="180" step="any"
                        value={trackingForm.longitude}
                        onChange={(event) => setTrackingForm((form) => ({ ...form, longitude: event.target.value }))} />
                    </div>
                  </div>
                  <Button type="submit" disabled={actionLoading}>{actionLoading ? "Đang gửi..." : "Gửi cập nhật"}</Button>
                </form>
              ) : (
                <p className="mt-5 border-t border-border pt-4 text-sm text-muted-foreground">
                  Chỉ có thể cập nhật hành trình khi kế hoạch sẵn sàng hoặc đang thực hiện.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="delivery">
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Truck className="h-4 w-4" />Biên bản bàn giao</CardTitle></CardHeader>
            <CardContent>
              {delivery ? (
                <div className="rounded-lg border border-border p-4">
                  <p className="font-medium">Người nhận: {delivery.recipientName}</p>
                  <p className="mt-2 text-sm text-muted-foreground">Thời gian: {formatDateTime(delivery.deliveredAt)}</p>
                  <a className="mt-2 inline-block text-sm text-primary underline" href={delivery.signatureImageUrl} target="_blank" rel="noreferrer">
                    Xem tham chiếu chữ ký
                  </a>
                  {delivery.podDocumentUrl && (
                    <a className="ml-4 inline-block text-sm text-primary underline" href={delivery.podDocumentUrl} target="_blank" rel="noreferrer">
                      Xem chứng từ POD
                    </a>
                  )}
                </div>
              ) : (
                <EmptyState icon={<Truck className="h-6 w-6" />} title="Chưa có biên bản bàn giao" className="py-8" />
              )}
              {canRecordDelivery && !delivery ? (
                <form onSubmit={handleCreateDelivery} className="mt-6 space-y-4 border-t border-border pt-5">
                  <h3 className="font-medium">Ghi nhận bàn giao</h3>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="delivery-recipient">Tên người nhận</Label>
                      <Input id="delivery-recipient" required maxLength={150} value={deliveryForm.recipientName}
                        onChange={(event) => setDeliveryForm((form) => ({ ...form, recipientName: event.target.value }))} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="delivery-signature">Ảnh chữ ký người nhận</Label>
                      <Input id="delivery-signature" type="file" accept="image/jpeg,image/png"
                        disabled={actionLoading || uploadingDeliveryField !== null}
                        onChange={(event) => {
                          const file = event.currentTarget.files?.[0];
                          event.currentTarget.value = "";
                          if (file) void handleUploadDeliveryFile(file, "signatureImageUrl");
                        }} />
                      {deliveryForm.signatureImageUrl && <p className="break-all text-xs text-[var(--success-fg)]">Đã tải ảnh chữ ký: {deliveryForm.signatureImageUrl}</p>}
                    </div>
                    <div className="space-y-2 sm:col-span-2">
                      <Label htmlFor="delivery-pod">Chứng từ POD (không bắt buộc)</Label>
                      <Input id="delivery-pod" type="file" accept="image/jpeg,image/png,application/pdf"
                        disabled={actionLoading || uploadingDeliveryField !== null}
                        onChange={(event) => {
                          const file = event.currentTarget.files?.[0];
                          event.currentTarget.value = "";
                          if (file) void handleUploadDeliveryFile(file, "podDocumentUrl");
                        }} />
                      {deliveryForm.podDocumentUrl && <p className="break-all text-xs text-[var(--success-fg)]">Đã tải chứng từ: {deliveryForm.podDocumentUrl}</p>}
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">Tệp JPG/PNG/PDF, tối đa 10 MB. Tệp đã tải lên sẽ có URL công khai.</p>
                  <Button type="submit" disabled={actionLoading || uploadingDeliveryField !== null}>{uploadingDeliveryField ? "Đang tải tệp..." : actionLoading ? "Đang gửi..." : "Xác nhận bàn giao"}</Button>
                </form>
              ) : !delivery && !canRecordDelivery ? (
                <p className="mt-5 border-t border-border pt-4 text-sm text-muted-foreground">
                  Chỉ có thể ghi nhận bàn giao khi chuyến đang thực hiện.
                </p>
              ) : null}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
