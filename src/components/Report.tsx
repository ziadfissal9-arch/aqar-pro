/* eslint-disable @next/next/no-img-element -- report images are printed as-is */
import { priceM2, stats } from "@/lib/comparables";
import { centroid, fitZoom, sideFacing, type LatLng } from "@/lib/geo";
import { fmt, investment, lengths } from "@/lib/finance";
import { COMPARABLE_LABEL, withArticle, type Comparable, type Office, type Property } from "@/lib/types";
import PlotSketch from "./PlotSketch";
import StaticMap, { ATTRIBUTION } from "./StaticMap";

// A4 at 96 dpi is 794 x 1123 px; pages use 15mm side margins => 680px of content.
const PAGE_W = 794;
const PAGE_H = 1123;
const CONTENT_W = 680;

type Props = { property: Property; office: Office; qr: { maps: string; earth: string }; comparables?: Comparable[] };

export const mapsUrl = (c: LatLng) => `https://www.google.com/maps/search/?api=1&query=${c[0].toFixed(6)},${c[1].toFixed(6)}`;
export const earthUrl = (c: LatLng) => `https://earth.google.com/web/@${c[0].toFixed(6)},${c[1].toFixed(6)},640a,450d,35y,0h,45t,0r`;

export default function Report({ property: p, office, qr, comparables = [] }: Props) {
  const inv = investment(p);
  const lens = lengths(p);
  const hasPlot = p.polygon.length >= 3;
  const centre: LatLng = hasPlot ? centroid(p.polygon) : [p.lat ?? 24.7136, p.lon ?? 46.6753];
  const hasLocation = hasPlot || p.lat != null;
  const isBuilding = p.kind === "building";
  const facings = hasPlot ? p.polygon.map((_, i) => sideFacing(p.polygon, i)) : [];
  const streetFronts = p.sides.map((s, i) => (/شارع|طريق/.test(s.neighbour) ? facings[i] : null)).filter(Boolean) as string[];
  const widest = p.sides
    .map((s) => s.neighbour)
    .filter((n) => /شارع|طريق/.test(n))
    .sort((a, b) => (Number(b.match(/\d+/)?.[0]) || 0) - (Number(a.match(/\d+/)?.[0]) || 0))[0];
  const selected = comparables.filter((c) => p.comparableIds.includes(c.id));
  const grossYield = isBuilding && inv.price > 0 ? (p.building.grossIncome / inv.price) * 100 : 0;

  // which pages this file has, in order — used for page numbers
  const sections = [
    "cover",
    "overview",
    isBuilding ? "building" : null,
    !isBuilding ? "investment" : null,
    selected.length ? "comparables" : null,
    hasLocation ? "maps" : null,
    hasLocation && p.distances.length ? "distances" : null,
    p.photos.length > 1 ? "photos" : null,
    "sketch",
  ].filter(Boolean) as string[];
  const pageOf = (s: string) => sections.indexOf(s) + 1;
  const total = sections.length;
  const foot = (s: string) => <Footer page={pageOf(s)} pages={total} office={office} />;

  const coverZoom = hasPlot ? Math.min(19, fitZoom(p.polygon, PAGE_W, PAGE_H * 0.55, 0.55)) : 17;
  const typeLine = `${p.type} للاستخدام ${withArticle(isBuilding && p.building.use ? p.building.use : p.use)}`;

  return (
    <div className="text-[10.5pt] leading-[1.7] text-foreground">
      {/* ── cover ── */}
      <section className="report-page bg-navy text-white">
        <div className="absolute inset-0">
          {p.photos[0] ? (
            <img src={p.photos[0].url} alt="" className="h-full w-full object-cover" />
          ) : hasLocation ? (
            <StaticMap centre={hasPlot ? [centre[0] - 0.00025 * 2 ** (19 - coverZoom), centre[1]] : centre} zoom={coverZoom} width={PAGE_W} height={PAGE_H} kind="sat" polygon={p.polygon} outline="glow" />
          ) : null}
        </div>
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(14,42,59,.6)_0%,rgba(14,42,59,.05)_28%,rgba(14,42,59,.15)_48%,rgba(14,42,59,.93)_70%,#0e2a3b_100%)]" />
        <div className="absolute inset-x-[15mm] top-[14mm] flex items-center justify-between">
          <Brand office={office} light />
          <span className="rounded-full border border-white/35 bg-white/15 px-4 py-1 text-[9pt]">فرصة استثمارية</span>
        </div>
        <div className="absolute inset-x-[15mm] bottom-[24mm]">
          <p className="text-[10.5pt] font-semibold text-gold-2">{[p.city, p.district && `حي ${p.district}`, typeLine].filter(Boolean).join(" • ")}</p>
          <h1 className="my-[3mm] text-[31pt] leading-[1.3] font-bold">{p.title || typeLine}</h1>
          {(widest || p.condition) && <p className="text-[12pt] text-white/80">{[widest && `على ${widest}`, p.condition].filter(Boolean).join("، ")}</p>}
          <div className="mt-[8mm] grid grid-cols-4 gap-[3mm]">
            <Stat label="المساحة" value={fmt(inv.area)} unit="م²" />
            <Stat label="سعر المتر" value={fmt(p.priceM2)} unit={p.currency} />
            <Stat label="السعر الإجمالي" value={inv.price >= 1e6 ? fmt(inv.price / 1e6, 2) : fmt(inv.price)} unit={inv.price >= 1e6 ? `مليون ${p.currency}` : p.currency} />
            {isBuilding ? (
              <Stat label="الدخل السنوي" value={p.building.grossIncome >= 1e6 ? fmt(p.building.grossIncome / 1e6, 2) : fmt(p.building.grossIncome)} unit={`${p.building.grossIncome >= 1e6 ? "مليون " : ""}${p.currency} • عائد ${grossYield.toFixed(1)}%`} />
            ) : (
              <Stat label={`العائد المتوقع (${inv.best.title})`} value={`${inv.best.yieldPct.toFixed(1)}%`} unit={inv.best.period} />
            )}
          </div>
          {hasLocation && (
            <a href={mapsUrl(centre)} className="mt-[5mm] inline-flex items-center gap-2 rounded-full bg-white px-4 py-1.5 text-[9.5pt] font-semibold text-navy no-underline">
              <PinIcon /> افتح الموقع في قوقل ماب
            </a>
          )}
        </div>
        <p className="absolute right-[15mm] bottom-[9mm] text-[7.5pt] text-white/55">{p.photos[0] ? "" : ATTRIBUTION.sat}</p>
      </section>

      {/* ── overview ── */}
      <section className="report-page px-[15mm] pt-[16mm] pb-[20mm]">
        <Header title="نظرة عامة على العقار" office={office} />
        {p.description && (
          <div className="rounded-[14px] bg-[linear-gradient(135deg,#0e2a3b,#17405a)] px-[6mm] py-[4.5mm] text-white">
            <span className="mb-[2mm] inline-block rounded-full bg-gold-2 px-3 text-[8pt] font-semibold text-navy">✦ وصف تسويقي</span>
            <p className="text-[10pt] leading-[1.85] text-white/90">{p.description}</p>
          </div>
        )}
        {p.highlights.length > 0 && (
          <>
            <H3>لماذا هذا العقار؟</H3>
            <div className="grid grid-cols-2 gap-[2.5mm]">
              {p.highlights.slice(0, 6).map((h) => (
                <div key={h} className="flex items-start gap-2 rounded-[11px] border border-line bg-white px-[4mm] py-[2.5mm]">
                  <span className="grid h-[20px] w-[20px] shrink-0 place-items-center rounded-full bg-gold-soft text-[9pt] font-bold text-[#8d6a2a]">✓</span>
                  <b className="text-[9.5pt] leading-[1.5]">{h}</b>
                </div>
              ))}
            </div>
          </>
        )}
        <div className="grid grid-cols-2 gap-[5mm]">
          <div>
            <H3>البيانات المكانية</H3>
            <KV
              rows={[
                ["المدينة", p.city],
                ["الحي", p.district],
                ["رقم المخطط", p.planNo],
                ["رقم البلك", p.blockNo],
                ["رقم القطعة", p.plotNo],
                ["استخدام الأرض", p.use],
                ["نظام البناء", p.buildingSystem],
                ["معامل البناء", p.buildingFactor],
                ["الواجهات", streetFronts.join(" • ")],
                [
                  "الموقع",
                  hasLocation ? (
                    <a href={mapsUrl(centre)} className="inline-flex items-center gap-1 text-[#1a5fb4] no-underline">
                      <PinIcon small /> <span className="ltr-num">{`${centre[0].toFixed(5)}, ${centre[1].toFixed(5)}`}</span>
                    </a>
                  ) : (
                    ""
                  ),
                ],
              ]}
            />
          </div>
          <div>
            <H3>البيانات العقارية</H3>
            <KV
              rows={[
                ["نوع العقار", isBuilding ? `${p.type} (أرض ومبنى)` : p.type],
                ["مساحة الأرض", `${fmt(inv.area)} م²`],
                ["الأطوال", lens.length ? `${lens.map((l) => l.toFixed(1)).join(" × ")} م` : ""],
                ["مسطحات البناء", isBuilding && p.building.builtArea ? `${fmt(p.building.builtArea)} م²` : ""],
                ["سعر المتر", `${fmt(p.priceM2)} ${p.currency}`],
                ["السعر الإجمالي", `${fmt(inv.price)} ${p.currency}`],
                ["الحالة", p.condition],
              ]}
            />
          </div>
        </div>
        {hasLocation && (
          <div className="relative mt-[5mm] overflow-hidden rounded-[14px]" style={{ width: CONTENT_W, height: 175 }}>
            <StaticMap centre={centre} zoom={hasPlot ? Math.max(15, fitZoom(p.polygon, CONTENT_W, 175, 0.3)) : 16} width={CONTENT_W} height={175} kind="sat" polygon={p.polygon} />
            <Caption>صورة جوية للموقع والأحياء المحيطة</Caption>
          </div>
        )}
        {foot("overview")}
      </section>

      {/* ── building ── */}
      {isBuilding && (
        <section className="report-page px-[15mm] pt-[16mm] pb-[20mm]">
          <Header title="بيانات المبنى" office={office} />
          <div className="grid grid-cols-3 gap-[3mm]">
            <Kpi label="استخدام المبنى" value={p.building.use || "—"} unit="" />
            <Kpi label="عدد الأدوار" value={fmt(p.building.floors)} unit="دور" />
            <Kpi label="عدد الوحدات" value={fmt(p.building.units)} unit="وحدة" />
            <Kpi label="عمر المبنى" value={fmt(p.building.age)} unit="سنة" />
            <Kpi label="الدخل الإجمالي السنوي" value={fmt(p.building.grossIncome)} unit={p.currency} />
            <Kpi label="العائد الإجمالي" value={`${grossYield.toFixed(1)}%`} unit="الدخل ÷ السعر" />
          </div>
          {p.building.description && (
            <>
              <H3>وصف المبنى</H3>
              <p className="rounded-[12px] border border-line bg-white px-[5mm] py-[3.5mm] text-[10pt] leading-[1.9] whitespace-pre-line">{p.building.description}</p>
            </>
          )}
          {p.buildingPhotos.length > 0 && (
            <>
              <H3>صور المبنى</H3>
              <div className="grid grid-cols-2 gap-[3mm]">
                {p.buildingPhotos.slice(0, 4).map((ph, i) => (
                  <img key={ph.id} src={ph.url} alt="" className={`w-full rounded-[12px] object-cover ${p.buildingPhotos.length === 1 || (i === 0 && p.buildingPhotos.length === 3) ? "col-span-2 h-[88mm]" : "h-[62mm]"}`} />
                ))}
              </div>
            </>
          )}
          {foot("building")}
        </section>
      )}

      {/* ── investment (land) ── */}
      {!isBuilding && (
        <section className="report-page px-[15mm] pt-[16mm] pb-[20mm]">
          <Header title="البيانات الاستثمارية" office={office} />
          <div className="grid grid-cols-3 gap-[4mm]">
            <Kpi label="السعر الإجمالي" value={fmt(inv.price)} unit={p.currency} />
            <Kpi label="سعر المتر" value={fmt(p.priceM2)} unit={`${p.currency} / م²`} />
            <Kpi label="نمو سنوي متوقع" value={`${p.growth}%`} unit="لقيمة العقار" />
          </div>
          <H3>سيناريوهات الاستثمار</H3>
          <table className="w-full border-separate border-spacing-0 overflow-hidden rounded-[12px] border border-line bg-white">
            <thead>
              <tr className="bg-navy text-right text-[9pt] text-white">
                {["السيناريو", "رأس المال", "الدخل / الربح", "العائد"].map((h) => (
                  <th key={h} className="px-[3.5mm] py-[2.4mm] font-semibold">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {inv.scenarios.map((s) => (
                <tr key={s.key} className={s.best ? "bg-[#fbf4e6]" : ""}>
                  <td className={`border-t border-[#f0ebe0] px-[3.5mm] py-[2.6mm] ${s.best ? "shadow-[inset_-4px_0_0_#c49a4a]" : ""}`}>
                    <b>{s.title}</b>
                    <small className="block text-[8pt] text-muted">{s.note}</small>
                  </td>
                  <td className="border-t border-[#f0ebe0] px-[3.5mm]">{fmt(s.capital)}</td>
                  <td className="border-t border-[#f0ebe0] px-[3.5mm]">{s.income}</td>
                  <td className="border-t border-[#f0ebe0] px-[3.5mm] text-[11pt] font-bold text-[#1f7a4d]">
                    {s.yieldPct.toFixed(1)}%<small className="block text-[8pt] font-normal text-muted">{s.period}</small>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-[2mm] text-[8pt] text-muted">
            الافتراضات: تكلفة بناء {fmt(p.devCostM2)} {p.currency}/م²، مسطحات البناء {p.buaRatio}% من مساحة الأرض، مساحة قابلة للتأجير 85%، إيجار {fmt(p.rentM2)} {p.currency}/م² سنويًا.
          </p>
          <H3>القيمة المتوقعة للعقار ({inv.price >= 1e6 ? `مليون ${p.currency}` : p.currency})</H3>
          <div className="rounded-[12px] border border-line bg-white px-[4mm] pt-[3mm] pb-[1mm]">
            <ValueChart values={inv.projection} millions={inv.price >= 1e6} />
          </div>
          <p className="mt-[4mm] text-[7.5pt] text-muted">جميع الأرقام تقديرية مبنية على المدخلات، ولا تُعد توصية استثمارية.</p>
          {foot("investment")}
        </section>
      )}

      {/* ── comparables ── */}
      {selected.length > 0 && (
        <section className="report-page px-[15mm] pt-[16mm] pb-[20mm]">
          <Header title="المقارنات السعرية" office={office} />
          <ComparableSummary list={selected} subjectM2={p.priceM2} currency={p.currency} isBuilding={isBuilding} />
          {(["land", "building", "rent"] as const).map((cat) => {
            const list = selected.filter((c) => c.category === cat);
            if (!list.length) return null;
            return (
              <div key={cat}>
                <H3>
                  صفقات وعروض {COMPARABLE_LABEL[cat]}
                  <span className="text-[8.5pt] font-medium text-muted">({list.length})</span>
                </H3>
                <table className="w-full border-separate border-spacing-0 overflow-hidden rounded-[12px] border border-line bg-white text-[8.8pt]">
                  <thead>
                    <tr className="bg-navy text-right text-white">
                      {["الوصف", "الحي", "النوع", "المساحة م²", cat === "rent" ? "الإيجار السنوي" : "السعر", cat === "rent" ? "م²/سنة" : "سعر المتر", "التاريخ"].map((h) => (
                        <th key={h} className="px-[2.5mm] py-[2mm] font-semibold">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {list.map((c) => (
                      <tr key={c.id}>
                        <td className="border-t border-[#f0ebe0] px-[2.5mm] py-[1.8mm]">
                          {c.description || "—"}
                          {c.source && <small className="block text-[7.5pt] text-muted">{c.source}</small>}
                        </td>
                        <td className="border-t border-[#f0ebe0] px-[2.5mm]">{c.district}</td>
                        <td className="border-t border-[#f0ebe0] px-[2.5mm]">
                          <span className={`rounded-full px-2 text-[7.8pt] font-semibold ${c.dealType === "deal" ? "bg-[#e3f3ea] text-[#1f7a4d]" : "bg-[#eef2f9] text-[#33507a]"}`}>{c.dealType === "deal" ? "صفقة" : "عرض"}</span>
                        </td>
                        <td className="border-t border-[#f0ebe0] px-[2.5mm]">{fmt(c.area)}</td>
                        <td className="border-t border-[#f0ebe0] px-[2.5mm]">{fmt(c.price)}</td>
                        <td className="border-t border-[#f0ebe0] px-[2.5mm] font-bold">{fmt(priceM2(c))}</td>
                        <td className="border-t border-[#f0ebe0] px-[2.5mm] ltr-num">{c.date}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          })}
          {foot("comparables")}
        </section>
      )}

      {/* ── maps ── */}
      {hasLocation && (
        <section className="report-page px-[15mm] pt-[16mm] pb-[20mm]">
          <Header title="الموقع على الخرائط" office={office} />
          <MapBox caption="خريطة الموقع" attr={ATTRIBUTION.street} height={300}>
            <StaticMap centre={centre} zoom={16} width={CONTENT_W} height={300} kind="street" marker />
          </MapBox>
          <MapBox caption={hasPlot ? "صورة القمر الصناعي وحدود القطعة وأسماء الشوارع" : "صورة القمر الصناعي وأسماء الشوارع"} attr={ATTRIBUTION.sat} height={330}>
            <StaticMap centre={centre} zoom={hasPlot ? Math.min(18, fitZoom(p.polygon, CONTENT_W, 330, 0.35)) : 18} width={CONTENT_W} height={330} kind="sat" polygon={p.polygon} streets={p.streets} />
          </MapBox>
          <div className="grid grid-cols-2 gap-[4mm]">
            <QrCard src={qr.maps} href={mapsUrl(centre)} title="افتح الموقع في قوقل ماب" text="اضغط هنا أو امسح الرمز بكاميرا الجوال للوصول للموقع والاتجاهات" />
            <QrCard src={qr.earth} href={earthUrl(centre)} title="شاهد الموقع في قوقل إيرث" text="عرض ثلاثي الأبعاد للأرض والمباني المحيطة" />
          </div>
          {foot("maps")}
        </section>
      )}

      {/* ── distances ── */}
      {hasLocation && p.distances.length > 0 && (
        <DistancesPage p={p} centre={centre} footer={foot("distances")} office={office} />
      )}

      {/* ── photos ── */}
      {p.photos.length > 1 && (
        <section className="report-page px-[15mm] pt-[16mm] pb-[20mm]">
          <Header title="صور العقار" office={office} />
          <div className="grid grid-cols-2 gap-[4mm]">
            {p.photos.slice(0, 6).map((ph, i) => (
              <img key={ph.id} src={ph.url} alt="" className={`w-full rounded-[12px] object-cover ${i === 0 ? "col-span-2 h-[95mm]" : "h-[62mm]"}`} />
            ))}
          </div>
          {foot("photos")}
        </section>
      )}

      {/* ── sketch ── */}
      <section className="report-page px-[15mm] pt-[16mm] pb-[20mm]">
        <Header title="المخطط المساحي للقطعة" office={office} />
        <div className="h-[112mm] rounded-[14px] border border-line bg-white bg-[linear-gradient(#f1ece2_1px,transparent_1px),linear-gradient(90deg,#f1ece2_1px,transparent_1px)] bg-[length:18px_18px]">
          <PlotSketch polygon={p.polygon} neighbours={p.sides.map((s) => s.neighbour)} plotNo={p.plotNo} area={inv.area} />
        </div>
        {hasPlot && (
          <div className="grid grid-cols-2 gap-[6mm]">
            <div>
              <H3>الحدود والأطوال</H3>
              <Grid head={["الحد", "المجاور", "الطول"]} rows={lens.map((l, i) => [`الحد ${facings[i]}`, p.sides[i]?.neighbour || "—", `${l.toFixed(2)} م`])} total={["المساحة الإجمالية", `${fmt(inv.area)} م²`]} />
            </div>
            <div>
              <H3>إحداثيات الأركان</H3>
              <Grid head={["الركن", "خط العرض", "خط الطول"]} rows={p.polygon.map(([la, lo], i) => [String(i + 1), la.toFixed(6), lo.toFixed(6)])} ltr />
            </div>
          </div>
        )}
        <div className="mt-[6mm] flex items-center justify-between rounded-[14px] bg-navy px-[6mm] py-[4mm] text-white">
          <Brand office={office} light />
          <div className="text-left">
            <b className="block text-[11pt] text-gold-2">للاستفسار وحجز موعد معاينة</b>
            <small className="text-[8.5pt] text-white/80">
              {office.phone || office.email ? (
                <>
                  {office.phone && <span className="ltr-num">{office.phone}</span>}
                  {office.phone && office.email && " • "}
                  {office.email}
                </>
              ) : (
                "أضف رقم الجوال والبريد من إعدادات المكتب"
              )}
            </small>
          </div>
        </div>
        {foot("sketch")}
      </section>
    </div>
  );
}

function DistancesPage({ p, centre, footer, office }: { p: Property; centre: LatLng; footer: React.ReactNode; office: Office }) {
  const rows = [...p.distances].sort((a, b) => a.km - b.km);
  const maxKm = Math.max(...rows.map((r) => r.km), 1);
  const located = rows.map((d, i) => ({ d, n: i + 1 })).filter(({ d }) => d.lat != null && d.lon != null);
  const all: LatLng[] = [centre, ...located.map(({ d }) => [d.lat!, d.lon!] as LatLng)];
  const mid: LatLng = [(Math.min(...all.map((a) => a[0])) + Math.max(...all.map((a) => a[0]))) / 2, (Math.min(...all.map((a) => a[1])) + Math.max(...all.map((a) => a[1]))) / 2];
  const zoom = Math.min(13, fitZoom(all, CONTENT_W, 270, 0.85));
  return (
    <section className="report-page px-[15mm] pt-[16mm] pb-[20mm]">
      <Header title="المسافات لأبرز المعالم" office={office} />
      <div className="grid grid-cols-3 gap-[3mm]">
        <Kpi label="أقرب معلم" value={rows[0].name} unit={`${fmt(rows[0].km, 1)} كم • ${rows[0].minutes} دقيقة`} small />
        <Kpi label="المطار" value={`${fmt(p.distances.find((d) => /مطار/.test(d.name))?.minutes ?? 0)} دقيقة`} unit="بالسيارة تقريبًا" small />
        <Kpi label="عدد المعالم" value={String(rows.length)} unit="محسوبة تلقائيًا" small />
      </div>
      <H3>مسافة القيادة والوقت التقريبي</H3>
      <table className="w-full border-separate border-spacing-0 overflow-hidden rounded-[12px] border border-line bg-white text-[9.5pt]">
        <thead>
          <tr className="bg-navy text-right text-white">
            {["المعلم", "مسافة القيادة", "الوقت", "", "خط مستقيم"].map((h, i) => (
              <th key={i} className="px-[3mm] py-[2.2mm] font-semibold">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((d, i) => (
            <tr key={d.name}>
              <td className="border-t border-[#f0ebe0] px-[3mm] py-[2mm] font-semibold">
                <span className="ml-2 inline-grid h-[18px] w-[18px] place-items-center rounded-full bg-navy text-[8pt] text-white">{i + 1}</span>
                {d.name}
              </td>
              <td className="border-t border-[#f0ebe0] px-[3mm] font-bold text-navy">{fmt(d.km, 1)} كم</td>
              <td className="border-t border-[#f0ebe0] px-[3mm]">{d.minutes} دقيقة</td>
              <td className="w-[30%] border-t border-[#f0ebe0] px-[3mm]">
                <div className="h-[7px] rounded-full bg-[#f0ebe0]">
                  <div className="h-full rounded-full bg-[linear-gradient(90deg,#c49a4a,#e6c98d)]" style={{ width: `${Math.max(6, (d.km / maxKm) * 100)}%` }} />
                </div>
              </td>
              <td className="border-t border-[#f0ebe0] px-[3mm] text-muted">{fmt(d.straightKm, 1)} كم</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-[2mm] text-[7.5pt] text-muted">
        المسافات والأوقات محسوبة تلقائيًا من موقع العقار عبر شبكة الطرق (OpenStreetMap)، والوقت تقديري خارج أوقات الذروة.
      </p>
      <div className="relative mt-[4mm] overflow-hidden rounded-[14px] border border-line" style={{ width: CONTENT_W, height: 270 }}>
        <StaticMap centre={mid} zoom={zoom} width={CONTENT_W} height={270} kind="street" pins={[...located.map(({ d, n }) => ({ at: [d.lat!, d.lon!] as LatLng, label: String(n) })), { at: centre, label: "", main: true }]} />
        <Caption>موقع العقار والمعالم المحيطة</Caption>
      </div>
      {footer}
    </section>
  );
}

function ComparableSummary({ list, subjectM2, currency, isBuilding }: { list: Comparable[]; subjectM2: number; currency: string; isBuilding: boolean }) {
  const ownCat = isBuilding ? "building" : "land";
  const s = stats(list.filter((c) => c.category === ownCat));
  const rent = stats(list.filter((c) => c.category === "rent"));
  const diff = s && subjectM2 ? ((subjectM2 - s.avg) / s.avg) * 100 : null;
  return (
    <div className="grid grid-cols-3 gap-[3mm]">
      <Kpi label={`متوسط سعر المتر (${COMPARABLE_LABEL[ownCat]})`} value={s ? fmt(s.avg) : "—"} unit={s ? `${currency} • ${s.count} مقارنة` : ""} />
      <Kpi label="سعر متر العقار" value={fmt(subjectM2)} unit={currency} />
      <div className={`rounded-[13px] border border-t-[3px] border-line bg-white px-[5mm] py-[4mm] ${diff == null ? "border-t-gold" : diff <= 0 ? "border-t-[#1f7a4d]" : "border-t-[#c0392b]"}`}>
        <small className="block text-[8.5pt] text-muted">مقارنة بمتوسط السوق</small>
        <b className={`block text-[17pt] leading-[1.4] ${diff == null ? "text-navy" : diff <= 0 ? "text-[#1f7a4d]" : "text-[#c0392b]"}`}>{diff == null ? "—" : `${diff > 0 ? "+" : ""}${diff.toFixed(1)}%`}</b>
        <i className="text-[8pt] not-italic text-muted">{diff == null ? "" : diff <= 0 ? "أقل من متوسط السوق" : "أعلى من متوسط السوق"}{rent ? ` • إيجار ${fmt(rent.avg)}/م²` : ""}</i>
      </div>
    </div>
  );
}

function PinIcon({ small }: { small?: boolean }) {
  const s = small ? 11 : 14;
  return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="#d2452f" aria-hidden>
      <path d="M12 2C8 2 5 5.1 5 9c0 5.3 7 13 7 13s7-7.7 7-13c0-3.9-3-7-7-7Zm0 9.5A2.5 2.5 0 1 1 12 6.5a2.5 2.5 0 0 1 0 5Z" />
    </svg>
  );
}

function Footer({ page, pages, office }: { page: number; pages: number; office: Office }) {
  return (
    <footer className="absolute inset-x-[15mm] bottom-[8mm] flex justify-between border-t border-line pt-[3mm] text-[7.5pt] text-muted">
      <span>ملف تسويقي • {office.name}</span>
      {office.license && <span>ترخيص فال: {office.license}</span>}
      <span className="ltr-num font-semibold text-navy">
        {page} / {pages}
      </span>
    </footer>
  );
}

function Header({ title, office }: { title: string; office: Office }) {
  return (
    <header className="mb-[6mm] flex items-center justify-between border-b-2 border-line pb-[5mm]">
      <Brand office={office} />
      <h2 className="relative text-[19pt] font-bold text-navy after:absolute after:-bottom-[7mm] after:left-0 after:h-[3px] after:w-[46px] after:rounded after:bg-gold">{title}</h2>
    </header>
  );
}

function H3({ children }: { children: React.ReactNode }) {
  return <h3 className="mt-[5mm] mb-[2.5mm] flex items-center gap-2 text-[12pt] font-bold text-navy before:h-2 before:w-2 before:rounded-sm before:bg-gold">{children}</h3>;
}

function Brand({ office, light }: { office: Office; light?: boolean }) {
  return (
    <div className="flex items-center gap-[9px]">
      {office.logo ? (
        <img src={office.logo} alt="" className="h-[36px] w-[36px] rounded-[9px] bg-white object-contain p-0.5" />
      ) : (
        <div className="grid h-[34px] w-[34px] place-items-center rounded-[9px] bg-[linear-gradient(135deg,#c49a4a,#a77c33)] text-[17px] font-bold text-white">{office.name.trim()[0] || "ع"}</div>
      )}
      <div>
        <b className={`block text-[11pt] leading-[1.2] ${light ? "text-white" : ""}`}>{office.name}</b>
        <small className={`text-[8pt] ${light ? "text-white/75" : "text-muted"}`}>{office.tagline}</small>
      </div>
    </div>
  );
}

function Stat({ label, value, unit }: { label: string; value: string; unit: string }) {
  return (
    <div className="rounded-[12px] border border-white/20 bg-white/10 p-[4mm]">
      <small className="block text-[8pt] text-white/70">{label}</small>
      <b className="ltr-num block text-right text-[18pt] leading-[1.4]">{value}</b>
      <i className="text-[8pt] not-italic text-gold-2">{unit}</i>
    </div>
  );
}

function Kpi({ label, value, unit, small }: { label: string; value: string; unit: string; small?: boolean }) {
  return (
    <div className="rounded-[13px] border border-t-[3px] border-line border-t-gold bg-white px-[5mm] py-[3.5mm]">
      <small className="block text-[8.5pt] text-muted">{label}</small>
      <b className={`block leading-[1.4] text-navy ${small ? "text-[12.5pt]" : "text-[17pt]"}`}>{value}</b>
      <i className="text-[8pt] not-italic text-muted">{unit}</i>
    </div>
  );
}

function KV({ rows }: { rows: [string, React.ReactNode][] }) {
  const shown = rows.filter(([, v]) => v);
  return (
    <table className="w-full border-separate border-spacing-0 overflow-hidden rounded-[11px] border border-line bg-white text-[9.3pt]">
      <tbody>
        {shown.map(([k, v], i) => (
          <tr key={k}>
            <th className={`w-[40%] px-[3.5mm] py-[1.5mm] text-right font-medium text-muted ${i ? "border-t border-[#f0ebe0]" : ""}`}>{k}</th>
            <td className={`px-[3.5mm] font-semibold ${i ? "border-t border-[#f0ebe0]" : ""}`}>{v}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function Grid({ head, rows, total, ltr }: { head: string[]; rows: string[][]; total?: [string, string]; ltr?: boolean }) {
  return (
    <table className="w-full border-separate border-spacing-0 overflow-hidden rounded-[12px] border border-line bg-white text-[9.5pt]">
      <thead>
        <tr className="bg-navy text-white">
          {head.map((h) => (
            <th key={h} className="px-[3.5mm] py-[2mm] text-right text-[9pt] font-semibold">
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((r, i) => (
          <tr key={i}>
            {r.map((c, j) => (
              <td key={j} className={`border-t border-[#f0ebe0] px-[3.5mm] py-[1.8mm] ${ltr && j ? "ltr-num" : ""}`}>
                {c}
              </td>
            ))}
          </tr>
        ))}
        {total && (
          <tr className="bg-[#f6f1e6] font-bold text-navy">
            <td colSpan={head.length - 1} className="border-t border-[#f0ebe0] px-[3.5mm] py-[1.8mm]">
              {total[0]}
            </td>
            <td className="border-t border-[#f0ebe0] px-[3.5mm]">{total[1]}</td>
          </tr>
        )}
      </tbody>
    </table>
  );
}

function ValueChart({ values, millions }: { values: number[]; millions: boolean }) {
  const max = Math.max(...values) || 1;
  return (
    <svg viewBox="0 0 580 215" className="h-[50mm] w-full">
      {values.map((v, i) => {
        const h = (v / max) * 150;
        const x = 30 + i * 92;
        return (
          <g key={i}>
            <rect x={x} y={185 - h} width="56" height={h} rx="6" fill={i === 3 ? "#c49a4a" : "#d9cdb4"} />
            <text x={x + 28} y={177 - h} textAnchor="middle" fontSize="13" fontWeight={700} fill="#0e2a3b">
              {millions ? (v / 1e6).toFixed(1) : fmt(v)}
            </text>
            <text x={x + 28} y="206" textAnchor="middle" fontSize="12" fill="#6b7680">
              {i === 0 ? "اليوم" : `سنة ${i}`}
            </text>
          </g>
        );
      })}
      <line x1="20" y1="185" x2="560" y2="185" stroke="#cfc6b4" strokeWidth="1.5" />
    </svg>
  );
}

function Caption({ children }: { children: React.ReactNode }) {
  return <span className="absolute right-[3mm] bottom-[3mm] rounded-full bg-navy/85 px-3 text-[8pt] text-white">{children}</span>;
}

function MapBox({ children, caption, attr, height }: { children: React.ReactNode; caption: string; attr: string; height: number }) {
  return (
    <div className="relative mb-[4.5mm] overflow-hidden rounded-[14px] border border-line" style={{ width: CONTENT_W, height }}>
      {children}
      <Caption>{caption}</Caption>
      <span className="absolute bottom-[2mm] left-[3mm] rounded bg-white/75 px-1.5 text-[6.5pt] text-[#333]" dir="ltr">
        {attr}
      </span>
    </div>
  );
}

function QrCard({ src, href, title, text }: { src: string; href: string; title: string; text: string }) {
  return (
    <a href={href} className="flex items-center gap-[4mm] rounded-[13px] border border-line bg-white p-[3.5mm] text-foreground no-underline">
      {src && <img src={src} alt="" className="h-[25mm] w-[25mm]" />}
      <div>
        <b className="flex items-center gap-1.5 text-[10.5pt] leading-[1.5] text-navy">
          <PinIcon /> {title}
        </b>
        <small className="mt-1 block text-[8.5pt] leading-[1.6] text-muted">{text}</small>
      </div>
    </a>
  );
}

