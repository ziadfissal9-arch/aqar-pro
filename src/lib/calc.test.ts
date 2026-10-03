import { describe, expect, it } from "vitest";
import { templateDescription } from "./describe";
import { investment, plotArea } from "./finance";
import { area, distance, fitZoom, sideFacing, sideLengths, sketchLayout, type LatLng } from "./geo";
import { sampleProperty } from "./sample";
import { emptyProperty, withArticle } from "./types";

// A 100 m x 50 m rectangle near Riyadh, built from metre offsets.
const LAT = 24.8;
const dLat = (m: number) => m / 111195;
const dLon = (m: number) => m / (111195 * Math.cos((LAT * Math.PI) / 180));
const rect: LatLng[] = [
  [LAT + dLat(50), 46.6],
  [LAT + dLat(50), 46.6 + dLon(100)],
  [LAT, 46.6 + dLon(100)],
  [LAT, 46.6],
];

describe("geometry", () => {
  it("measures side lengths in metres", () => {
    const [north, east, south, west] = sideLengths(rect);
    expect(north).toBeCloseTo(100, 0);
    expect(east).toBeCloseTo(50, 0);
    expect(south).toBeCloseTo(100, 0);
    expect(west).toBeCloseTo(50, 0);
  });

  it("computes area in square metres", () => {
    expect(area(rect)).toBeGreaterThan(4980);
    expect(area(rect)).toBeLessThan(5020);
  });

  it("names the direction each side faces", () => {
    expect(rect.map((_, i) => sideFacing(rect, i))).toEqual(["شمالي", "شرقي", "جنوبي", "غربي"]);
  });

  it("is symmetric for distance", () => {
    expect(distance(rect[0], rect[2])).toBeCloseTo(distance(rect[2], rect[0]), 6);
  });

  it("zooms in further for smaller plots", () => {
    const small = rect.map(([la, lo]) => [LAT + (la - LAT) / 10, 46.6 + (lo - 46.6) / 10] as LatLng);
    expect(fitZoom(small, 600, 400)).toBeGreaterThan(fitZoom(rect, 600, 400));
  });

  it("lays out the sketch inside the frame with the first side on top", () => {
    const s = sketchLayout(rect, 640, 470, 110)!;
    for (const [x, y] of s.points) {
      expect(x).toBeGreaterThanOrEqual(109);
      expect(x).toBeLessThanOrEqual(531);
      expect(y).toBeGreaterThanOrEqual(0);
      expect(y).toBeLessThanOrEqual(470);
    }
    expect(s.points[0][1]).toBeLessThan(s.centre[1]);
  });
});

describe("investment", () => {
  it("prices the plot from area x price per m²", () => {
    const p = { ...emptyProperty("x"), polygon: rect, priceM2: 1000 };
    const inv = investment(p);
    expect(inv.price).toBe(plotArea(p) * 1000);
    expect(inv.projection[0]).toBe(inv.price);
    expect(inv.projection[1]).toBeCloseTo(inv.price * 1.07, 0);
  });

  it("uses the manual area when no plot is drawn", () => {
    const p = { ...emptyProperty("x"), manualArea: 600, priceM2: 2000 };
    expect(investment(p).price).toBe(1_200_000);
  });

  it("marks exactly one best scenario, compared per year", () => {
    const inv = investment(sampleProperty("s"));
    expect(inv.scenarios.filter((s) => s.best)).toHaveLength(1);
    expect(inv.best.key).toBe("dev"); // 12.1%/yr beats 22.5% over 3 years and 3.9%/yr
  });

  it("omits scenarios that have no inputs", () => {
    const p = { ...emptyProperty("x"), manualArea: 500, priceM2: 1000, rentM2: 0, landLease: 0 };
    expect(investment(p).scenarios.map((s) => s.key)).toEqual(["hold"]);
  });
});

describe("Arabic text", () => {
  it("adds the definite article to each word of the use", () => {
    expect(withArticle("سكني تجاري")).toBe("السكني التجاري");
    expect(withArticle("التجاري")).toBe("التجاري");
  });

  it("writes a template description from the facts only", () => {
    const text = templateDescription({
      title: "",
      city: "الرياض",
      district: "الملقا",
      type: "أرض",
      use: "تجاري",
      condition: "",
      area: 3903,
      frontages: ["شارع عرض 30 م", "شارع عرض 40 م"],
      priceM2: 6500,
      currency: "ريال",
      bestScenario: "تطوير وتأجير",
      bestYield: 12.1,
      highlights: [],
    });
    expect(text).toContain("أرض للاستخدام التجاري");
    expect(text).toContain("3,903 م²");
    expect(text).toContain("بواجهتين");
    expect(text).toContain("12.1%");
  });
});
