"use client";

import { useEffect, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Flag,
  Heart,
  MapPin,
  Navigation,
  ShieldCheck,
  Truck,
} from "lucide-react";
import { ApiError, apiGet } from "@/lib/api-client";
import { getJourneyTimeline, type JourneyEventType, type JourneyTimelineEntry } from "@/lib/journey-api";
import { formatDateTime, incidentStatusLabel, STOP_TYPES } from "@/lib/constants";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState, ErrorState, LoadingState } from "@/components/app/empty-state";

interface JourneyTimelineProps {
  planId: string;
}

interface RouteStopItem {
  stopId: string;
  planId: string;
  sequenceNo: number;
  locationId: string | null;
  locationName: string | null;
  countryCode: string | null;
  stopName: string | null;
  stopType: string;
  plannedArrivalTime: string | null;
  plannedDepartureTime: string | null;
  actualArrivalTime: string | null;
  actualDepartureTime: string | null;
  notes: string | null;
}

const eventIcons: Record<JourneyEventType, typeof MapPin> = {
  TRACKING: MapPin,
  HEALTH: Heart,
  INCIDENT: AlertTriangle,
};

const eventLabels: Record<JourneyEventType, string> = {
  TRACKING: "Vị trí",
  HEALTH: "Sức khỏe",
  INCIDENT: "Sự cố",
};

