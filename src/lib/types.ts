import type { LatLng } from "./geo";

export type Side = { neighbour: string };
export type Photo = { id: number; url: string };
export type Distance = { name: string; km: number; minutes: number; straightKm: number; lat?: number; lon?: number };
export type Street = { name: string; major: boolean; coords: LatLng[] };

export type Building = {
  use: string; // سكني، تجاري...
  floors: number;
  units: number;
  age: number; // years
  grossIncome: number; // per year
  builtArea: number; // m²
  description: string;
};

export type Property = {
  id: string;
  createdAt: number;
  updatedAt: number;
  kind: "land" | "building"; // أرض فقط | أرض ومبنى
  title: string;
  city: string;
  district: string;
  planNo: string;
  blockNo: string;
  plotNo: string;
  type: string;
  use: string; // استخدام الأرض
  buildingSystem: string; // نظام البناء
  buildingFactor: string; // معامل البناء
  condition: string;
  lat: number | null;
  lon: number | null;
  polygon: LatLng[];
  sides: Side[];
  manualArea: number | null;
  priceM2: number;
  currency: string;
  growth: number;
  devCostM2: number;
  buaRatio: number;
  rentM2: number;
  landLease: number;
  description: string;
  highlights: string[];
  building: Building;
  photos: Photo[];
  buildingPhotos: Photo[];
  distances: Distance[];
  distancesKey: string; // "lat,lon,city" the distances were computed for
  streets: Street[];
  streetsKey: string;
  comparableIds: number[];
};

export type Comparable = {
  id: number;
  category: "land" | "building" | "rent";
  dealType: "deal" | "offer";
  city: string;
  district: string;
  description: string;
  area: number;
  price: number;
  date: string;
  source: string;
};

export type Landmark = { id: number; city: string; name: string; lat: number; lon: number };

export type Office = {
  name: string;
  tagline: string;
  phone: string;
  email: string;
  license: string;
  logo: string;
};

export const DEFAULT_OFFICE: Office = {
  name: "اسم مكتبك",
  tagline: "للاستثمار والتسويق العقاري",
  phone: "",
  email: "",
  license: "",
  logo: "",
};

export const EMPTY_BUILDING: Building = { use: "سكني", floors: 0, units: 0, age: 0, grossIncome: 0, builtArea: 0, description: "" };

export function emptyProperty(id: string): Property {
  const now = Date.now();
  return {
    id,
    createdAt: now,
    updatedAt: now,
    kind: "land",
    title: "",
    city: "الرياض",
    district: "",
    planNo: "",
    blockNo: "",
    plotNo: "",
    type: "أرض",
    use: "تجاري",
    buildingSystem: "",
    buildingFactor: "",
    condition: "",
    lat: null,
    lon: null,
    polygon: [],
    sides: [],
    manualArea: null,
    priceM2: 0,
    currency: "ريال",
    growth: 7,
    devCostM2: 3000,
    buaRatio: 120,
    rentM2: 1200,
    landLease: 0,
    description: "",
    highlights: [],
    building: { ...EMPTY_BUILDING },
    photos: [],
    buildingPhotos: [],
    distances: [],
    distancesKey: "",
    streets: [],
    streetsKey: "",
    comparableIds: [],
  };
}

/** Fill fields added after a property was first saved, so older records keep working. */
export function normalizeProperty(p: Partial<Property> & { id: string }): Property {
  const base = emptyProperty(p.id);
  return { ...base, ...p, building: { ...EMPTY_BUILDING, ...(p.building ?? {}) } } as Property;
}

/** "سكني تجاري" -> "السكني التجاري", so it reads correctly after any noun: "أرض للاستخدام التجاري". */
export function withArticle(use: string): string {
  return use
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => (w.startsWith("ال") ? w : `ال${w}`))
    .join(" ");
}

export const COMPARABLE_LABEL: Record<Comparable["category"], string> = {
  land: "أراضي",
  building: "مباني",
  rent: "إيجارات",
};
