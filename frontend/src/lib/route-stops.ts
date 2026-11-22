import { api } from "@/lib/api-client";
import { type LatLngPoint, nearestOnPath, samplePath } from "@/lib/route-geometry";

/** Điểm dừng gợi ý dọc tuyến, từ danh mục hệ thống hoặc Geoapify Places. */
export interface SuggestedStop {
  key: string;
  name: string;
  source: "system" | "geoapify";
  /** Chỉ có với địa điểm trong hệ thống; điểm bản đồ không có locationId. */
  locationId: string | null;
  /** Một trong: ORIGIN | TRANSIT | CUSTOMS | QUARANTINE | REST | REFUEL | DESTINATION. */
  stopType: string;
  /** Nhãn hiển thị cho người dùng, ví dụ "Trạm xăng". */
  label: string;
  point: LatLngPoint;
  /** Vị trí (km) tính từ điểm đi dọc theo tuyến. */
  alongKm: number;
  offRouteKm: number;
}

/** Suy ra loại điểm dừng từ loại địa điểm trong danh mục hệ thống. */
export function stopTypeForLocation(type?: string | null): string {
  const normalized = (type ?? "").toUpperCase();
  if (normalized.includes("KIEM DICH") || normalized.includes("KIỂM DỊCH")) return "QUARANTINE";
  if (normalized.includes("CHUONG NGUA") || normalized.includes("CHUỒNG NGỰA")) return "REST";
  return "TRANSIT";
}

export type PlaceCategory = "border" | "airport" | "vet" | "boarding" | "rest" | "fuel";

export interface GeoapifyPlace {
  id: string;
  name: string;
  category: PlaceCategory;
  point: LatLngPoint;
}

interface CategoryConfig {
  stopType: string;
  label: string;
  gapKm: number;
  max: number;
}

const CATEGORIES: Record<PlaceCategory, CategoryConfig> = {
  border: { stopType: "CUSTOMS", label: "Cửa khẩu / hải quan", gapKm: 0, max: 6 },
  airport: { stopType: "TRANSIT", label: "Sân bay", gapKm: 0, max: 4 },
  vet: { stopType: "REST", label: "Phòng khám thú y", gapKm: 150, max: 4 },
  boarding: { stopType: "REST", label: "Nơi lưu trú động vật", gapKm: 150, max: 4 },
  rest: { stopType: "REST", label: "Khu nghỉ dọc đường", gapKm: 100, max: 5 },
  fuel: { stopType: "REFUEL", label: "Trạm xăng", gapKm: 100, max: 5 },
};

export const MAX_SUGGESTED_STOPS = 14;
const FULL_MAX_KM = 1200;
const RARE_MAX_KM = 4000;
const MIN_GAP_ANY_KM = 25;
const END_MARGIN_KM = 5;
const SYSTEM_DUPLICATE_KM = 3;

export interface PlaceSearchResult {
  places: GeoapifyPlace[];
  mode: "full" | "rare";
}

interface PlaceSearchResponse {
  places: Array<{
    id: string;
    name: string;
    category: string;
    lat: number;
    lng: number;
  }>;
  mode: "full" | "rare";
}

const cache = new Map<string, PlaceSearchResult>();

function haversineKm(a: LatLngPoint, b: LatLngPoint): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Quãng đường tích lũy (km) tại từng điểm của path. */
export function cumulativeKm(path: LatLngPoint[]): number[] {
  const result = [0];
  for (let i = 1; i < path.length; i += 1) result.push(result[i - 1] + haversineKm(path[i - 1], path[i]));
  return result;
}

function isPlaceCategory(category: string): category is PlaceCategory {
  return Object.prototype.hasOwnProperty.call(CATEGORIES, category);
}

