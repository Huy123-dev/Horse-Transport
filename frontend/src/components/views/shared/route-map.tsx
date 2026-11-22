import { useEffect, useMemo, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { MapPin, Route as RouteIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  type LatLngPoint,
  greatCirclePath,
  haversineKm,
  nearestOnPath,
  samplePath,
} from "@/lib/route-geometry";
import {
  type GeoapifyPlace,
  type SuggestedStop,
  cumulativeKm,
  fetchGeoapifyPlaces,
  selectGeoapifyStops,
  stopTypeForLocation,
} from "@/lib/route-stops";

export interface MapLocation {
  locationId: string;
  name: string;
  type?: string | null;
  countryCode?: string | null;
  latitude: number | string;
  longitude: number | string;
}

interface RouteMapProps {
  origin: MapLocation | null;
  destination: MapLocation | null;
  /** Toàn bộ địa điểm hệ thống đã biết; những điểm nằm gần tuyến sẽ được hiển thị là điểm dừng. */
  candidates: MapLocation[];
  /** Khoảng cách tối đa (km) từ địa điểm tới tuyến để được tính là điểm dừng dọc đường. */
  corridorKm?: number;
  height?: number;
  /** Tìm điểm dừng thực tế bằng Geoapify. Mặc định bật. */
  includeGeoapifyPlaces?: boolean;
  /** Được gọi mỗi khi danh sách điểm dừng gợi ý thay đổi; loading = true khi tuyến hoặc dữ liệu OSM còn đang tải. */
  onStopsChange?: (stops: SuggestedStop[], meta: { loading: boolean }) => void;
}

export type { SuggestedStop };

interface PlaceState {
  status: "idle" | "loading" | "ready" | "error";
  places: GeoapifyPlace[];
  message: string;
  warning: string;
}

const NO_PLACES: PlaceState = { status: "idle", places: [], message: "", warning: "" };

interface RouteInfo {
  path: LatLngPoint[];
  distanceKm: number | null;
  durationHours: number | null;
  /** true: đường bộ do OSRM tính; false: đường bay/đường thẳng vì không có đường bộ. */
  driving: boolean;
}

const OSRM_URL = "https://router.project-osrm.org/route/v1/driving";
/** Tối đa (km) từ điểm đã chọn tới con đường gần nhất mà OSRM được phép "hút" vào; xa hơn thì coi như không có đường bộ. */
const MAX_SNAP_KM = 5;

const toPoint = (location: MapLocation): LatLngPoint => ({
  lat: Number(location.latitude),
  lng: Number(location.longitude),
});

const isValid = (location: MapLocation | null): location is MapLocation =>
  Boolean(location) && Number.isFinite(Number(location!.latitude)) && Number.isFinite(Number(location!.longitude));

function pin(label: string, color: string) {
  return L.divIcon({
    className: "",
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    html: `<div style="width:28px;height:28px;border-radius:9999px;background:${color};color:#fff;border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.5);display:flex;align-items:center;justify-content:center;font:700 12px sans-serif">${label}</div>`,
  });
}

export function RouteMap({
  origin,
  destination,
  candidates,
  corridorKm = 60,
  height = 340,
  includeGeoapifyPlaces = true,
  onStopsChange,
}: RouteMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const onStopsChangeRef = useRef(onStopsChange);
  const [route, setRoute] = useState<RouteInfo | null>(null);
  const [routeSettled, setRouteSettled] = useState(false);
  const [placeSearch, setPlaceSearch] = useState<PlaceState>(NO_PLACES);
  const [placeSearchRetry, setPlaceSearchRetry] = useState(0);

  const validOrigin = isValid(origin) ? origin : null;
  const validDestination = isValid(destination) ? destination : null;
  const hasRoute = Boolean(validOrigin && validDestination && validOrigin.locationId !== validDestination.locationId);
  const originKey = validOrigin?.locationId ?? "";
  const destinationKey = validDestination?.locationId ?? "";

  // 1. Tính tuyến: ưu tiên đường bộ (OSRM), nếu không có thì dùng đường thẳng great-circle.
  useEffect(() => {
    if (!hasRoute || !validOrigin || !validDestination) {
      setRoute(null);
      return;
    }
    const from = toPoint(validOrigin);
    const to = toPoint(validDestination);
    setRoute({ path: greatCirclePath(from, to), distanceKm: null, durationHours: null, driving: false });
    setRouteSettled(false);

    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), 8000);
    void (async () => {
      try {
        const response = await fetch(
          `${OSRM_URL}/${from.lng},${from.lat};${to.lng},${to.lat}?overview=full&geometries=geojson&radiuses=${MAX_SNAP_KM * 1000};${MAX_SNAP_KM * 1000}`,
          { signal: controller.signal },
        );
        if (!response.ok) return;
        const data = (await response.json()) as {
          code: string;
          routes?: Array<{ distance: number; duration: number; geometry: { coordinates: Array<[number, number]> } }>;
          waypoints?: Array<{ distance: number }>;
        };
        const best = data.code === "Ok" ? data.routes?.[0] : undefined;
        if (!best || best.geometry.coordinates.length < 2) return;
        // OSRM có thể "hút" điểm đầu/cuối sang con đường rất xa (khác đảo, khác nước) rồi vẫn trả về tuyến.
        // Chỉ chấp nhận khi tuyến thật sự bắt đầu và kết thúc gần hai điểm đã chọn.
        const first = best.geometry.coordinates[0];
        const last = best.geometry.coordinates[best.geometry.coordinates.length - 1];
        const snappedFar = (data.waypoints ?? []).some((w) => w.distance > MAX_SNAP_KM * 1000);
        const endsFar =
          haversineKm(from, { lat: first[1], lng: first[0] }) > MAX_SNAP_KM ||
          haversineKm(to, { lat: last[1], lng: last[0] }) > MAX_SNAP_KM;
        if (snappedFar || endsFar) return;
        setRoute({
          path: best.geometry.coordinates.map(([lng, lat]) => ({ lat, lng })),
          distanceKm: best.distance / 1000,
          durationHours: best.duration / 3600,
          driving: true,
        });
      } catch {
        // Không có đường bộ, hết thời gian chờ hoặc mất mạng: giữ đường thẳng.
      } finally {
        window.clearTimeout(timer);
        if (!controller.signal.aborted) setRouteSettled(true);
      }
    })();
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [hasRoute, originKey, destinationKey]);

  // 2. Tìm điểm dừng thật bằng Geoapify Places (chỉ khi có đường bộ).
  useEffect(() => {
    if (!includeGeoapifyPlaces || !route?.driving || !hasRoute) {
      setPlaceSearch(NO_PLACES);
      return;
    }
    const controller = new AbortController();
    let cancelled = false;
    setPlaceSearch({ ...NO_PLACES, status: "loading" });
    fetchGeoapifyPlaces(route.path, `${originKey}>${destinationKey}`, controller.signal, (places) => {
      if (!cancelled) setPlaceSearch((current) => ({ ...current, places }));
    })
      .then((result) => {
        if (cancelled) return;
        const warnings = [
          result.mode === "rare" ? "Tuyến dài nên chỉ tìm cửa khẩu, sân bay và thú y." : "",
        ].filter(Boolean);
        setPlaceSearch({ status: "ready", places: result.places, message: "", warning: warnings.join(" ") });
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setPlaceSearch({
          ...NO_PLACES,
          status: "error",
          message: error instanceof Error ? error.message : "Không tải được điểm dừng từ Geoapify.",
        });
      });
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [includeGeoapifyPlaces, route, hasRoute, originKey, destinationKey, placeSearchRetry]);

  // 3. Điểm dừng gợi ý: địa điểm hệ thống + Geoapify, xếp theo thứ tự dọc tuyến.
  const stops = useMemo<SuggestedStop[]>(() => {
    if (!hasRoute || !route || !validOrigin || !validDestination) return [];
    const sampled = samplePath(route.path);
    const cum = cumulativeKm(sampled);
    const system: SuggestedStop[] = candidates
      .filter((c) => isValid(c) && c.locationId !== validOrigin.locationId && c.locationId !== validDestination.locationId)
      .map((location) => {
        const point = toPoint(location);
        const nearest = nearestOnPath(point, sampled);
        return {
          key: `system:${location.locationId}`,
          name: location.name,
          source: "system" as const,
          locationId: location.locationId,
          stopType: stopTypeForLocation(location.type),
          label: [location.type, location.countryCode].filter(Boolean).join(" · ") || "Địa điểm hệ thống",
          point,
          alongKm: cum[nearest.index],
          offRouteKm: nearest.distanceKm,
        };
      })
      .filter((stop) => stop.offRouteKm <= corridorKm);
    const fromGeoapify =
      placeSearch.places.length > 0
        ? selectGeoapifyStops(placeSearch.places, sampled, system.map((stop) => stop.point))
        : [];
    return [...system, ...fromGeoapify].sort((a, b) => a.alongKm - b.alongKm);
  }, [hasRoute, route, candidates, corridorKm, placeSearch, originKey, destinationKey]);

  const loading = hasRoute && (!routeSettled || placeSearch.status === "loading");

  useEffect(() => {
    onStopsChangeRef.current = onStopsChange;
  });
  useEffect(() => {
    onStopsChangeRef.current?.(stops, { loading });
  }, [stops, loading]);

  // 3. Vẽ bản đồ Leaflet (tạo lại mỗi khi tuyến hoặc điểm dừng thay đổi, dọn dẹp khi gỡ).
  useEffect(() => {
    const container = containerRef.current;
    if (!container || !hasRoute || !route || !validOrigin || !validDestination) return;

    const map = L.map(container, { scrollWheelZoom: false });
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map);

    const latLngs = route.path.map((p) => L.latLng(p.lat, p.lng));
    const line = L.polyline(latLngs, {
      color: "#d97706",
      weight: 5,
      opacity: 0.95,
      dashArray: route.driving ? undefined : "8 10",
    }).addTo(map);

    const add = (point: LatLngPoint, title: string, label: string, color: string) =>
      L.marker([point.lat, point.lng], { icon: pin(label, color), title }).addTo(map).bindTooltip(title);

    add(toPoint(validOrigin), `Điểm đi: ${validOrigin.name}`, "A", "#16a34a");
    stops.forEach((stop, index) =>
      add(stop.point, `Điểm dừng ${index + 1}: ${stop.name} (${stop.label})`, String(index + 1), stop.source === "geoapify" ? "#7c3aed" : "#2563eb"),
    );
    add(toPoint(validDestination), `Điểm đến: ${validDestination.name}`, "B", "#dc2626");

    const bounds = line.getBounds();
    stops.forEach((stop) => bounds.extend([stop.point.lat, stop.point.lng]));
    map.fitBounds(bounds, { padding: [40, 40] });
    // Sửa kích thước khi khung chứa vừa hiện ra.
    const resizeTimer = window.setTimeout(() => map.invalidateSize(), 0);

    return () => {
      window.clearTimeout(resizeTimer);
      map.remove();
    };
  }, [hasRoute, route, stops, originKey, destinationKey]);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <RouteIcon className="h-4 w-4 text-primary" /> Bản đồ tuyến vận chuyển
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!hasRoute ? (
          <p className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            Chọn điểm đi và điểm đến (khác nhau) để xem tuyến đường và các điểm dừng trên bản đồ.
          </p>
        ) : (
          <>
            <div
              ref={containerRef}
              role="application"
              aria-label="Bản đồ tuyến vận chuyển"
              style={{ height, zIndex: 0 }}
              className="relative w-full overflow-hidden rounded-lg border border-border bg-muted/30"
            />

            {route && (
              <p className="text-xs text-muted-foreground">
                {route.driving
                  ? `Đường bộ: ${route.distanceKm != null ? `${route.distanceKm.toFixed(0)} km` : "—"}${route.durationHours != null ? ` · khoảng ${route.durationHours.toFixed(1)} giờ` : ""}.`
                  : "Không có đường bộ giữa hai điểm này nên bản đồ hiển thị đường bay/đường thẳng (nét đứt)."}
              </p>
            )}

            <ol className="space-y-2" aria-label="Danh sách điểm dừng trên tuyến">
              <li className="flex items-center gap-3 text-sm">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#16a34a] text-xs font-bold text-white">A</span>
                <span className="font-medium">{validOrigin?.name}</span>
              </li>
              {stops.map((stop, index) => (
                <li key={stop.key} className="flex items-start gap-3 text-sm">
                  <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white ${stop.source === "geoapify" ? "bg-[#7c3aed]" : "bg-[#2563eb]"}`}>{index + 1}</span>
                  <span>
                    {stop.name}
                    <span className="ml-1 text-xs text-muted-foreground">
                      {stop.label}
                      {` · km ${Math.round(stop.alongKm)} · cách tuyến ~${Math.round(stop.offRouteKm)} km`}
                      {stop.source === "geoapify" ? " · Geoapify/OSM" : ""}
                    </span>
                  </span>
                </li>
              ))}
              <li className="flex items-center gap-3 text-sm">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#dc2626] text-xs font-bold text-white">B</span>
                <span className="font-medium">{validDestination?.name}</span>
              </li>
            </ol>
            {includeGeoapifyPlaces && route?.driving && placeSearch.status === "loading" && (
              <p className="text-xs text-muted-foreground">Đang tìm điểm dừng thật dọc tuyến…</p>
            )}
            {includeGeoapifyPlaces && placeSearch.status === "ready" && placeSearch.warning && (
              <p className="text-xs text-muted-foreground">{placeSearch.warning}</p>
            )}
            {includeGeoapifyPlaces && placeSearch.status === "error" && (
              <p role="alert" className="text-xs text-destructive">
                {placeSearch.message} Hiện vẫn có thể dùng địa điểm trong hệ thống.{" "}
                <button type="button" className="underline" onClick={() => setPlaceSearchRetry((n) => n + 1)}>Thử lại</button>
              </p>
            )}
            {includeGeoapifyPlaces && route && !route.driving && routeSettled && (
              <p className="text-xs text-muted-foreground">Tuyến bay: chỉ dùng địa điểm trong hệ thống (không tìm điểm dừng dọc đường bay).</p>
            )}
            {stops.length === 0 && !loading && (
              <p className="flex items-center gap-2 text-xs text-muted-foreground">
                <MapPin className="h-3.5 w-3.5" /> Không tìm thấy điểm dừng nào trong {corridorKm} km quanh tuyến này.
              </p>
            )}
            <p className="text-[11px] text-muted-foreground">
              Bản đồ © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer" className="underline">OpenStreetMap contributors</a>
              {" · "}điểm dừng: <a href="https://www.geoapify.com/" target="_blank" rel="noreferrer" className="underline">Geoapify</a>/OSM · tuyến đường: OSRM.
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
}
