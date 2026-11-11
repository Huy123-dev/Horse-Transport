"use client";

import { useEffect, useState } from "react";
import { apiGet } from "@/lib/api-client";
import { useAppStore } from "@/store/app-store";
import { PageHeader } from "@/components/app/page-header";
import { StatCard } from "@/components/app/stat-card";
import { StatusBadge } from "@/components/app/status-badge";
import { EmptyState, LoadingState, ErrorState } from "@/components/app/empty-state";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { HorseImage } from "@/components/app/horse-image";
import {
  Stethoscope,
  CheckCircle2,
  Activity,
  AlertTriangle,
  Calendar,
  Heart,
  Thermometer,
  ShieldCheck,
  Search,
} from "lucide-react";
import { formatDateTime } from "@/lib/constants";
import { Input } from "@/components/ui/input";

interface RecoveryStats {
  totalHorses: number;
  readyCount: number;
  recoveringCount: number;
  needsAttentionCount: number;
}

interface RecoveryHorse {
  horseId: string;
  name: string;
  microchipId: string;
  gender: string;
  breed?: string | null;
  imageUrl?: string | null;
}

interface LocationInfo {
  name: string;
}

interface RequestInfo {
  origin?: LocationInfo | null;
  destination?: LocationInfo | null;
  competitionName?: string | null;
}

interface PlanInfo {
  planId: string;
  request?: RequestInfo | null;
}

interface RecoveryAssessment {
  recoveryId: string;
  planId: string;
  plan?: PlanInfo | null;
  assessmentDate: string;
  stressLevel: number | null;
  heartRate: number | null;
  temperature: number | null;
  appetiteStatus: string | null;
  vetNotes: string | null;
  loggedByName: string | null;
}

interface HorseSummary {
  horse: RecoveryHorse;
  latestStage: string;
  readyToRace: boolean;
  assessments: RecoveryAssessment[];
}

interface RecentRecovery {
  recoveryId: string;
  horse: RecoveryHorse;
  recoveryStage: string;
  readyToRace: boolean;
  assessmentDate: string;
  vetNotes: string | null;
  plan?: PlanInfo | null;
}

interface RecoveryDashboardData {
  stats: RecoveryStats;
  summary: HorseSummary[];
  recoveries: RecentRecovery[];
}

const STAGE_TONES: Record<string, string> = {
  "Đã hồi phục": "bg-[var(--success-bg)] text-[var(--success-fg)] border-[var(--success)]/30",
  "Đang hồi phục": "bg-[var(--info-bg)] text-[var(--info-fg)] border-[var(--info)]/30",
  "Theo dõi": "bg-[var(--warning-bg)] text-[var(--warning-fg)] border-[var(--warning)]/30",
  "Cần can thiệp": "bg-[var(--danger-bg)] text-[var(--danger-fg)] border-[var(--danger)]/30",
};

function getStageProgress(stage: string): number {
  switch (stage) {
    case "Đã hồi phục":
      return 100;
    case "Đang hồi phục":
      return 70;
    case "Theo dõi":
      return 45;
    case "Cần can thiệp":
      return 20;
    default:
      return 90;
  }
}

