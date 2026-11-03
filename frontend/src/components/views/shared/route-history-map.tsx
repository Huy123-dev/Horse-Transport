import { useEffect, useState } from "react";
import { apiGet } from "@/lib/api-client";
import { STOP_TYPES, formatDateTime } from "@/lib/constants";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState, LoadingState } from "@/components/app/empty-state";
import { MapPin, Route } from "lucide-react";

interface RouteStop {
  stopId: string;
  sequenceNo: number;
  locationName: string | null;
  stopName: string | null;
  stopType: string;
  plannedArrivalTime: string | null;
}

interface TrackingRecord {
  logId: string;
  milestone: string | null;
  latitude: number;
  longitude: number;
  reportedAt: string;
}

interface RouteHistoryMapProps {
  planId: string;
  origin: string;
  destination: string;
}

interface RouteHistoryState {
  planId: string;
  stops: RouteStop[];
  tracking: TrackingRecord[];
  stopError: string;
  trackingError: string;
}

export function RouteHistoryMap({ planId, origin, destination }: RouteHistoryMapProps) {
  const [state, setState] = useState<RouteHistoryState | null>(null);

  useEffect(() => {
    let active = true;
    void Promise.allSettled([
      apiGet<RouteStop[]>(`/transport-plans/${planId}/stops`),
      apiGet<TrackingRecord[]>(`/transport-plans/${planId}/tracking`),
    ]).then(([stopsResult, trackingResult]) => {
      if (!active) return;
      setState({
        planId,
        stops: stopsResult.status === "fulfilled" ? stopsResult.value : [],
        tracking: trackingResult.status === "fulfilled" ? trackingResult.value : [],
        stopError: stopsResult.status === "rejected"
          ? stopsResult.reason instanceof Error ? stopsResult.reason.message : "Không thể tải điểm dừng."
          : "",
        trackingError: trackingResult.status === "rejected"
          ? trackingResult.reason instanceof Error ? trackingResult.reason.message : "Không thể tải vị trí."
          : "",
      });
    });
    return () => { active = false; };
  }, [planId]);

  const currentState = state?.planId === planId ? state : null;
  const loading = currentState === null;
  const stops = currentState?.stops ?? [];
  const tracking = currentState?.tracking ?? [];
  const stopError = currentState?.stopError ?? "";
  const trackingError = currentState?.trackingError ?? "";
  const orderedTracking = [...tracking].sort((left, right) => left.reportedAt.localeCompare(right.reportedAt));
  const points = projectCoordinates(orderedTracking);
  const stopList = [...stops].sort((left, right) => left.sequenceNo - right.sequenceNo);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Route className="h-4 w-4" /> Lộ trình và nhật ký vị trí
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-xs text-muted-foreground">Sơ đồ tọa độ GPS theo tỷ lệ tương đối, không phải bản đồ đường đi.</p>
        {loading ? <LoadingState /> : (
          <>
            {trackingError && <p role="alert" className="text-sm text-destructive">{trackingError}</p>}
            {points.length > 0 ? (
              <div className="overflow-hidden rounded-lg border border-border bg-muted/30 p-2">
                <svg viewBox="0 0 480 220" role="img" aria-label="Sơ đồ tương đối các vị trí GPS đã ghi nhận" className="h-48 w-full">
                  <path d="M20 55H460 M20 110H460 M20 165H460 M120 15V205 M240 15V205 M360 15V205" stroke="currentColor" strokeOpacity="0.08" strokeDasharray="4 6" />
                  {points.length > 1 && (
                    <polyline
                      points={points.map((point) => `${point.x},${point.y}`).join(" ")}
                      fill="none"
                      stroke="var(--primary)"
                      strokeWidth="4"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  )}
                  {points.map((point, index) => (
                    <g key={point.logId}>
                      <circle cx={point.x} cy={point.y} r={index === points.length - 1 ? 8 : 5} fill={index === points.length - 1 ? "var(--destructive)" : "var(--primary)"} stroke="var(--background)" strokeWidth="3" />
                    </g>
                  ))}
                </svg>
              </div>
            ) : (
              <EmptyState icon={<MapPin className="h-5 w-5" />} title="Chưa có vị trí GPS" description="Vị trí sẽ xuất hiện sau khi nhân viên ghi nhận trên chuyến." />
            )}
            {orderedTracking.length > 0 && (
              <ol className="space-y-2">
                {orderedTracking.map((entry, index) => (
                  <li key={entry.logId} className="flex items-start gap-3 rounded-lg border border-border p-3">
                    <span className={`mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white ${index === orderedTracking.length - 1 ? "bg-destructive" : "bg-primary"}`}>
                      {index + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">{entry.milestone || "Vị trí được ghi nhận"}</p>
                      <p className="text-xs text-muted-foreground">{entry.latitude}, {entry.longitude} · {formatDateTime(entry.reportedAt)}</p>
                    </div>
                  </li>
                ))}
              </ol>
            )}
            <div className="rounded-lg border border-border p-3">
              <div className="mb-2 flex items-center gap-2 text-sm font-medium"><MapPin className="h-4 w-4 text-primary" /> Điểm hành trình</div>
              {stopError && <p role="alert" className="mb-2 text-sm text-destructive">{stopError}</p>}
              <ol className="space-y-2">
                <li className="flex items-center gap-2 text-sm"><span className="h-2 w-2 rounded-full bg-primary" />{origin}</li>
                {stopList.map((stop) => (
                  <li key={stop.stopId} className="ml-1 flex items-start gap-3 border-l border-dashed border-primary/40 pl-4 text-sm">
                    <span className="ml-[-21px] mt-1 h-2 w-2 rounded-full border border-primary bg-background" />
                    <span>{stop.locationName || stop.stopName || "Điểm dừng"} <span className="text-xs text-muted-foreground">· {STOP_TYPES[stop.stopType] || stop.stopType}{stop.plannedArrivalTime ? ` · ${formatDateTime(stop.plannedArrivalTime)}` : ""}</span></span>
                  </li>
                ))}
                <li className="flex items-center gap-2 text-sm"><span className="h-2 w-2 rounded-full bg-[var(--success)]" />{destination}</li>
              </ol>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function projectCoordinates(records: TrackingRecord[]) {
  if (records.length === 0) return [];
  const latitudes = records.map((record) => record.latitude);
  const longitudes = records.map((record) => record.longitude);
  const minLatitude = Math.min(...latitudes);
  const maxLatitude = Math.max(...latitudes);
  const minLongitude = Math.min(...longitudes);
  const maxLongitude = Math.max(...longitudes);
  const latitudeRange = maxLatitude - minLatitude || 1;
  const longitudeRange = maxLongitude - minLongitude || 1;
  const padding = 24;
  const width = 480 - padding * 2;
  const height = 220 - padding * 2;

  return records.map((record) => ({
    logId: record.logId,
    x: padding + ((record.longitude - minLongitude) / longitudeRange) * width,
    y: 220 - padding - ((record.latitude - minLatitude) / latitudeRange) * height,
  }));
}
