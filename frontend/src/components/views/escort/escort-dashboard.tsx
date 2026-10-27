"use client";

import { useCallback, useEffect, useState } from "react";
import { useAppStore } from "@/store/app-store";
import {
  createDriverHealthLog,
  getDriverPlans,
  type DriverHealthLog,
  type DriverTransportPlan,
} from "@/lib/driver-api";
import { apiGet } from "@/lib/api-client";
import { PageHeader } from "@/components/app/page-header";
import { StatCard } from "@/components/app/stat-card";
import { StatusBadge } from "@/components/app/status-badge";
import { EmptyState, ErrorState, LoadingState } from "@/components/app/empty-state";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { HorseImage } from "@/components/app/horse-image";
import { useToast } from "@/hooks/use-toast";
import {
  AlertTriangle,
  Calendar,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  Heart,
  Loader2,
  MapPin,
  Plus,
  ShieldAlert,
  Stethoscope,
  Thermometer,
  Truck,
  X,
} from "lucide-react";
import {
  formatDateTime,
  formatRouteDetails,
  planCode,
  transportPlanStatusLabel,
} from "@/lib/constants";

interface HorseCareItem {
  horseId: string;
  name: string;
  microchipId: string;
  imageUrl: string | null;
  temperament?: string | null;
  allergies?: string | null;
  medicalHistory?: string | null;
  gender?: string | null;
  planId: string;
  planCodeText: string;
  routeText: string;
  planStatus: string;
  departureTime: string;
}

interface EscortDashboardData {
  plans: DriverTransportPlan[];
  careHorses: HorseCareItem[];
  recentLogs: DriverHealthLog[];
}

async function fetchEscortDashboardData(): Promise<EscortDashboardData> {
  const planList = await getDriverPlans();
  const horses: HorseCareItem[] = [];
  const planLogsPromises: Promise<DriverHealthLog[]>[] = [];

  for (const p of planList) {
    const routeText = formatRouteDetails(p.routeDetails);
    const pCode = planCode(p.planId);
    if (Array.isArray(p.horses)) {
      for (const h of p.horses) {
        horses.push({
          horseId: h.horseId,
          name: h.name,
          microchipId: h.microchipId,
          imageUrl: h.imageUrl,
          planId: p.planId,
          planCodeText: pCode,
          routeText,
          planStatus: p.status,
          departureTime: p.departureTime,
        });
      }
    }
    planLogsPromises.push(
      apiGet<DriverHealthLog[]>(`/transport-plans/${p.planId}/health-logs`).catch(() => [])
    );
  }

  const allLogsArrays = await Promise.all(planLogsPromises);
  const combinedLogs = allLogsArrays.flat().sort((a, b) => {
    return new Date(b.loggedAt).getTime() - new Date(a.loggedAt).getTime();
  });

  return {
    plans: planList,
    careHorses: horses,
    recentLogs: combinedLogs.slice(0, 8),
  };
}

