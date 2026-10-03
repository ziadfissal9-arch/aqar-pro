import type { LatLng } from "./geo";

export type Side = { neighbour: string };

export type Property = {
  id: string;
  createdAt: number;
  updatedAt: number;
  title: string;
  city: string;
  district: string;
  planNo: string;
  plotNo: string;
  type: string; // أرض، فيلا، عمارة...
  use: string; // سكني، تجاري...
  condition: string;
  lat: number | null;
  lon: number | null;
  polygon: LatLng[];
  sides: Side[];
  manualArea: number | null; // used when no polygon is drawn
  priceM2: number;
  currency: string;
  growth: number; // % per year
  devCostM2: number;
  buaRatio: number; // % of land area
  rentM2: number; // per year
  landLease: number; // per year
  description: string;
  highlights: string[];
  photos: string[]; // data URLs (first one is the cover)
};

export type Office = {
  name: string;
  tagline: string;
  phone: string;
  email: string;
  license: string;
  logo: string; // data URL or ""
};

export const DEFAULT_OFFICE: Office = {
  name: "اسم مكتبك",
  tagline: "للاستثمار والتسويق العقاري",
  phone: "",
  email: "",
  license: "",
  logo: "",
};

export function emptyProperty(id: string): Property {
  const now = Date.now();
  return {
    id,
    createdAt: now,
    updatedAt: now,
    title: "",
    city: "",
    district: "",
    planNo: "",
    plotNo: "",
    type: "أرض",
    use: "تجاري",
    condition: "جاهزة للتطوير",
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
    photos: [],
  };
}

/** "سكني تجاري" -> "السكني التجاري", so it reads correctly after any noun: "أرض للاستخدام التجاري". */
export function withArticle(use: string): string {
  return use
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => (w.startsWith("ال") ? w : `ال${w}`))
    .join(" ");
}
