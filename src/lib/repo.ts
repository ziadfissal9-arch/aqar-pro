import "server-only";
import { and, asc, desc, eq, inArray } from "drizzle-orm";
import { getDb } from "@/db";
import { comparables, landmarks, photos, properties, settings } from "@/db/schema";
import { DEFAULT_OFFICE, normalizeProperty, type Comparable, type Landmark, type Office, type Photo, type Property } from "./types";

const photoUrl = (id: number) => `/api/photos/${id}`;

/** Strip client-only fields before storing: photos live in their own table. */
function toData(p: Property) {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { photos: _p, buildingPhotos: _b, ...rest } = p;
  return rest;
}

async function photosFor(ids: string[]): Promise<Record<string, { property: Photo[]; building: Photo[] }>> {
  const out: Record<string, { property: Photo[]; building: Photo[] }> = {};
  if (!ids.length) return out;
  const rows = await getDb()
    .select({ id: photos.id, propertyId: photos.propertyId, group: photos.group, position: photos.position })
    .from(photos)
    .where(inArray(photos.propertyId, ids))
    .orderBy(asc(photos.position), asc(photos.id));
  for (const r of rows) {
    out[r.propertyId] ??= { property: [], building: [] };
    out[r.propertyId][r.group === "building" ? "building" : "property"].push({ id: r.id, url: photoUrl(r.id) });
  }
  return out;
}

function hydrate(row: { id: string; data: unknown; createdAt: Date; updatedAt: Date }, ph?: { property: Photo[]; building: Photo[] }): Property {
  const p = normalizeProperty({ ...(row.data as Partial<Property>), id: row.id });
  return { ...p, createdAt: row.createdAt.getTime(), updatedAt: row.updatedAt.getTime(), photos: ph?.property ?? [], buildingPhotos: ph?.building ?? [] };
}

export async function listProperties(): Promise<Property[]> {
  const rows = await getDb().select().from(properties).orderBy(desc(properties.updatedAt));
  const ph = await photosFor(rows.map((r) => r.id));
  return rows.map((r) => hydrate(r, ph[r.id]));
}

export async function getProperty(id: string): Promise<Property | null> {
  const [row] = await getDb().select().from(properties).where(eq(properties.id, id));
  if (!row) return null;
  return hydrate(row, (await photosFor([id]))[id]);
}

export async function saveProperty(p: Property): Promise<void> {
  const data = toData(p);
  const cols = { title: p.title, city: p.city, district: p.district, kind: p.kind, data, updatedAt: new Date() };
  await getDb()
    .insert(properties)
    .values({ id: p.id, ...cols })
    .onConflictDoUpdate({ target: properties.id, set: cols });
}

export async function deleteProperty(id: string) {
  await getDb().delete(properties).where(eq(properties.id, id));
}

export async function addPhoto(propertyId: string, group: "property" | "building", dataUrl: string): Promise<Photo> {
  const m = dataUrl.match(/^data:(image\/(?:jpeg|png|webp));base64,(.+)$/);
  if (!m) throw new Error("صيغة الصورة غير مدعومة");
  if (m[2].length > 3_500_000) throw new Error("الصورة كبيرة جدًا");
  const db = getDb();
  const existing = await db.select({ id: photos.id }).from(photos).where(and(eq(photos.propertyId, propertyId), eq(photos.group, group)));
  if (existing.length >= 12) throw new Error("الحد الأقصى 12 صورة");
  const [row] = await db.insert(photos).values({ propertyId, group, mime: m[1], base64: m[2], position: existing.length }).returning({ id: photos.id });
  return { id: row.id, url: photoUrl(row.id) };
}

export async function getPhoto(id: number) {
  const [row] = await getDb().select({ mime: photos.mime, base64: photos.base64 }).from(photos).where(eq(photos.id, id));
  return row ?? null;
}

export async function deletePhoto(id: number) {
  await getDb().delete(photos).where(eq(photos.id, id));
}

export async function reorderPhotos(propertyId: string, ids: number[]) {
  const db = getDb();
  await Promise.all(ids.map((id, position) => db.update(photos).set({ position }).where(and(eq(photos.id, id), eq(photos.propertyId, propertyId)))));
}

// ---- office ----------------------------------------------------------------

export async function getOffice(): Promise<Office> {
  const [row] = await getDb().select().from(settings).where(eq(settings.key, "office"));
  return { ...DEFAULT_OFFICE, ...((row?.value as Partial<Office>) ?? {}) };
}

export async function saveOffice(o: Office) {
  await getDb().insert(settings).values({ key: "office", value: o }).onConflictDoUpdate({ target: settings.key, set: { value: o } });
}

// ---- comparables -----------------------------------------------------------

const toComparable = (r: typeof comparables.$inferSelect): Comparable => ({
  id: r.id,
  category: r.category as Comparable["category"],
  dealType: r.dealType as Comparable["dealType"],
  city: r.city,
  district: r.district,
  description: r.description,
  area: r.area,
  price: r.price,
  date: r.date,
  source: r.source,
});

export async function listComparables(city?: string): Promise<Comparable[]> {
  const q = getDb().select().from(comparables);
  const rows = await (city ? q.where(eq(comparables.city, city)) : q).orderBy(desc(comparables.createdAt));
  return rows.map(toComparable);
}

export async function getComparables(ids: number[]): Promise<Comparable[]> {
  if (!ids.length) return [];
  const rows = await getDb().select().from(comparables).where(inArray(comparables.id, ids));
  return rows.map(toComparable);
}

export async function saveComparable(c: Omit<Comparable, "id"> & { id?: number }): Promise<Comparable> {
  const db = getDb();
  const values = { category: c.category, dealType: c.dealType, city: c.city, district: c.district, description: c.description, area: c.area, price: c.price, date: c.date, source: c.source };
  const [row] = c.id
    ? await db.update(comparables).set(values).where(eq(comparables.id, c.id)).returning()
    : await db.insert(comparables).values(values).returning();
  return toComparable(row);
}

export async function deleteComparable(id: number) {
  await getDb().delete(comparables).where(eq(comparables.id, id));
}

// ---- landmarks -------------------------------------------------------------

export async function listLandmarks(city?: string): Promise<Landmark[]> {
  const q = getDb().select().from(landmarks);
  const rows = await (city ? q.where(eq(landmarks.city, city)) : q).orderBy(asc(landmarks.city), asc(landmarks.sortOrder), asc(landmarks.id));
  return rows.map(({ id, city, name, lat, lon }) => ({ id, city, name, lat, lon }));
}

export async function addLandmark(l: Omit<Landmark, "id">): Promise<Landmark> {
  const [row] = await getDb().insert(landmarks).values({ ...l, sortOrder: 999 }).returning();
  return { id: row.id, city: row.city, name: row.name, lat: row.lat, lon: row.lon };
}

export async function deleteLandmark(id: number) {
  await getDb().delete(landmarks).where(eq(landmarks.id, id));
}
