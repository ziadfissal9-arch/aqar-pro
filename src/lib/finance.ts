import { area, sideLengths } from "./geo";
import type { Property } from "./types";

export function plotArea(p: Property): number {
  return p.polygon.length >= 3 ? Math.round(area(p.polygon)) : Math.round(p.manualArea ?? 0);
}

export function lengths(p: Property): number[] {
  return p.polygon.length >= 3 ? sideLengths(p.polygon) : [];
}

export type Scenario = { key: string; title: string; note: string; capital: number; income: string; yieldPct: number; period: string; best?: boolean };

/** Investment figures shown in the report. Every number derives from the user's inputs. */
export function investment(p: Property) {
  const a = plotArea(p);
  const price = a * p.priceM2;
  const g = p.growth / 100;
  const projection = Array.from({ length: 6 }, (_, y) => price * (1 + g) ** y);
  const holdProfit = projection[3] - price;

  const bua = Math.round((a * p.buaRatio) / 100);
  const devTotal = price + bua * p.devCostM2;
  const rent = Math.round(bua * 0.85) * p.rentM2;
  const devYield = devTotal > 0 ? rent / devTotal : 0;

  const scenarios: Scenario[] = [
    { key: "hold", title: "شراء واحتفاظ", note: "بيع بعد 3 سنوات", capital: price, income: `ربح ${fmt(holdProfit)}`, yieldPct: price ? (holdProfit / price) * 100 : 0, period: "خلال 3 سنوات" },
  ];
  if (p.rentM2 > 0 && p.devCostM2 > 0) {
    scenarios.push({ key: "dev", title: "تطوير وتأجير", note: `${fmt(bua)} م² مسطحات بناء`, capital: devTotal, income: `إيجار ${fmt(rent)} سنويًا`, yieldPct: devYield * 100, period: "سنويًا" });
  }
  if (p.landLease > 0) {
    scenarios.push({ key: "lease", title: "تأجير الأرض كما هي", note: "معارض مؤقتة أو مواقف", capital: price, income: `إيجار ${fmt(p.landLease)} سنويًا`, yieldPct: price ? (p.landLease / price) * 100 : 0, period: "سنويًا" });
  }
  const annualised = (s: Scenario) => (s.key === "hold" ? s.yieldPct / 3 : s.yieldPct);
  const best = scenarios.reduce((b, s) => (annualised(s) > annualised(b) ? s : b), scenarios[0]);
  best.best = true;

  return { area: a, price, projection, scenarios, best, bua, rent, devYield };
}

export function fmt(n: number, digits = 0): string {
  return n.toLocaleString("en-US", { maximumFractionDigits: digits, minimumFractionDigits: digits });
}

export function money(n: number): string {
  if (n >= 1e6) return `${fmt(n / 1e6, 2)} مليون`;
  return fmt(n);
}
