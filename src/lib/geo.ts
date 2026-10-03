// Geometry helpers: Web Mercator tiles, plot lengths/area, and the survey-sketch layout.

export type LatLng = [number, number];

const R = 6371008.8; // mean Earth radius in metres
const rad = (d: number) => (d * Math.PI) / 180;

/** Great-circle distance in metres. */
export function distance(a: LatLng, b: LatLng): number {
  const dLat = rad(b[0] - a[0]);
  const dLon = rad(b[1] - a[1]);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a[0])) * Math.cos(rad(b[0])) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** Side lengths in metres, side i running from vertex i to vertex i+1. */
export function sideLengths(poly: LatLng[]): number[] {
  if (poly.length < 2) return [];
  return poly.map((p, i) => distance(p, poly[(i + 1) % poly.length]));
}

/** Local east/north metres relative to the polygon's first vertex (accurate at plot scale). */
export function toLocalMetres(poly: LatLng[]): [number, number][] {
  if (!poly.length) return [];
  const [lat0, lon0] = poly[0];
  const kx = (Math.PI / 180) * R * Math.cos(rad(lat0));
  const ky = (Math.PI / 180) * R;
  return poly.map(([lat, lon]) => [(lon - lon0) * kx, (lat - lat0) * ky]);
}

/** Area in square metres (shoelace on local metres). */
export function area(poly: LatLng[]): number {
  if (poly.length < 3) return 0;
  const m = toLocalMetres(poly);
  let s = 0;
  for (let i = 0; i < m.length; i++) {
    const [x1, y1] = m[i];
    const [x2, y2] = m[(i + 1) % m.length];
    s += x1 * y2 - x2 * y1;
  }
  return Math.abs(s) / 2;
}

export function centroid(poly: LatLng[]): LatLng {
  const n = poly.length;
  return [poly.reduce((s, p) => s + p[0], 0) / n, poly.reduce((s, p) => s + p[1], 0) / n];
}

/** Compass direction (Arabic) a side faces, from the outward normal of that side. */
export function sideFacing(poly: LatLng[], i: number): string {
  const m = toLocalMetres(poly);
  const c: [number, number] = [m.reduce((s, p) => s + p[0], 0) / m.length, m.reduce((s, p) => s + p[1], 0) / m.length];
  const a = m[i];
  const b = m[(i + 1) % m.length];
  const mid: [number, number] = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  const ang = (Math.atan2(mid[0] - c[0], mid[1] - c[1]) * 180) / Math.PI; // 0 = north, clockwise
  const dirs = ["شمالي", "شمالي شرقي", "شرقي", "جنوبي شرقي", "جنوبي", "جنوبي غربي", "غربي", "شمالي غربي"];
  return dirs[Math.round(((ang + 360) % 360) / 45) % 8];
}

// ---- Web Mercator ------------------------------------------------------------

export const TILE = 256;

export function project(lat: number, lon: number, z: number): [number, number] {
  const n = TILE * 2 ** z;
  const x = ((lon + 180) / 360) * n;
  const s = Math.sin(rad(lat));
  const y = (0.5 - Math.log((1 + s) / (1 - s)) / (4 * Math.PI)) * n;
  return [x, y];
}

/** Largest zoom (<= max) where the polygon's bounding box fits inside `fill` of the frame. */
export function fitZoom(poly: LatLng[], width: number, height: number, fill = 0.45, max = 19): number {
  if (poly.length < 2) return 17;
  for (let z = max; z > 3; z--) {
    const pts = poly.map(([la, lo]) => project(la, lo, z));
    const w = Math.max(...pts.map((p) => p[0])) - Math.min(...pts.map((p) => p[0]));
    const h = Math.max(...pts.map((p) => p[1])) - Math.min(...pts.map((p) => p[1]));
    if (w <= width * fill && h <= height * fill) return z;
  }
  return 4;
}

// ---- survey sketch ---------------------------------------------------------

export type Sketch = {
  points: [number, number][]; // SVG coordinates
  northRotation: number; // degrees to rotate the north arrow
  centre: [number, number];
};

/** Lays the plot out so its first side is horizontal, scaled to fit width x height with padding. */
export function sketchLayout(poly: LatLng[], width: number, height: number, pad: number): Sketch | null {
  if (poly.length < 3) return null;
  // local metres with y pointing down (SVG)
  const m = toLocalMetres(poly).map(([x, y]) => [x, -y] as [number, number]);
  const ang = Math.atan2(m[1][1] - m[0][1], m[1][0] - m[0][0]);
  const cos = Math.cos(-ang);
  const sin = Math.sin(-ang);
  let pts = m.map(([x, y]) => [x * cos - y * sin, x * sin + y * cos] as [number, number]);
  // keep the first side on top
  const cy = pts.reduce((s, p) => s + p[1], 0) / pts.length;
  let flipped = false;
  if (pts[0][1] > cy) {
    pts = pts.map(([x, y]) => [-x, -y]);
    flipped = true;
  }
  const minX = Math.min(...pts.map((p) => p[0]));
  const minY = Math.min(...pts.map((p) => p[1]));
  pts = pts.map(([x, y]) => [x - minX, y - minY]);
  const spanX = Math.max(...pts.map((p) => p[0])) || 1;
  const spanY = Math.max(...pts.map((p) => p[1])) || 1;
  const k = Math.min((width - 2 * pad) / spanX, (height - 2 * pad) / spanY);
  const ox = (width - spanX * k) / 2;
  const oy = (height - spanY * k) / 2;
  const points = pts.map(([x, y]) => [ox + x * k, oy + y * k] as [number, number]);
  const centre: [number, number] = [
    points.reduce((s, p) => s + p[0], 0) / points.length,
    points.reduce((s, p) => s + p[1], 0) / points.length,
  ];
  const northRotation = (-ang * 180) / Math.PI + (flipped ? 180 : 0);
  return { points, northRotation, centre };
}