export function RecoveryDashboard() {
  const [data, setData] = useState<RecoveryDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [stageFilter, setStageFilter] = useState("Tất cả");

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const res = await apiGet<RecoveryDashboardData>("/recovery-dashboard");
        setData(res);
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Không thể tải dữ liệu theo dõi hồi phục.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <LoadingState variant="detail" />;
  if (error) return <ErrorState message={error} />;
  if (!data) return <ErrorState message="Không có dữ liệu phản hồi từ hệ thống" />;

  const stats = data.stats || {
    totalHorses: 0,
    readyCount: 0,
    recoveringCount: 0,
    needsAttentionCount: 0,
  };
  const summary = data.summary || [];
  const recoveries = data.recoveries || [];

  const filteredSummary = summary.filter((s) => {
    const matchSearch =
      !search ||
      s.horse.name.toLowerCase().includes(search.toLowerCase()) ||
      s.horse.microchipId.toLowerCase().includes(search.toLowerCase());
    const matchStage =
      stageFilter === "Tất cả" ||
      (stageFilter === "Sẵn sàng thi đấu" && s.readyToRace) ||
      (stageFilter === "Đang hồi phục" && s.latestStage === "Đang hồi phục") ||
      (stageFilter === "Cần chú ý" && ["Theo dõi", "Cần can thiệp"].includes(s.latestStage));
    return matchSearch && matchStage;
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Theo dõi hồi phục"
        description="Giám sát thể lực, chỉ số sinh hiệu và tiến độ hồi phục của ngựa sau chuyến vận chuyển"
        icon={<Stethoscope className="h-5 w-5" />}
      />

      {/* Thẻ thống kê */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Tổng ngựa theo dõi"
          value={stats.totalHorses}
          icon={<Heart className="h-6 w-6" />}
          tone="default"
          delay={0}
        />
        <StatCard
          label="Sẵn sàng thi đấu"
          value={stats.readyCount}
          icon={<CheckCircle2 className="h-6 w-6" />}
          tone="success"
          delay={0.05}
        />
        <StatCard
          label="Đang hồi phục"
          value={stats.recoveringCount}
          icon={<Activity className="h-6 w-6" />}
          tone="info"
          delay={0.1}
        />
        <StatCard
          label="Cần chú ý"
          value={stats.needsAttentionCount}
          icon={<AlertTriangle className="h-6 w-6" />}
          tone="danger"
          delay={0.15}
        />
      </div>

      {/* Bộ lọc tìm kiếm & trạng thái */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            aria-label="Tìm theo tên hoặc microchip"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm theo tên hoặc microchip"
            className="pl-9"
          />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {[
            { label: "Tất cả", count: summary.length },
            { label: "Sẵn sàng thi đấu", count: stats.readyCount },
            { label: "Đang hồi phục", count: stats.recoveringCount },
            { label: "Cần chú ý", count: stats.needsAttentionCount },
          ].map((tab) => (
            <button
              key={tab.label}
              onClick={() => setStageFilter(tab.label)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                stageFilter === tab.label
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/70"
              }`}
            >
              {tab.label} ({tab.count})
            </button>
          ))}
        </div>
      </div>

      {/* Danh sách thẻ hồi phục của từng ngựa */}
      {filteredSummary.length === 0 ? (
        <EmptyState
          icon={<Stethoscope className="h-6 w-6" />}
          title="Không tìm thấy hồ sơ phù hợp"
          description={search ? "Thử tìm kiếm với từ khóa khác." : "Dữ liệu hồi phục sẽ tự động hiển thị sau khi chuyến vận chuyển ghi nhận nhật ký sức khỏe."}
        />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {filteredSummary.map((s) => {
            const progress = getStageProgress(s.latestStage);
            const latestAssessment = s.assessments[0];
            return (
              <Card key={s.horse.horseId} className="card-hover overflow-hidden">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <HorseImage
                        src={s.horse.imageUrl}
                        name={s.horse.name}
                        className="h-14 w-14 rounded-xl border border-border"
                      />
                      <div>
                        <h3 className="text-base font-bold tracking-tight">{s.horse.name}</h3>
                        <p className="text-xs text-muted-foreground">
                          {s.horse.microchipId} · Giới tính: {s.horse.gender}
                        </p>
                      </div>
                    </div>
                    {s.readyToRace ? (
                      <Badge className="bg-[var(--success)] text-white gap-1 shrink-0">
                        <CheckCircle2 className="h-3 w-3" /> Sẵn sàng thi đấu
                      </Badge>
                    ) : (
                      <Badge variant="outline" className={`shrink-0 ${STAGE_TONES[s.latestStage] || ""}`}>
                        {s.latestStage}
                      </Badge>
                    )}
                  </div>

                  {/* Thanh tiến độ thể lực */}
                  <div className="mt-4 rounded-lg border border-border bg-muted/30 p-3">
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <span className="font-medium text-muted-foreground">Tiến độ hồi phục thể lực</span>
                      <span className="font-bold">{progress}%</span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                      <div
                        className={`h-full transition-all duration-500 ${
                          progress === 100
                            ? "bg-[var(--success)]"
                            : progress >= 60
                            ? "bg-primary"
                            : "bg-[var(--warning)]"
                        }`}
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>

                  {/* Chỉ số sinh hiệu gần nhất */}
                  {latestAssessment && (
                    <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
                      <div className="rounded-lg border border-border p-2 bg-card">
                        <p className="text-muted-foreground flex items-center justify-center gap-1">
                          <Thermometer className="h-3 w-3" /> Thân nhiệt
                        </p>
                        <p className="mt-1 font-bold text-sm">
                          {latestAssessment.temperature ? `${latestAssessment.temperature}°C` : "—"}
                        </p>
                      </div>
                      <div className="rounded-lg border border-border p-2 bg-card">
                        <p className="text-muted-foreground flex items-center justify-center gap-1">
                          <Activity className="h-3 w-3" /> Nhịp tim
                        </p>
                        <p className="mt-1 font-bold text-sm">
                          {latestAssessment.heartRate ? `${latestAssessment.heartRate} bpm` : "—"}
                        </p>
                      </div>
                      <div className="rounded-lg border border-border p-2 bg-card">
                        <p className="text-muted-foreground flex items-center justify-center gap-1">
                          <ShieldCheck className="h-3 w-3" /> Căng thẳng
                        </p>
                        <p
                          className={`mt-1 font-bold text-sm ${
                            (latestAssessment.stressLevel || 0) >= 6
                              ? "text-[var(--danger-fg)]"
                              : ""
                          }`}
                        >
                          {latestAssessment.stressLevel ? `${latestAssessment.stressLevel}/10` : "—"}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Lịch sử đánh giá gần đây của ngựa */}
                  <div className="mt-4">
                    <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      Lịch sử đo kiểm gần đây ({s.assessments.length})
                    </p>
                    {s.assessments.length === 0 ? (
                      <p className="text-xs text-muted-foreground italic py-1">
                        Chưa có nhật ký đo kiểm chi tiết.
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {s.assessments.slice(0, 2).map((a) => (
                          <div
                            key={a.recoveryId}
                            className="flex w-full items-center justify-between rounded-lg border border-border p-2.5 text-xs bg-card"
                          >
                            <div className="min-w-0 flex-1">
                              <p className="flex items-center gap-1 text-muted-foreground">
                                <Calendar className="h-3 w-3" />
                                {formatDateTime(a.assessmentDate)}
                              </p>
                              {a.vetNotes && (
                                <p className="mt-1 truncate font-medium text-foreground">
                                  {a.vetNotes}
                                </p>
                              )}
                            </div>
                            <div className="text-right shrink-0 ml-3">
                              <span className="text-muted-foreground">Người đo: </span>
                              <span className="font-semibold">{a.loggedByName || "Bác sĩ thú y"}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Dòng thời gian lịch sử đánh giá gần đây toàn hệ thống */}
      {recoveries.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Activity className="h-4 w-4" /> Nhật ký theo dõi sức khỏe theo dòng thời gian
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="relative space-y-4 before:absolute before:left-[15px] before:top-2 before:h-full before:w-0.5 before:bg-border">
              {recoveries.slice(0, 8).map((r) => (
                <div key={r.recoveryId} className="relative flex gap-4">
                  <div
                    className={`z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ring-4 ring-background ${
                      r.readyToRace
                        ? "bg-[var(--success)] text-white"
                        : ["Cần can thiệp", "Theo dõi"].includes(r.recoveryStage)
                        ? "bg-[var(--warning)] text-white"
                        : "bg-primary text-primary-foreground"
                    }`}
                  >
                    <Stethoscope className="h-4 w-4" />
                  </div>
                  <div className="flex-1 pb-2">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-semibold">{r.horse?.name}</p>
                      <StatusBadge status={r.recoveryStage} />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {formatDateTime(r.assessmentDate)}
                    </p>
                    {r.vetNotes && (
                      <p className="mt-1 text-xs text-foreground bg-muted/40 p-2 rounded-md">
                        {r.vetNotes}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
