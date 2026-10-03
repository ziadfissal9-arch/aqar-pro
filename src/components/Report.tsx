/* eslint-disable @next/next/no-img-element -- report images are data URLs printed as-is */
import { centroid, fitZoom, sideFacing, type LatLng } from "@/lib/geo";
import { fmt, investment, lengths, money } from "@/lib/finance";
import { withArticle, type Office, type Property } from "@/lib/types";
import PlotSketch from "./PlotSketch";
import StaticMap, { ATTRIBUTION } from "./StaticMap";

// A4 at 96 dpi is 794 x 1123 px; pages use 15mm side margins => 680px of content.
const PAGE_W = 794;
const PAGE_H = 1123;
const CONTENT_W = 680;

type Props = { property: Property; office: Office; qr: { maps: string; earth: string } };

export default function Report({ property: p, office, qr }: Props) {
  const inv = investment(p);
  const lens = lengths(p);
  const hasPlot = p.polygon.length >= 3;
  const centre: LatLng = hasPlot ? centroid(p.polygon) : [p.lat ?? 24.7136, p.lon ?? 46.6753];
  const hasLocation = hasPlot || p.lat != null;
  const facings = hasPlot ? p.polygon.map((_, i) => sideFacing(p.polygon, i)) : [];
  const streetFronts = p.sides.map((s, i) => (/شارع|طريق/.test(s.neighbour) ? facings[i] : null)).filter(Boolean) as string[];
  // the widest street frontage, e.g. "شارع تجاري عرض 40 م"
  const widest = p.sides
    .map((s) => s.neighbour)
    .filter((n) => /شارع|طريق/.test(n))
    .sort((a, b) => (Number(b.match(/\d+/)?.[0]) || 0) - (Number(a.match(/\d+/)?.[0]) || 0))[0];
  const pages = 5 + (p.photos.length > 1 ? 1 : 0);
  let n = 0;
  const next = () => ++n;

  const coverZoom = hasPlot ? Math.min(19, fitZoom(p.polygon, PAGE_W, PAGE_H * 0.55, 0.55)) : 17;

  return (
    <div className="text-[10.5pt] leading-[1.7] text-foreground">
      {/* 1. cover */}
      <section className="report-page bg-navy text-white" data-page={next()}>
        <div className="absolute inset-0">
          {p.photos[0] ? (
            <img src={p.photos[0]} alt="" className="h-full w-full object-cover" />
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
          <p className="text-[10.5pt] font-semibold text-gold-2">{[p.city, p.district && `حي ${p.district}`, `${p.type} للاستخدام ${withArticle(p.use)}`].filter(Boolean).join(" • ")}</p>
          <h1 className="my-[3mm] text-[31pt] leading-[1.3] font-bold">{p.title || `${p.type} للاستخدام ${withArticle(p.use)}`}</h1>
          {(widest || p.condition) && <p className="text-[12pt] text-white/80">{[widest && `على ${widest}`, p.condition].filter(Boolean).join("، ")}</p>}
          <div className="mt-[8mm] grid grid-cols-4 gap-[3mm]">
            <Stat label="المساحة" value={fmt(inv.area)} unit="م²" />
            <Stat label="سعر المتر" value={fmt(p.priceM2)} unit={p.currency} />
            <Stat label="السعر الإجمالي" value={inv.price >= 1e6 ? fmt(inv.price / 1e6, 2) : fmt(inv.price)} unit={inv.price >= 1e6 ? `مليون ${p.currency}` : p.currency} />
            <Stat label={`العائد المتوقع (${inv.best.title})`} value={`${inv.best.yieldPct.toFixed(1)}%`} unit={inv.best.period} />
          </div>
        </div>
        <p className="absolute right-[15mm] bottom-[9mm] text-[7.5pt] text-white/55">{p.photos[0] ? "" : ATTRIBUTION.sat}</p>
      </section>

      {/* 2. overview */}
      <section className="report-page px-[15mm] pt-[16mm] pb-[20mm]" data-page={next()}>
        <Header title="نظرة عامة على العقار" office={office} />
        {p.description && (
          <div className="rounded-[14px] bg-[linear-gradient(135deg,#0e2a3b,#17405a)] px-[6mm] py-[5mm] text-white">
            <span className="mb-[2mm] inline-block rounded-full bg-gold-2 px-3 text-[8pt] font-semibold text-navy">✦ وصف تسويقي مولّد آليًا</span>
            <p className="text-[10.5pt] leading-[1.9] text-white/90">{p.description}</p>
          </div>
        )}
        {p.highlights.length > 0 && (
          <>
            <H3>لماذا هذا العقار؟</H3>
            <div className="grid grid-cols-2 gap-[3mm]">
              {p.highlights.slice(0, 6).map((h) => (
                <div key={h} className="flex items-start gap-2 rounded-[11px] border border-line bg-white px-[4mm] py-[3mm]">
                  <span className="grid h-[22px] w-[22px] shrink-0 place-items-center rounded-full bg-gold-soft text-[10pt] font-bold text-[#8d6a2a]">✓</span>
                  <b className="text-[10pt] leading-[1.5]">{h}</b>
                </div>
              ))}
            </div>
          </>
        )}
        <div className="grid grid-cols-2 gap-[6mm]">
          <div>
            <H3>البيانات المكانية</H3>
            <KV
              rows={[
                ["المدينة", p.city],
                ["الحي", p.district],
                ["رقم المخطط", p.planNo],
                ["رقم القطعة", p.plotNo],
                ["الإحداثيات", hasLocation ? <span className="ltr-num">{`${centre[0].toFixed(5)}, ${centre[1].toFixed(5)}`}</span> : ""],
                ["الواجهات", streetFronts.join(" • ")],
              ]}
            />
          </div>
          <div>
            <H3>البيانات العقارية</H3>
            <KV
              rows={[
                ["نوع العقار", p.type],
                ["الاستخدام", p.use],
                ["المساحة", `${fmt(inv.area)} م²`],
                ["الأطوال", lens.length ? `${lens.map((l) => l.toFixed(1)).join(" × ")} م` : ""],
                ["عدد الأضلاع", lens.length ? String(lens.length) : ""],
                ["الحالة", p.condition],
              ]}
            />
          </div>
        </div>
        {hasLocation && (
          <div className="relative mt-[6mm] overflow-hidden rounded-[14px]" style={{ width: CONTENT_W, height: 210 }}>
            <StaticMap centre={centre} zoom={hasPlot ? Math.max(15, fitZoom(p.polygon, CONTENT_W, 210, 0.3)) : 16} width={CONTENT_W} height={210} kind="sat" polygon={p.polygon} />
            <Caption>صورة جوية للموقع والأحياء المحيطة</Caption>
          </div>
        )}
        <Footer page={2} pages={pages} office={office} />
      </section>

      {/* 3. investment */}
      <section className="report-page px-[15mm] pt-[16mm] pb-[20mm]" data-page={next()}>
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
        <div className="mt-[5mm] rounded-[14px] bg-[linear-gradient(135deg,#0e2a3b,#17405a)] px-[6mm] py-[4mm] text-white">
          <span className="mb-[2mm] inline-block rounded-full bg-gold-2 px-3 text-[8pt] font-semibold text-navy">✦ قراءة استثمارية آلية</span>
          <p className="text-[9.5pt] leading-[1.9] text-white/90">
            أعلى عائد سنوي متوقع في سيناريو «{inv.best.title}» بنسبة {inv.best.yieldPct.toFixed(1)}% {inv.best.period}
            {inv.scenarios.length > 1 ? `، مقارنة بـ ${inv.scenarios.filter((s) => !s.best).map((s) => `«${s.title}» (${s.yieldPct.toFixed(1)}% ${s.period})`).join(" و")}` : ""}. بنمو سنوي {p.growth}% تصل القيمة التقديرية للعقار إلى {money(inv.projection[5])} {p.currency} بعد 5 سنوات.
          </p>
        </div>
        <p className="mt-[4mm] text-[7.5pt] text-muted">جميع الأرقام تقديرية مبنية على المدخلات، ولا تُعد توصية استثمارية.</p>
        <Footer page={3} pages={pages} office={office} />
      </section>

      {/* 4. maps */}
      <section className="report-page px-[15mm] pt-[16mm] pb-[20mm]" data-page={next()}>
        <Header title="الموقع على الخرائط" office={office} />
        {hasLocation ? (
          <>
            <MapBox caption="خريطة الموقع" attr={ATTRIBUTION.street}>
              <StaticMap centre={centre} zoom={16} width={CONTENT_W} height={330} kind="street" marker />
            </MapBox>
            <MapBox caption={hasPlot ? "صورة القمر الصناعي وحدود القطعة" : "صورة القمر الصناعي"} attr={ATTRIBUTION.sat}>
              <StaticMap centre={centre} zoom={hasPlot ? fitZoom(p.polygon, CONTENT_W, 330, 0.5) : 18} width={CONTENT_W} height={330} kind="sat" polygon={p.polygon} />
            </MapBox>
            <div className="grid grid-cols-2 gap-[4mm]">
              <QrCard src={qr.maps} title="افتح الموقع في Google Maps" text="امسح الرمز بكاميرا الجوال للوصول مباشرة للموقع والاتجاهات" />
              <QrCard src={qr.earth} title="شاهد الموقع في Google Earth" text="عرض ثلاثي الأبعاد للأرض والمباني المحيطة" />
            </div>
          </>
        ) : (
          <p className="text-muted">لم يُحدد موقع العقار بعد.</p>
        )}
        <Footer page={4} pages={pages} office={office} />
      </section>

      {/* 5. photos (optional) */}
      {p.photos.length > 1 && (
        <section className="report-page px-[15mm] pt-[16mm] pb-[20mm]" data-page={next()}>
          <Header title="صور العقار" office={office} />
          <div className="grid grid-cols-2 gap-[4mm]">
            {p.photos.slice(0, 6).map((src, i) => (
              <img key={i} src={src} alt="" className={`w-full rounded-[12px] object-cover ${i === 0 ? "col-span-2 h-[95mm]" : "h-[62mm]"}`} />
            ))}
          </div>
          <Footer page={n} pages={pages} office={office} />
        </section>
      )}

      {/* 6. sketch */}
      <section className="report-page px-[15mm] pt-[16mm] pb-[20mm]" data-page={next()}>
        <Header title="المخطط المساحي للقطعة" office={office} />
        <div className="h-[118mm] rounded-[14px] border border-line bg-white bg-[linear-gradient(#f1ece2_1px,transparent_1px),linear-gradient(90deg,#f1ece2_1px,transparent_1px)] bg-[length:18px_18px]">
          <PlotSketch polygon={p.polygon} neighbours={p.sides.map((s) => s.neighbour)} plotNo={p.plotNo} area={inv.area} />
        </div>
        {hasPlot && (
          <div className="grid grid-cols-2 gap-[6mm]">
            <div>
              <H3>الحدود والأطوال</H3>
              <Grid
                head={["الحد", "المجاور", "الطول"]}
                rows={lens.map((l, i) => [`الحد ${facings[i]}`, p.sides[i]?.neighbour || "—", `${l.toFixed(2)} م`])}
                total={["المساحة الإجمالية", `${fmt(inv.area)} م²`]}
              />
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
        <Footer page={pages} pages={pages} office={office} />
      </section>
    </div>
  );
}

function Footer({ page, pages, office }: { page: number; pages: number; office: Office }) {
  return (
    <footer className="absolute inset-x-[15mm] bottom-[8mm] flex justify-between border-t border-line pt-[3mm] text-[7.5pt] text-muted">
      <span>ملف تسويقي مُولَّد آليًا • {office.name}</span>
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
      <h2 className="relative text-[19pt] font-bold text-navy after:absolute after:-bottom-[7mm] after:left-0 after:h-[3px] after:w-[46px] after:rounded after:bg-gold">
        {title}
      </h2>
    </header>
  );
}

function H3({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="mt-[6mm] mb-[3mm] flex items-center gap-2 text-[12.5pt] font-bold text-navy before:h-2 before:w-2 before:rounded-sm before:bg-gold">{children}</h3>
  );
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

function Kpi({ label, value, unit }: { label: string; value: string; unit: string }) {
  return (
    <div className="rounded-[13px] border border-t-[3px] border-line border-t-gold bg-white px-[5mm] py-[4mm]">
      <small className="block text-[8.5pt] text-muted">{label}</small>
      <b className="block text-[18pt] leading-[1.4] text-navy">{value}</b>
      <i className="text-[8pt] not-italic text-muted">{unit}</i>
    </div>
  );
}

function KV({ rows }: { rows: [string, React.ReactNode][] }) {
  const shown = rows.filter(([, v]) => v);
  return (
    <table className="w-full border-separate border-spacing-0 overflow-hidden rounded-[11px] border border-line bg-white text-[9.5pt]">
      <tbody>
        {shown.map(([k, v], i) => (
          <tr key={k}>
            <th className={`w-[40%] px-[3.5mm] py-[1.6mm] text-right font-medium text-muted ${i ? "border-t border-[#f0ebe0]" : ""}`}>{k}</th>
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

function MapBox({ children, caption, attr }: { children: React.ReactNode; caption: string; attr: string }) {
  return (
    <div className="relative mb-[5mm] overflow-hidden rounded-[14px] border border-line" style={{ width: CONTENT_W, height: 330 }}>
      {children}
      <Caption>{caption}</Caption>
      <span className="absolute bottom-[2mm] left-[3mm] rounded bg-white/75 px-1.5 text-[6.5pt] text-[#333]" dir="ltr">
        {attr}
      </span>
    </div>
  );
}

function QrCard({ src, title, text }: { src: string; title: string; text: string }) {
  return (
    <div className="flex items-center gap-[4mm] rounded-[13px] border border-line bg-white p-[3.5mm]">
      {src && <img src={src} alt="" className="h-[27mm] w-[27mm]" />}
      <div>
        <b className="block text-[10.5pt] leading-[1.5] text-navy">{title}</b>
        <small className="mt-1 block text-[8.5pt] leading-[1.6] text-muted">{text}</small>
      </div>
    </div>
  );
}
