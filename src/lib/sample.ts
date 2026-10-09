import geo from "./sample-geo.json";
import { DEFAULT_LANDMARKS } from "./landmarks";
import { emptyProperty, type Comparable, type Distance, type Property, type Street } from "./types";

/** A real vacant corner lot in Al-Malqa, Riyadh, with illustrative (made-up) figures. */
export function sampleProperty(id: string): Property {
  return {
    ...emptyProperty(id),
    title: "أرض تجارية على زاوية بثلاث واجهات",
    city: "الرياض",
    district: "الملقا",
    planNo: "2481",
    blockNo: "12",
    plotNo: "1205",
    type: "أرض",
    use: "تجاري",
    buildingSystem: "تجاري — 4 أدوار",
    buildingFactor: "2.4",
    condition: "جاهزة للتطوير",
    lat: 24.81404,
    lon: 46.61136,
    polygon: [
      [24.814191, 46.61095],
      [24.814405, 46.611513],
      [24.813889, 46.611784],
      [24.813675, 46.611226],
    ],
    sides: [
      { neighbour: "شارع عرض 30 م" },
      { neighbour: "قطعة رقم 1206" },
      { neighbour: "شارع عرض 20 م" },
      { neighbour: "شارع تجاري عرض 40 م" },
    ],
    priceM2: 6500,
    currency: "ريال",
    growth: 7,
    devCostM2: 3000,
    buaRatio: 120,
    rentM2: 1200,
    landLease: 1000000,
    description:
      "فرصة استثمارية نادرة في حي الملقا شمال الرياض: أرض تجارية على زاوية بارزة بثلاث واجهات، بمساحة تقارب 3,900 م²، تطل غربًا على شارع تجاري عرض 40 م. يجمع الموقع بين كثافة سكانية عالية وحركة مرور يومية مستمرة، ما يجعله مثاليًا لمعارض تجارية أو مجمع مكتبي أو مركز خدمات للأحياء المحيطة. شكل الأرض شبه المنتظم يمنح المطوّر مرونة كاملة في التصميم والاستفادة القصوى من نسب البناء، والأرض جاهزة للتطوير فورًا.",
    highlights: [
      "ثلاث واجهات على شوارع بعرض 40 م و30 م و20 م",
      "زاوية بارزة على تقاطع رئيسي",
      "شكل شبه منتظم واستغلال كامل للمساحة",
      "محاطة بأحياء سكنية مكتملة الخدمات",
    ],
    distances: (geo.distances as Distance[]).map((d) => {
      const l = DEFAULT_LANDMARKS.find((x) => x.name === d.name);
      return l ? { ...d, lat: l.lat, lon: l.lon } : d;
    }),
    distancesKey: "24.81404,46.61136,الرياض",
    streets: geo.streets as Street[],
    streetsKey: "24.81404,46.61136",
  };
}

/** Illustrative market evidence for the public demo (not real transactions). */
export const SAMPLE_COMPARABLES: Comparable[] = [
  { id: 1, category: "land", dealType: "deal", city: "الرياض", district: "الملقا", description: "أرض تجارية على شارع 40 م", area: 3200, price: 21_120_000, date: "2026-08", source: "صفقات وزارة العدل" },
  { id: 2, category: "land", dealType: "deal", city: "الرياض", district: "الملقا", description: "أرض تجارية زاوية", area: 2500, price: 15_750_000, date: "2026-07", source: "صفقات وزارة العدل" },
  { id: 3, category: "land", dealType: "offer", city: "الرياض", district: "الملقا", description: "أرض تجارية على شارعين", area: 4100, price: 28_700_000, date: "2026-09", source: "عقار" },
  { id: 4, category: "land", dealType: "offer", city: "الرياض", district: "الياسمين", description: "أرض تجارية", area: 3000, price: 18_600_000, date: "2026-09", source: "حراج" },
  { id: 5, category: "building", dealType: "deal", city: "الرياض", district: "الملقا", description: "مبنى تجاري 3 أدوار", area: 1800, price: 19_800_000, date: "2026-06", source: "صفقات وزارة العدل" },
  { id: 6, category: "building", dealType: "offer", city: "الرياض", district: "الملقا", description: "معارض ومكاتب", area: 2400, price: 27_600_000, date: "2026-09", source: "عقار" },
  { id: 7, category: "rent", dealType: "offer", city: "الرياض", district: "الملقا", description: "معرض تجاري على شارع 40 م", area: 300, price: 450_000, date: "2026-09", source: "عقار" },
  { id: 8, category: "rent", dealType: "deal", city: "الرياض", district: "الملقا", description: "مكاتب إدارية", area: 500, price: 600_000, date: "2026-08", source: "إيجار" },
  { id: 9, category: "rent", dealType: "offer", city: "الرياض", district: "الياسمين", description: "معرض تجاري", area: 250, price: 325_000, date: "2026-09", source: "حراج" },
];
