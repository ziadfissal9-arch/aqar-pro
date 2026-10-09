import type { Comparable } from "./types";

/** Validates a comparable sent from the browser; returns an Arabic error message on failure. */
export function parseComparable(raw: unknown): Omit<Comparable, "id"> | string {
  if (!raw || typeof raw !== "object") return "بيانات غير صالحة";
  const r = raw as Record<string, unknown>;
  const category = r.category;
  if (category !== "land" && category !== "building" && category !== "rent") return "اختر نوع المقارنة";
  const area = Number(r.area);
  const price = Number(r.price);
  if (!(area > 0)) return "أدخل المساحة";
  if (!(price > 0)) return "أدخل السعر";
  const str = (v: unknown, max = 200) => (typeof v === "string" ? v.trim().slice(0, max) : "");
  return {
    category,
    dealType: r.dealType === "offer" ? "offer" : "deal",
    city: str(r.city, 60),
    district: str(r.district, 60),
    description: str(r.description, 300),
    area,
    price,
    date: str(r.date, 20),
    source: str(r.source, 120),
  };
}

export const priceM2 = (c: Pick<Comparable, "area" | "price">) => (c.area > 0 ? c.price / c.area : 0);

/** Average and median price per m² for a group of comparables. */
export function stats(list: Comparable[]) {
  const v = list.map(priceM2).filter((x) => x > 0).sort((a, b) => a - b);
  if (!v.length) return null;
  const avg = v.reduce((s, x) => s + x, 0) / v.length;
  const mid = Math.floor(v.length / 2);
  const median = v.length % 2 ? v[mid] : (v[mid - 1] + v[mid]) / 2;
  return { avg, median, min: v[0], max: v[v.length - 1], count: v.length };
}
