export interface LatLngPoint {
  lat: number;
  lng: number;
}

const EARTH_RADIUS_KM = 6371;
const toRad = (deg: number) => (deg * Math.PI) / 180;
const toDeg = (rad: number) => (rad * 180) / Math.PI;

export function haversineKm(a: LatLngPoint, b: LatLngPoint): number {
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Nội suy đường cầu (great-circle) giữa hai điểm, gồm cả hai đầu mút. */
export function greatCirclePath(a: LatLngPoint, b: LatLngPoint, segments = 120): LatLngPoint[] {
  const lat1 = toRad(a.lat);
  const lng1 = toRad(a.lng);
  const lat2 = toRad(b.lat);
  const lng2 = toRad(b.lng);
  const d =
    2 *
    Math.asin(
      Math.sqrt(
        Math.sin((lat2 - lat1) / 2) ** 2 +
          Math.cos(lat1) * Math.cos(lat2) * Math.sin((lng2 - lng1) / 2) ** 2,
      ),
    );
  if (d === 0) return [a, b];
  const points: LatLngPoint[] = [];
  for (let i = 0; i <= segments; i += 1) {
    const f = i / segments;
    const A = Math.sin((1 - f) * d) / Math.sin(d);
    const B = Math.sin(f * d) / Math.sin(d);
    const x = A * Math.cos(lat1) * Math.cos(lng1) + B * Math.cos(lat2) * Math.cos(lng2);
    const y = A * Math.cos(lat1) * Math.sin(lng1) + B * Math.cos(lat2) * Math.sin(lng2);
    const z = A * Math.sin(lat1) + B * Math.sin(lat2);
    points.push({ lat: toDeg(Math.atan2(z, Math.sqrt(x * x + y * y))), lng: toDeg(Math.atan2(y, x)) });
  }
  return points;
}

export interface NearestOnPath {
  index: number;
  distanceKm: number;
}

/** Điểm gần nhất trên đường đi (theo các mẫu của path). */
export function nearestOnPath(point: LatLngPoint, path: LatLngPoint[]): NearestOnPath {
  let best: NearestOnPath = { index: 0, distanceKm: Number.POSITIVE_INFINITY };
  for (let i = 0; i < path.length; i += 1) {
    const distanceKm = haversineKm(point, path[i]);
    if (distanceKm < best.distanceKm) best = { index: i, distanceKm };
  }
  return best;
}

/** Giảm số điểm của path để việc tính khoảng cách nhẹ hơn (giữ lại đầu và cuối). */
export function samplePath(path: LatLngPoint[], maxPoints = 600): LatLngPoint[] {
  const targetCount = Math.floor(maxPoints);
  if (targetCount < 1) return [];
  if (path.length <= targetCount) return path;
  if (targetCount === 1) return [path[0]];

  const sampled: LatLngPoint[] = [];
  const step = (path.length - 1) / (targetCount - 1);
  for (let i = 0; i < targetCount; i += 1) sampled.push(path[Math.round(i * step)]);
  return sampled;
}