export function EscortDashboard() {
  const { navigate, user } = useAppStore();
  const { toast } = useToast();
  const [plans, setPlans] = useState<DriverTransportPlan[]>([]);
  const [careHorses, setCareHorses] = useState<HorseCareItem[]>([]);
  const [recentLogs, setRecentLogs] = useState<DriverHealthLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Modal / Form ghi nhận quan sát
  const [observingHorse, setObservingHorse] = useState<HorseCareItem | null>(null);
  const [savingLog, setSavingLog] = useState(false);
  const [form, setForm] = useState({
    stressLevel: "1",
    heartRate: "38",
    temperature: "37.5",
    appetiteStatus: "Tot",
    notes: "",
  });

  // Checklist kiểm tra hành trình (lưu trạng thái tương tác trên phiên)
  const [checklist, setChecklist] = useState<Record<string, boolean>>({
    "check-pre-water": false,
    "check-pre-stall": false,
    "check-pre-temperament": false,
    "check-mid-vitals": false,
    "check-mid-stress": false,
    "check-post-handover": false,
  });

  const toggleChecklist = (key: string) => {
    setChecklist((current) => ({ ...current, [key]: !current[key] }));
  };

  const refreshData = useCallback(async () => {
    try {
      const data = await fetchEscortDashboardData();
      setPlans(data.plans);
      setCareHorses(data.careHorses);
      setRecentLogs(data.recentLogs);
      setError("");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Không thể tải dữ liệu chuyến đi kèm.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    void fetchEscortDashboardData()
      .then((data) => {
        if (!active) return;
        setPlans(data.plans);
        setCareHorses(data.careHorses);
        setRecentLogs(data.recentLogs);
        setError("");
      })
      .catch((err: unknown) => {
        if (!active) return;
        setError(err instanceof Error ? err.message : "Không thể tải dữ liệu chuyến đi kèm.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const openObservationModal = (horse: HorseCareItem) => {
    setObservingHorse(horse);
    setForm({
      stressLevel: "1",
      heartRate: "38",
      temperature: "37.5",
      appetiteStatus: "Tot",
      notes: "",
    });
  };

  const handleSaveObservation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!observingHorse) return;

    setSavingLog(true);
    try {
      await createDriverHealthLog({
        planId: observingHorse.planId,
        horseId: observingHorse.horseId,
        stressLevel: form.stressLevel ? Number(form.stressLevel) : null,
        heartRate: form.heartRate ? Number(form.heartRate) : null,
        temperature: form.temperature ? Number(form.temperature) : null,
        appetiteStatus: form.appetiteStatus.trim() || null,
        notes: form.notes.trim() || null,
      });

      toast({
        title: "Đã lưu quan sát chăm sóc",
        description: `Ghi nhận thể trạng cho ngựa ${observingHorse.name} thành công.`,
      });

      setObservingHorse(null);
      await refreshData();
    } catch (err: unknown) {
      toast({
        title: "Không thể lưu quan sát",
        description: err instanceof Error ? err.message : "Vui lòng thử lại sau.",
        variant: "destructive",
      });
    } finally {
      setSavingLog(false);
    }
  };

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} onRetry={() => void refreshData()} />;

  const highStressCount = recentLogs.filter(
    (l) => (l.stressLevel ?? 0) >= 4 || l.appetiteStatus === "Bo an"
  ).length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tổng quan Nhân viên đi kèm"
        description={`Chào mừng ${user?.name || ""}! Theo dõi tình trạng sức khỏe, ăn uống và an toàn của ngựa trong suốt hành trình.`}
        icon={<Stethoscope className="h-5 w-5" />}
      />

      {/* Thẻ thống kê ưu tiên nhiệm vụ chăm sóc ngựa */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Chuyến tham gia áp tải"
          value={plans.length}
          icon={<Truck className="h-6 w-6" />}
          tone="default"
          delay={0}
        />
        <StatCard
          label="Ngựa phụ trách theo dõi"
          value={careHorses.length}
          icon={<Heart className="h-6 w-6" />}
          tone="info"
          hint="Tổng số cá thể trong các chuyến"
          delay={0.05}
        />
        <StatCard
          label="Nhật ký đã ghi nhận"
          value={recentLogs.length}
          icon={<ClipboardCheck className="h-6 w-6" />}
          tone="success"
          delay={0.1}
        />
        <StatCard
          label="Cảnh báo cần lưu ý"
          value={highStressCount}
          icon={<ShieldAlert className="h-6 w-6" />}
          tone={highStressCount > 0 ? "warning" : "default"}
          hint={highStressCount > 0 ? "Ngựa có biểu hiện căng thẳng / bỏ ăn" : "Thể trạng đàn ngựa ổn định"}
          delay={0.15}
        />
      </div>

      {/* Danh sách ngựa cần chăm sóc */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <Heart className="h-4 w-4 text-primary" />
              Danh sách ngựa trong các chuyến được giao
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">
              Theo dõi tình trạng thực tế và ghi nhận quan sát định kỳ
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => navigate("trips")}>
            Xem danh sách chuyến <ChevronRight className="ml-1 h-3 w-3" />
          </Button>
        </CardHeader>
        <CardContent>
          {careHorses.length === 0 ? (
            <EmptyState
              icon={<Heart className="h-6 w-6" />}
              title="Chưa có ngựa cần chăm sóc"
              description="Các con ngựa sẽ xuất hiện tại đây khi bạn được phân công làm nhân viên đi kèm cho chuyến vận chuyển."
            />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {careHorses.map((horse) => (
                <div
                  key={`${horse.planId}-${horse.horseId}`}
                  className="flex flex-col justify-between rounded-xl border border-border bg-card p-4 transition-all hover:border-primary/40 hover:shadow-sm"
                >
                  <div className="flex items-start gap-3">
                    <HorseImage
                      src={horse.imageUrl}
                      name={horse.name}
                      className="h-14 w-14 rounded-lg object-cover border border-border shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold truncate">{horse.name}</p>
                      <p className="text-xs text-muted-foreground">Chip: {horse.microchipId}</p>
                      <p className="text-xs text-primary font-medium mt-1 truncate">
                        {horse.routeText}
                      </p>
                      <div className="mt-1 flex items-center gap-1.5 text-[11px] text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        <span>Khởi hành: {formatDateTime(horse.departureTime)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-border flex items-center justify-between gap-2">
                    <StatusBadge status={transportPlanStatusLabel(horse.planStatus)} />
                    <Button
                      size="sm"
                      onClick={() => openObservationModal(horse)}
                      className="gap-1.5 h-8 text-xs font-semibold"
                    >
                      <Plus className="h-3.5 w-3.5" /> Ghi nhận quan sát
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Grid: Checklist kiểm tra định kỳ & Nhật ký quan sát gần nhất */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Checklist chăm sóc hành trình */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <ClipboardCheck className="h-4 w-4 text-primary" />
              Quy trình kiểm tra chăm sóc định kỳ
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              Các bước chăm sóc tiêu chuẩn dành cho nhân viên đi kèm xuyên biên giới
            </p>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="rounded-lg border border-border p-3 space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                1. Trước giờ khởi hành
              </p>
              <label className="flex items-center gap-2.5 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={checklist["check-pre-water"]}
                  onChange={() => toggleChecklist("check-pre-water")}
                  className="h-4 w-4 rounded border-border text-primary"
                />
                <span>Kiểm tra bồn nước sạch và máng cỏ khô trong khoang</span>
              </label>
              <label className="flex items-center gap-2.5 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={checklist["check-pre-stall"]}
                  onChange={() => toggleChecklist("check-pre-stall")}
                  className="h-4 w-4 rounded border-border text-primary"
                />
                <span>Kiểm tra đệm lót chống trượt và chốt vách ngăn an toàn</span>
              </label>
              <label className="flex items-center gap-2.5 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={checklist["check-pre-temperament"]}
                  onChange={() => toggleChecklist("check-pre-temperament")}
                  className="h-4 w-4 rounded border-border text-primary"
                />
                <span>Quan sát thể trạng ban đầu, mức độ kích động trước khi xe lăn bánh</span>
              </label>
            </div>

            <div className="rounded-lg border border-border p-3 space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                2. Tại trạm dừng & Trạm kiểm dịch
              </p>
              <label className="flex items-center gap-2.5 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={checklist["check-mid-vitals"]}
                  onChange={() => toggleChecklist("check-mid-vitals")}
                  className="h-4 w-4 rounded border-border text-primary"
                />
                <span>Đo nhiệt độ và quan sát nhịp thở của từng cá thể</span>
              </label>
              <label className="flex items-center gap-2.5 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={checklist["check-mid-stress"]}
                  onChange={() => toggleChecklist("check-mid-stress")}
                  className="h-4 w-4 rounded border-border text-primary"
                />
                <span>Cho uống nước bổ sung chất điện giải và làm mát khoang</span>
              </label>
            </div>

            <div className="rounded-lg border border-border p-3 space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                3. Khi đến điểm nhận & Bàn giao
              </p>
              <label className="flex items-center gap-2.5 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={checklist["check-post-handover"]}
                  onChange={() => toggleChecklist("check-post-handover")}
                  className="h-4 w-4 rounded border-border text-primary"
                />
                <span>Kiểm tra tình trạng móng, da và thể trạng tổng thể trước khi bàn giao</span>
              </label>
            </div>

            <div className="rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
              <span>
                <strong>Lưu ý nghiệp vụ:</strong> Mọi bất thường nghiêm trọng (sốt cao trên 38.5°C, co giật, bỏ ăn liên tục) phải báo ngay qua tính năng Báo sự cố và liên hệ Bác sĩ thú y phụ trách.
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Lịch sử ghi nhận quan sát gần đây */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Stethoscope className="h-4 w-4 text-primary" />
                Lịch sử quan sát gần đây
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                Ghi nhận thể trạng thực tế của các chuyến được giao
              </p>
            </div>
          </CardHeader>
          <CardContent>
            {recentLogs.length === 0 ? (
              <EmptyState
                icon={<Stethoscope className="h-6 w-6" />}
                title="Chưa có nhật ký quan sát"
                description="Bấm 'Ghi nhận quan sát' ở thẻ ngựa để thêm báo cáo thể trạng đầu tiên."
              />
            ) : (
              <div className="space-y-3 max-h-[460px] overflow-y-auto scrollbar-equideli pr-1">
                {recentLogs.map((log) => (
                  <div
                    key={log.logId}
                    className="rounded-lg border border-border bg-card p-3.5 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-sm text-foreground">
                        {log.horseName || "Ngựa vận chuyển"}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {formatDateTime(log.loggedAt)}
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <div className="rounded bg-muted/50 p-2">
                        <span className="text-muted-foreground block text-[10px]">Thân nhiệt</span>
                        <span className="font-semibold">
                          {log.temperature ? `${log.temperature}°C` : "Chưa đo"}
                        </span>
                      </div>
                      <div className="rounded bg-muted/50 p-2">
                        <span className="text-muted-foreground block text-[10px]">Nhịp tim</span>
                        <span className="font-semibold">
                          {log.heartRate ? `${log.heartRate} bpm` : "Chưa đo"}
                        </span>
                      </div>
                      <div className="rounded bg-muted/50 p-2">
                        <span className="text-muted-foreground block text-[10px]">Căng thẳng</span>
                        <span className={`font-semibold ${
                          (log.stressLevel ?? 0) >= 4 ? "text-red-500" : (log.stressLevel ?? 0) >= 3 ? "text-amber-500" : "text-emerald-500"
                        }`}>
                          Mức {log.stressLevel ?? "—"}/5
                        </span>
                      </div>
                    </div>

                    {log.appetiteStatus && (
                      <p className="text-xs text-muted-foreground">
                        Khẩu vị: <span className="font-medium text-foreground">{log.appetiteStatus}</span>
                      </p>
                    )}

                    {log.notes && (
                      <p className="text-xs bg-muted/30 rounded p-2 text-muted-foreground italic">
                        &ldquo;{log.notes}&rdquo;
                      </p>
                    )}

                    <div className="flex items-center justify-between pt-1 text-[11px] text-muted-foreground">
                      <span>Người ghi: {log.loggedByName || "Nhân viên đi kèm"}</span>
                      <span className="text-[10px] text-muted-foreground/60">Quan sát thực tế</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Modal ghi nhận quan sát sức khỏe */}
      {observingHorse && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <Card className="w-full max-w-lg shadow-xl animate-fade-in-up">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <Stethoscope className="h-4 w-4 text-primary" />
                  Ghi nhận quan sát sức khỏe
                </CardTitle>
                <p className="text-xs text-muted-foreground">
                  Ngựa: <strong className="text-foreground">{observingHorse.name}</strong> ({observingHorse.microchipId}) · Kế hoạch {observingHorse.planCodeText}
                </p>
              </div>
              <button
                onClick={() => setObservingHorse(null)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            </CardHeader>

            <CardContent>
              <form onSubmit={handleSaveObservation} className="space-y-4">
                <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 p-2.5 text-xs text-amber-700 dark:text-amber-400">
                  Đây là ghi nhận quan sát thực tế của nhân viên đi kèm phục vụ theo dõi hành trình; kết luận chuyên môn thuộc bác sĩ thú y có thẩm quyền.
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="stressLevel">Mức độ căng thẳng (1 - 5)</Label>
                    <select
                      id="stressLevel"
                      value={form.stressLevel}
                      onChange={(e) => setForm({ ...form, stressLevel: e.target.value })}
                      className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                    >
                      <option value="1">1 - Rất bình tĩnh, thư giãn</option>
                      <option value="2">2 - Hơi bồn chồn, cảnh giác</option>
                      <option value="3">3 - Căng thẳng vừa, thở nhanh</option>
                      <option value="4">4 - Kích động, giậm chân, mồ hôi</option>
                      <option value="5">5 - Rất hoảng loạn, nguy hiểm</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="appetiteStatus">Khẩu vị ăn uống</Label>
                    <select
                      id="appetiteStatus"
                      value={form.appetiteStatus}
                      onChange={(e) => setForm({ ...form, appetiteStatus: e.target.value })}
                      className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                    >
                      <option value="Tot">Ăn uống tốt, bình thường</option>
                      <option value="Binh thuong">Ăn uống vừa phải</option>
                      <option value="Kem">Ăn ít, chậm</option>
                      <option value="Bo an">Bỏ ăn, từ chối uống nước</option>
                    </select>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="temperature">Thân nhiệt (°C)</Label>
                    <Input
                      id="temperature"
                      type="number"
                      step="0.1"
                      placeholder="37.5"
                      value={form.temperature}
                      onChange={(e) => setForm({ ...form, temperature: e.target.value })}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="heartRate">Nhịp tim (nhịp/phút)</Label>
                    <Input
                      id="heartRate"
                      type="number"
                      placeholder="38"
                      value={form.heartRate}
                      onChange={(e) => setForm({ ...form, heartRate: e.target.value })}
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="notes">Ghi chép quan sát thực tế</Label>
                  <Textarea
                    id="notes"
                    rows={3}
                    placeholder="Ví dụ: Ngựa đứng vững trong khoang, uống đủ 10L nước, phản ứng bình tĩnh khi xe qua trạm..."
                    value={form.notes}
                    onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-border">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setObservingHorse(null)}
                  >
                    Hủy
                  </Button>
                  <Button type="submit" disabled={savingLog} className="gap-2">
                    {savingLog ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" /> Đang lưu...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="h-4 w-4" /> Lưu ghi nhận
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
