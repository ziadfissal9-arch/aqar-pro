import "server-only";
import { distance, type LatLng } from "./geo";
import type { Distance, Landmark, Street } from "./types";

const UA = { "User-Agent": "aqar-pro/1.0 (real-estate marketing files)" };

/** Driving distance and time from the property to each landmark (OSRM), with a straight-line fallback. */
export async function drivingDistances(from: LatLng, marks: Landmark[]): Promise<Distance[]> {
  const straight = marks.map((m) => distance(from, [m.lat, m.lon]) / 1000);
  if (!marks.length) return [];
  const coords = [[from[1], from[0]], ...marks.map((m) => [m.lon, m.lat])].map((c) => c.join(",")).join(";");
  try {
    const res = await fetch(`https://router.project-osrm.org/table/v1/driving/${coords}?sources=0&annotations=distance,duration`, { headers: UA, signal: AbortSignal.timeout(12000) });
    const data = (await res.json()) as { code: string; distances: number[][]; durations: number[][] };
    if (data.code !== "Ok") throw new Error(data.code);
    return marks.map((m, i) => ({
      name: m.name,
      lat: m.lat,
      lon: m.lon,
      km: Math.round((data.distances[0][i + 1] / 1000) * 10) / 10,
      // OSRM free-flow times are optimistic in city traffic; add 15% for a realistic estimate.
      minutes: Math.max(1, Math.round((data.durations[0][i + 1] / 60) * 1.15)),
      straightKm: Math.round(straight[i] * 10) / 10,
    }));
  } catch {
    return marks.map((m, i) => ({
      name: m.name,
      lat: m.lat,
      lon: m.lon,
      km: Math.round(straight[i] * 1.3 * 10) / 10,
      minutes: Math.max(1, Math.round(((straight[i] * 1.3) / 45) * 60)),
      straightKm: Math.round(straight[i] * 10) / 10,
    }));
  }
}

const MAJOR = new Set(["motorway", "trunk", "primary", "secondary", "tertiary", "motorway_link", "trunk_link", "primary_link"]);
const ROADS = new Set([...MAJOR, "residential", "unclassified", "living_street", "service"]);

/** Named streets inside a small box around the plot, from the OpenStreetMap API. */
export async function streetsAround(centre: LatLng, radiusM = 380): Promise<Street[]> {
  const dLat = radiusM / 111320;
  const dLon = radiusM / (111320 * Math.cos((centre[0] * Math.PI) / 180));
  const bbox = [centre[1] - dLon, centre[0] - dLat, centre[1] + dLon, centre[0] + dLat].map((v) => v.toFixed(6)).join(",");
  const res = await fetch(`https://api.openstreetmap.org/api/0.6/map.json?bbox=${bbox}`, { headers: UA, signal: AbortSignal.timeout(20000) });
  if (!res.ok) throw new Error(`osm ${res.status}`);
  const data = (await res.json()) as { elements: { type: string; id: number; lat?: number; lon?: number; nodes?: number[]; tags?: Record<string, string> }[] };
  const nodes = new Map<number, LatLng>();
  for (const e of data.elements) if (e.type === "node" && e.lat != null && e.lon != null) nodes.set(e.id, [e.lat, e.lon]);
  const out: Street[] = [];
  for (const e of data.elements) {
    if (e.type !== "way" || !e.tags?.highway || !ROADS.has(e.tags.highway)) continue;
    const name = (e.tags["name:ar"] || e.tags.name || "").replace(/^No\.\s*/i, "رقم ").trim();
    if (!name) continue;
    const coords = (e.nodes ?? []).map((n) => nodes.get(n)).filter(Boolean) as LatLng[];
    if (coords.length >= 2) out.push({ name, major: MAJOR.has(e.tags.highway), coords });
  }
  return out;
}