export function JourneyTimeline({ planId }: JourneyTimelineProps) {
  const [entries, setEntries] = useState<JourneyTimelineEntry[] | null>(null);
  const [stops, setStops] = useState<RouteStopItem[]>([]);
  const [error, setError] = useState("");
  const [loadedPlanId, setLoadedPlanId] = useState("");

  useEffect(() => {
    let active = true;

    async function fetchData() {
      try {
        const [timelineEntries, routeStops] = await Promise.all([
          getJourneyTimeline(planId),
          apiGet<RouteStopItem[]>(`/transport-plans/${planId}/stops`).catch(() => [] as RouteStopItem[]),
        ]);
        if (active) {
          setEntries(timelineEntries);
          setStops(routeStops || []);
          setError("");
          setLoadedPlanId(planId);
        }
      } catch (cause: unknown) {
        if (active) {
          setEntries(null);
          setStops([]);
          setError(
            cause instanceof ApiError && cause.status === 403
              ? "Bạn không có quyền xem lịch sử hành trình của kế hoạch này."
              : cause instanceof Error
                ? cause.message
                : "Không thể tải timeline hành trình."
          );
          setLoadedPlanId(planId);
        }
      }
    }

    void fetchData();
    return () => {
      active = false;
    };
  }, [planId]);

  if (loadedPlanId !== planId) return <LoadingState />;
  if (error) return <ErrorState message={error} />;


  const sortedStops = [...stops].sort((a, b) => a.sequenceNo - b.sequenceNo);


  const latestTracking = entries?.find((e) => e.type === "TRACKING");


  let activeStopIndex = -1;
  sortedStops.forEach((stop, index) => {
    if (stop.actualArrivalTime || stop.actualDepartureTime) {
      activeStopIndex = index;
    }
  });

  return (
    <div className="space-y-6">
      {/* Sơ đồ hành trình và các địa điểm tương đối */}
      <Card className="overflow-hidden border-primary/20">
        <CardHeader className="bg-primary/5 pb-4">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-base">
                <Navigation className="h-5 w-5 text-primary" />
                Sơ đồ lộ trình & Các điểm dừng
              </CardTitle>
              <CardDescription className="text-xs">
                Mô phỏng tương đối các mốc địa điểm theo dữ liệu lộ trình và báo cáo thực tế
              </CardDescription>
            </div>
            {latestTracking && (
              <Badge variant="outline" className="w-fit gap-1.5 border-primary/40 bg-background text-xs text-primary">
                <Truck className="h-3.5 w-3.5" />
                Vị trí gần nhất: {latestTracking.title}
              </Badge>
            )}
          </div>
        </CardHeader>

        <CardContent className="pt-6">
          {sortedStops.length > 0 ? (
            <div className="space-y-4">
              {/* Desktop/Tablet Horizontal Route Map */}
              <div className="hidden md:block">
                <div className="relative flex items-start justify-between px-2">
                  {/* Progress track line */}
                  <div className="absolute left-6 right-6 top-5 -z-0 h-1 bg-border" />
                  {activeStopIndex >= 0 && sortedStops.length > 1 && (
                    <div
                      className="absolute left-6 top-5 -z-0 h-1 bg-primary transition-all duration-500"
                      style={{
                        width: `${Math.min(100, (activeStopIndex / (sortedStops.length - 1)) * 100)}%`,
                      }}
                    />
                  )}

                  {sortedStops.map((stop, idx) => {
                    const isPassed = activeStopIndex > idx;
                    const isCurrent = activeStopIndex === idx;
                    const isOrigin = idx === 0;
                    const isDestination = idx === sortedStops.length - 1;

                    return (
                      <div key={stop.stopId || idx} className="relative z-10 flex flex-1 flex-col items-center text-center">
                        {/* Stop Circle / Icon */}
                        <div
                          className={`flex h-10 w-10 items-center justify-center rounded-full border-2 transition-all ${
                            isCurrent
                              ? "border-primary bg-primary text-primary-foreground shadow-md ring-4 ring-primary/20"
                              : isPassed
                                ? "border-primary bg-primary/10 text-primary"
                                : "border-muted-foreground/30 bg-background text-muted-foreground"
                          }`}
                        >
                          {isCurrent ? (
                            <Truck className="h-5 w-5 animate-bounce" />
                          ) : isPassed ? (
                            <CheckCircle2 className="h-5 w-5" />
                          ) : isOrigin ? (
                            <Flag className="h-4 w-4" />
                          ) : isDestination ? (
                            <MapPin className="h-4 w-4" />
                          ) : stop.stopType === "CUSTOMS" || stop.stopType === "QUARANTINE" ? (
                            <ShieldCheck className="h-4 w-4" />
                          ) : (
                            <span className="text-xs font-semibold">{stop.sequenceNo}</span>
                          )}
                        </div>

                        {/* Stop details */}
                        <div className="mt-3 max-w-[130px] space-y-1">
                          <p className={`text-xs font-semibold leading-tight line-clamp-2 ${isCurrent ? "text-primary" : ""}`}>
                            {stop.stopName || stop.locationName || `Điểm dừng #${stop.sequenceNo}`}
                          </p>
                          <Badge variant="secondary" className="px-1.5 py-0 text-[10px]">
                            {STOP_TYPES[stop.stopType] || stop.stopType}
                          </Badge>
                          {stop.actualArrivalTime ? (
                            <p className="text-[10px] text-muted-foreground">
                              Đã đến: {formatDateTime(stop.actualArrivalTime)}
                            </p>
                          ) : stop.plannedArrivalTime ? (
                            <p className="text-[10px] text-muted-foreground">
                              Dự kiến: {formatDateTime(stop.plannedArrivalTime)}
                            </p>
                          ) : null}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Mobile Vertical Route Map */}
              <div className="space-y-4 md:hidden">
                <ol className="relative border-l-2 border-border pl-6">
                  {sortedStops.map((stop, idx) => {
                    const isPassed = activeStopIndex > idx;
                    const isCurrent = activeStopIndex === idx;

                    return (
                      <li key={stop.stopId || idx} className="mb-6 last:mb-0">
                        <span
                          className={`absolute -left-[13px] flex h-6 w-6 items-center justify-center rounded-full border ${
                            isCurrent
                              ? "border-primary bg-primary text-primary-foreground shadow"
                              : isPassed
                                ? "border-primary bg-primary/20 text-primary"
                                : "border-border bg-background text-muted-foreground"
                          }`}
                        >
                          {isCurrent ? (
                            <Truck className="h-3.5 w-3.5" />
                          ) : isPassed ? (
                            <CheckCircle2 className="h-3.5 w-3.5" />
                          ) : (
                            <span className="text-[10px] font-bold">{stop.sequenceNo}</span>
                          )}
                        </span>
                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-sm font-semibold">
                              {stop.stopName || stop.locationName || `Điểm dừng #${stop.sequenceNo}`}
                            </span>
                            <Badge variant="outline" className="text-[10px]">
                              {STOP_TYPES[stop.stopType] || stop.stopType}
                            </Badge>
                            {isCurrent && (
                              <Badge className="bg-primary text-[10px]">Vị trí hiện tại</Badge>
                            )}
                          </div>
                          {(stop.actualArrivalTime || stop.plannedArrivalTime) && (
                            <p className="text-xs text-muted-foreground">
                              {stop.actualArrivalTime
                                ? `Thực tế: ${formatDateTime(stop.actualArrivalTime)}`
                                : `Dự kiến: ${formatDateTime(stop.plannedArrivalTime)}`}
                            </p>
                          )}
                          {stop.notes && <p className="text-xs text-muted-foreground">{stop.notes}</p>}
                        </div>
                      </li>
                    );
                  })}
                </ol>
              </div>

              <p className="border-t border-border/50 pt-3 text-[11px] text-muted-foreground">
                * Bản đồ lộ trình thể hiện sơ đồ tương đối các điểm dừng và mốc báo cáo thực địa; hệ thống không sử dụng định vị GPS trực tiếp.
              </p>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-6 text-center">
              <MapPin className="h-8 w-8 text-muted-foreground/50" />
              <p className="mt-2 text-sm font-medium">Chưa cấu hình các trạm dừng cố định cho kế hoạch này</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Tiến trình di chuyển sẽ được theo dõi qua các mốc cập nhật bên dưới.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Timeline chi tiết các sự kiện (Vị trí, Sức khỏe, Sự cố) */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Clock className="h-4 w-4" /> Nhật ký mốc hành trình & sự kiện
          </CardTitle>
          <CardDescription className="text-xs">
            Ghi nhận theo thứ tự thời gian các cập nhật vị trí, kiểm tra thể trạng và sự cố
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!entries || entries.length === 0 ? (
            <EmptyState
              title="Chưa có hoạt động hành trình"
              description="Vị trí, nhật ký sức khỏe và sự cố sẽ xuất hiện tại đây khi nhân sự phân công cập nhật."
            />
          ) : (
            <ol className="relative space-y-0 border-l border-border">
              {entries.map((entry) => {
                const Icon = eventIcons[entry.type];
                return (
                  <li key={`${entry.type}-${entry.eventId}`} className="relative pb-6 pl-6 last:pb-0">
                    <span className="absolute -left-[17px] top-0 flex h-8 w-8 items-center justify-center rounded-full border border-border bg-background text-primary">
                      <Icon className="h-4 w-4" aria-hidden="true" />
                    </span>
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium">{entry.title}</p>
                        <Badge variant={entry.sos ? "destructive" : "outline"}>{eventLabels[entry.type]}</Badge>
                        {entry.status && (
                          <Badge variant="secondary">
                            {entry.type === "INCIDENT" ? incidentStatusLabel(entry.status) : entry.status}
                          </Badge>
                        )}
                      </div>
                      <time className="block text-xs text-muted-foreground" dateTime={entry.timestamp}>
                        {formatDateTime(entry.timestamp)}
                      </time>
                      {entry.horseName && <p className="text-sm">Ngựa: {entry.horseName}</p>}
                      {entry.description && (
                        <p className="whitespace-pre-wrap text-sm text-muted-foreground">{entry.description}</p>
                      )}
                      {entry.latitude !== null && entry.longitude !== null && (
                        <p className="text-xs text-muted-foreground">
                          Tọa độ báo cáo: {entry.latitude}, {entry.longitude}
                        </p>
                      )}
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