/** Tìm điểm dừng thật dọc tuyến trong một yêu cầu Geoapify Places. */
export async function fetchGeoapifyPlaces(
  path: LatLngPoint[],
  cacheKey: string,
  signal: AbortSignal,
  onProgress?: (places: GeoapifyPlace[]) => void,
): Promise<PlaceSearchResult> {
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  const totalKm = cumulativeKm(path).at(-1) ?? 0;
  if (totalKm > RARE_MAX_KM) {
    throw new Error(`Tuyến dài ~${Math.round(totalKm)} km, quá dài để tự động tìm điểm dừng.`);
  }
  const mode = totalKm <= FULL_MAX_KM ? "full" : "rare";
  const response = await api<PlaceSearchResponse>("/route-places", {
    method: "POST",
    body: JSON.stringify({ path: samplePath(path, 600), mode: mode.toUpperCase() }),
    signal,
  });
  if (!response || !Array.isArray(response.places)) {
    throw new Error("Geoapify trả về danh sách điểm dừng không hợp lệ.");
  }

  const places = response.places.map((place) => {
    if (
      typeof place.id !== "string" ||
      typeof place.name !== "string" ||
      !isPlaceCategory(place.category) ||
      !Number.isFinite(place.lat) ||
      !Number.isFinite(place.lng)
    ) {
      throw new Error("Geoapify trả về một điểm dừng không hợp lệ.");
    }
    return {
      id: place.id,
      name: place.name,
      category: place.category,
      point: { lat: place.lat, lng: place.lng },
    };
  });
  const result: PlaceSearchResult = { places, mode };
  cache.set(cacheKey, result);
  onProgress?.(places);
  return result;
}

/**
 * Chọn điểm thật theo loại và khoảng cách; ưu tiên cửa khẩu, sân bay và thú y,
 * đồng thời tránh dồn các điểm dịch vụ vào cùng một đoạn.
 */
export function selectGeoapifyStops(
  places: GeoapifyPlace[],
  sampledPath: LatLngPoint[],
  systemPoints: LatLngPoint[],
): SuggestedStop[] {
  if (sampledPath.length < 2) return [];
  const cum = cumulativeKm(sampledPath);
  const totalKm = cum[cum.length - 1];
  const order = Object.keys(CATEGORIES) as PlaceCategory[];

  const candidates = places
    .map((place) => {
      const nearest = nearestOnPath(place.point, sampledPath);
      return { place, alongKm: cum[nearest.index], offRouteKm: nearest.distanceKm };
    })
    .filter((candidate) => candidate.alongKm >= END_MARGIN_KM && candidate.alongKm <= totalKm - END_MARGIN_KM)
    .filter((candidate) => !systemPoints.some((point) => haversineKm(point, candidate.place.point) <= SYSTEM_DUPLICATE_KM))
    .sort((a, b) => order.indexOf(a.place.category) - order.indexOf(b.place.category) || a.offRouteKm - b.offRouteKm);

  const accepted: typeof candidates = [];
  const countByCategory: Partial<Record<PlaceCategory, number>> = {};
  for (const candidate of candidates) {
    if (accepted.length >= MAX_SUGGESTED_STOPS) break;
    const config = CATEGORIES[candidate.place.category];
    if ((countByCategory[candidate.place.category] ?? 0) >= config.max) continue;
    const tooCloseSameCategory =
      config.gapKm > 0 &&
      accepted.some(
        (acceptedCandidate) =>
          acceptedCandidate.place.category === candidate.place.category &&
          Math.abs(acceptedCandidate.alongKm - candidate.alongKm) < config.gapKm,
      );
    if (tooCloseSameCategory) continue;
    const isService = ["vet", "boarding", "rest", "fuel"].includes(candidate.place.category);
    const tooCloseAny =
      isService &&
      accepted.some(
        (acceptedCandidate) =>
          ["vet", "boarding", "rest", "fuel"].includes(acceptedCandidate.place.category) &&
          Math.abs(acceptedCandidate.alongKm - candidate.alongKm) < MIN_GAP_ANY_KM,
      );
    if (tooCloseAny) continue;
    accepted.push(candidate);
    countByCategory[candidate.place.category] = (countByCategory[candidate.place.category] ?? 0) + 1;
  }

  return accepted
    .sort((a, b) => a.alongKm - b.alongKm)
    .map(({ place, alongKm, offRouteKm }) => ({
      key: `geoapify:${place.id}`,
      name: place.name,
      source: "geoapify" as const,
      locationId: null,
      stopType: CATEGORIES[place.category].stopType,
      label: CATEGORIES[place.category].label,
      point: place.point,
      alongKm,
      offRouteKm,
    }));
}
