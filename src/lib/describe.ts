import { fmt } from "./finance";
import { withArticle } from "./types";

export type DescribeInput = {
  title: string;
  city: string;
  district: string;
  type: string;
  use: string;
  condition: string;
  area: number;
  frontages: string[]; // neighbour labels that are streets
  priceM2: number;
  currency: string;
  bestScenario: string;
  bestYield: number;
  highlights: string[];
};

/** Prompt for the language model; kept here so the API route and tests share it. */
export function describePrompt(d: DescribeInput): string {
  return `اكتب وصفًا تسويقيًا استثماريًا احترافيًا باللغة العربية الفصحى لعقار، في فقرة واحدة من 70 إلى 90 كلمة، موجهًا للمستثمرين.
لا تخترع أي معلومة غير موجودة في البيانات، ولا تذكر أسعارًا غير المذكورة، ولا تستخدم رموزًا تعبيرية أو عناوين.

البيانات:
- العنوان: ${d.title || "-"}
- الموقع: ${d.district ? `حي ${d.district}، ` : ""}${d.city || "-"}
- النوع والاستخدام: ${d.type} ${d.use}
- الحالة: ${d.condition || "-"}
- المساحة: ${fmt(d.area)} م²
- الواجهات: ${d.frontages.length ? d.frontages.join("، ") : "غير محددة"}
- سعر المتر: ${fmt(d.priceM2)} ${d.currency}
- أفضل سيناريو استثماري: ${d.bestScenario} بعائد تقديري ${d.bestYield.toFixed(1)}%
- المميزات: ${d.highlights.join("، ") || "-"}`;
}

/** Offline fallback used when no AI key is configured: assembled from the same facts. */
export function templateDescription(d: DescribeInput): string {
  const where = [d.district && `حي ${d.district}`, d.city].filter(Boolean).join(" في ");
  const fronts =
    d.frontages.length >= 2
      ? `${d.frontages.length === 2 ? "بواجهتين" : `بـ${d.frontages.length} واجهات`} على ${d.frontages.join(" و")}`
      : d.frontages.length === 1
        ? `بواجهة على ${d.frontages[0]}`
        : "";
  const parts = [
    `فرصة استثمارية مميزة${where ? ` في ${where}` : ""}: ${d.type} للاستخدام ${withArticle(d.use)} بمساحة ${fmt(d.area)} م²${fronts ? ` ${fronts}` : ""}.`,
    d.highlights.length ? `من أبرز مزاياه: ${d.highlights.slice(0, 3).join("، ")}.` : "",
    `يتيح العقار ${d.bestScenario === "شراء واحتفاظ" ? "نموًا رأسماليًا" : `سيناريو ${d.bestScenario}`} بعائد تقديري يبلغ ${d.bestYield.toFixed(1)}%، ما يجعله خيارًا جذابًا للمستثمر الباحث عن قيمة حقيقية على المدى المتوسط والطويل.`,
    d.condition ? `الحالة: ${d.condition}.` : "",
  ];
  return parts.filter(Boolean).join(" ");
}
