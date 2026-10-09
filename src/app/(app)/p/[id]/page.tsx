"use client";

import {
  Building2,
  Camera,
  Check,
  ExternalLink,
  FileText,
  Home,
  Landmark,
  Loader2,
  MapPinned,
  Navigation,
  Plus,
  RefreshCw,
  Ruler,
  Scale,
  Sparkles,
  TrendingUp,
  Wand2,
  X,
} from "lucide-react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import AppNav from "@/components/AppNav";
import ComparableForm, { blankComparable } from "@/components/ComparableForm";
import PhotoGrid from "@/components/PhotoGrid";
import { mapsUrl } from "@/components/Report";
import { buttonClass, Field, inputClass, Section, TopBar } from "@/components/ui";
import { priceM2 as compM2, stats } from "@/lib/comparables";
import { fmt, investment, plotArea } from "@/lib/finance";
import { centroid, sideFacing, sideLengths, type LatLng } from "@/lib/geo";
import { fetchDistances, fetchStreets, getProperty, listComparables, saveProperty } from "@/lib/store";
import { COMPARABLE_LABEL, type Building, type Comparable, type Property } from "@/lib/types";

const MapEditor = dynamic(() => import("@/components/MapEditor"), {
  ssr: false,
  loading: () => <div className="grid h-[560px] place-items-center rounded-2xl border border-line bg-white text-muted">جارٍ تحميل الخريطة…</div>,
});

const TYPES = ["أرض", "فيلا", "عمارة", "شقة", "مستودع", "معرض", "مزرعة", "مبنى تجاري", "مجمع تجاري", "برج مكتبي"];
const USES = ["تجاري", "سكني", "سكني تجاري", "صناعي", "زراعي", "استثماري", "مكتبي"];
const BUILDING_USES = ["سكني", "تجاري", "سكني تجاري", "مكتبي", "فندقي", "صناعي"];
const SYSTEMS = ["سكني — دورين وملحق", "سكني — 3 أدوار", "تجاري — 4 أدوار", "تجاري — 6 أدوار", "مكتبي — 8 أدوار", "حسب الاشتراطات"];
const NEIGHBOUR_CHIPS = ["شارع عرض 40 م", "شارع عرض 30 م", "شارع عرض 20 م", "شارع عرض 15 م", "ممر مشاة", "جار"];
const HIGHLIGHT_IDEAS = ["زاوية على شارعين", "قريب من الطرق الرئيسية", "حي مكتمل الخدمات", "صك إلكتروني جاهز", "شكل منتظم", "إطلالة مميزة"];

const toNum = (v: string) => Number(v.replace(/[^\d.]/g, "")) || 0;

function centreOf(p: Property): LatLng | null {
  if (p.polygon.length >= 3) return centroid(p.polygon);
  return p.lat != null && p.lon != null ? [p.lat, p.lon] : null;
}

export default function EditProperty() {
  const { id } = useParams<{ id: string }>();
  const [p, setP] = useState<Property | null | undefined>(undefined);
  const [saveState, setSaveState] = useState<"saved" | "saving" | "error">("saved");
  const [writing, setWriting] = useState(false);
  const [writeNote, setWriteNote] = useState("");
  const [newHighlight, setNewHighlight] = useState("");
  const [geoBusy, setGeoBusy] = useState({ distances: false, streets: false });
  const [geoError, setGeoError] = useState("");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pending = useRef<Property | null>(null);

  useEffect(() => {
    getProperty(id).then(setP);
  }, [id]);

  const flush = useCallback(async () => {
    const next = pending.current;
    if (!next) return;
    pending.current = null;
    try {
      await saveProperty(next);
      setSaveState(pending.current ? "saving" : "saved");
    } catch {
      setSaveState("error");
    }
  }, []);

  // Save whatever is pending before the tab closes or the user navigates away.
  useEffect(() => {
    const onLeave = () => {
      if (pending.current) navigator.sendBeacon?.(`/api/properties/${pending.current.id}`, new Blob([JSON.stringify(pending.current)], { type: "application/json" }));
    };
    window.addEventListener("pagehide", onLeave);
    return () => {
      window.removeEventListener("pagehide", onLeave);
      if (timer.current) clearTimeout(timer.current);
      flush();
    };
  }, [flush]);

  const commit = useCallback(
    (next: Property) => {
      pending.current = next;
      setSaveState("saving");
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(flush, 500);
    },
    [flush],
  );

  const update = useCallback(
    (patch: Partial<Property> | ((cur: Property) => Partial<Property>)) => {
      setP((cur) => {
        if (!cur) return cur;
        const next = { ...cur, ...(typeof patch === "function" ? patch(cur) : patch) };
        commit(next);
        return next;
      });
    },
    [commit],
  );

  const onMap = useCallback(
    (v: { lat: number | null; lon: number | null; polygon: LatLng[] }) =>
      update((cur) => ({ ...v, sides: v.polygon.length >= 3 ? v.polygon.map((_, i) => cur.sides[i] ?? { neighbour: "" }) : cur.sides })),
    [update],
  );

  // ── distances & street names follow the plot automatically ──
  const centre = p ? centreOf(p) : null;
  const distKey = centre && p ? `${centre[0].toFixed(4)},${centre[1].toFixed(4)},${p.city.trim()}` : "";
  const streetKey = centre ? `${centre[0].toFixed(4)},${centre[1].toFixed(4)}` : "";

  const loadDistances = useCallback(
    async (c: LatLng, city: string, key: string) => {
      setGeoBusy((b) => ({ ...b, distances: true }));
      setGeoError("");
      try {
        const distances = await fetchDistances(c[0], c[1], city);
        update({ distances, distancesKey: key });
      } catch (e) {
        setGeoError((e as Error).message);
      } finally {
        setGeoBusy((b) => ({ ...b, distances: false }));
      }
    },
    [update],
  );

  const loadStreets = useCallback(
    async (c: LatLng, key: string) => {
      setGeoBusy((b) => ({ ...b, streets: true }));
      try {
        const streets = await fetchStreets(c[0], c[1]);
        update({ streets, streetsKey: key });
      } catch {
        // street labels are a bonus on the map; the report works without them
      } finally {
        setGeoBusy((b) => ({ ...b, streets: false }));
      }
    },
    [update],
  );

  const city = p?.city.trim() ?? "";

  useEffect(() => {
    if (!centre || !p || distKey === p.distancesKey) return;
    const t = setTimeout(() => loadDistances(centre, city, distKey), 1200);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- refetch only when the location key changes
  }, [distKey, p?.distancesKey, loadDistances]);

  useEffect(() => {
    if (!centre || !p || streetKey === p.streetsKey) return;
    const t = setTimeout(() => loadStreets(centre, streetKey), 1200);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- refetch only when the location key changes
  }, [streetKey, p?.streetsKey, loadStreets]);

  if (p === undefined) return <div className="grid min-h-screen place-items-center text-muted">جارٍ التحميل…</div>;
  if (p === null)
    return (
      <div className="grid min-h-screen place-items-center px-4 text-center">
        <div>
          <h1 className="text-xl font-bold text-navy">العقار غير موجود</h1>
          <Link href="/" className={`${buttonClass("primary")} mt-4`}>
            العودة للرئيسية
          </Link>
        </div>
      </div>
    );

  const isBuilding = p.kind === "building";
  const inv = investment(p);
  const area = plotArea(p);
  const lens = p.polygon.length >= 3 ? sideLengths(p.polygon) : [];
  const text = (k: keyof Property) => ({
    value: (p[k] as string) ?? "",
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => update({ [k]: e.target.value }),
  });
  const num = (k: keyof Property) => ({
    value: (p[k] as number) || "",
    inputMode: "decimal" as const,
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => update({ [k]: toNum(e.target.value) }),
  });
  const setB = (patch: Partial<Building>) => update((cur) => ({ building: { ...cur.building, ...patch } }));
  const bNum = (k: keyof Building) => ({
    value: (p.building[k] as number) || "",
    inputMode: "decimal" as const,
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => setB({ [k]: toNum(e.target.value) }),
  });

  async function writeDescription() {
    setWriting(true);
    setWriteNote("");
    try {
      const res = await fetch("/api/describe", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          title: p!.title,
          city: p!.city,
          district: p!.district,
          type: p!.type,
          use: p!.use,
          condition: p!.condition,
          area: inv.area,
          frontages: p!.sides.map((s) => s.neighbour).filter((n) => /شارع|طريق/.test(n)),
          priceM2: p!.priceM2,
          currency: p!.currency,
          bestScenario: inv.best.title,
          bestYield: inv.best.yieldPct,
          highlights: p!.highlights,
        }),
      });
      const data = (await res.json()) as { text: string; source: "ai" | "template" };
      update({ description: data.text });
      setWriteNote(data.source === "ai" ? "كُتب بالذكاء الاصطناعي — راجعه وعدّله كما تحب" : "وصف تلقائي من بيانات العقار — راجعه وعدّله كما تحب");
    } catch {
      setWriteNote("تعذر توليد الوصف الآن، حاول مرة أخرى");
    } finally {
      setWriting(false);
    }
  }

  let step = 0;
  const next = () => ++step;

  return (
    <>
      <TopBar>
        <span className="hidden items-center gap-1.5 text-sm text-muted sm:flex">
          {saveState === "saved" ? <Check className="h-4 w-4 text-emerald-600" /> : saveState === "saving" ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4 text-red-600" />}
          {saveState === "saved" ? "تم الحفظ" : saveState === "saving" ? "جارٍ الحفظ" : "لم يُحفظ — تحقق من الاتصال"}
        </span>
        <AppNav />
        <Link href={`/p/${p.id}/report`} className={buttonClass("gold")}>
          <FileText className="h-4 w-4" /> <span className="hidden sm:inline">معاينة وتحميل</span> PDF
        </Link>
      </TopBar>

      <main className="mx-auto grid max-w-6xl gap-6 px-4 py-8 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="min-w-0 space-y-6">
          {/* ── what is being marketed ── */}
          <div className="grid grid-cols-2 gap-3">
            {(
              [
                ["land", "أرض فقط", "أرض خام أو مطوّرة بدون مبنى", Ruler],
                ["building", "أرض ومبنى", "عمارة، فيلا، مجمع، برج…", Building2],
              ] as const
            ).map(([k, title, desc, Icon]) => {
              const active = p.kind === k;
              return (
                <button
                  key={k}
                  type="button"
                  onClick={() => update((cur) => ({ kind: k, type: k === "land" ? "أرض" : cur.type === "أرض" ? "عمارة" : cur.type }))}
                  className={`flex items-center gap-3 rounded-2xl border-2 p-4 text-right transition ${active ? "border-gold bg-gold-soft/50 shadow-card" : "border-line bg-white hover:border-gold/50"}`}
                >
                  <span className={`grid h-12 w-12 shrink-0 place-items-center rounded-xl ${active ? "bg-navy text-white" : "bg-background text-muted"}`}>
                    <Icon className="h-6 w-6" />
                  </span>
                  <span>
                    <span className="block font-bold text-navy">{title}</span>
                    <span className="block text-xs text-muted sm:text-sm">{desc}</span>
                  </span>
                  {active && <Check className="mr-auto h-5 w-5 shrink-0 text-gold" />}
                </button>
              );
            })}
          </div>

          <Section step={next()} title="البيانات الأساسية" desc="العنوان يظهر بخط كبير على غلاف الملف" icon={<Home className="h-5 w-5" />}>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="عنوان العقار" className="sm:col-span-2">
                <input {...text("title")} placeholder={isBuilding ? "مثال: عمارة تجارية سكنية على شارعين" : "مثال: أرض تجارية على زاوية بثلاث واجهات"} className={inputClass} />
              </Field>
              <Field label="نوع العقار">
                <select {...text("type")} className={inputClass}>
                  {(isBuilding ? TYPES.filter((t) => t !== "أرض") : TYPES).map((t) => (
                    <option key={t}>{t}</option>
                  ))}
                </select>
              </Field>
              <Field label="حالة العقار">
                <input {...text("condition")} placeholder={isBuilding ? "مؤجر بالكامل، جديد لم يُسكن…" : "جاهزة للتطوير، مسوّرة…"} className={inputClass} />
              </Field>
              <Field label="المدينة" hint="تُحسب المسافات لمعالم هذه المدينة">
                <input {...text("city")} placeholder="الرياض" className={inputClass} />
              </Field>
              <Field label="الحي">
                <input {...text("district")} placeholder="الملقا" className={inputClass} />
              </Field>
            </div>
          </Section>

          <Section step={next()} title="البيانات المكانية" desc="من الصك أو المخطط المعتمد — تظهر في جدول بيانات العقار" icon={<Landmark className="h-5 w-5" />}>
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="رقم المخطط">
                <input {...text("planNo")} className={inputClass} />
              </Field>
              <Field label="رقم البلك">
                <input {...text("blockNo")} className={inputClass} />
              </Field>
              <Field label="رقم القطعة">
                <input {...text("plotNo")} className={inputClass} />
              </Field>
              <Field label="استخدام الأرض">
                <select {...text("use")} className={inputClass}>
                  {USES.map((t) => (
                    <option key={t}>{t}</option>
                  ))}
                </select>
              </Field>
              <Field label="نظام البناء">
                <input {...text("buildingSystem")} list="systems" placeholder="مثال: تجاري — 4 أدوار" className={inputClass} />
                <datalist id="systems">
                  {SYSTEMS.map((s) => (
                    <option key={s} value={s} />
                  ))}
                </datalist>
              </Field>
              <Field label="معامل البناء">
                <input {...text("buildingFactor")} inputMode="decimal" placeholder="مثال: 2.4" className={inputClass} />
              </Field>
            </div>
          </Section>

          <Section step={next()} title="الموقع وحدود القطعة" desc="حدد موقع العقار ثم ارسم أركان القطعة — تُحسب الأطوال والمساحة والمسافات وأسماء الشوارع تلقائيًا" icon={<MapPinned className="h-5 w-5" />}>
            <MapEditor lat={p.lat} lon={p.lon} polygon={p.polygon} onChange={onMap} />

            {centre && (
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <a href={mapsUrl(centre)} target="_blank" rel="noreferrer" className={`${buttonClass("outline")} h-10 text-sm`}>
                  <Navigation className="h-4 w-4 text-[#1a73e8]" /> افتح الموقع في قوقل ماب <ExternalLink className="h-3.5 w-3.5 text-muted" />
                </a>
                <span className="flex items-center gap-1.5 rounded-xl bg-background px-3 py-2 text-xs text-muted">
                  {geoBusy.streets ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5 text-emerald-600" />}
                  {geoBusy.streets ? "جارٍ جلب أسماء الشوارع…" : p.streets.length ? `${p.streets.length} شارعًا باسمه على خرائط الملف` : "لا توجد أسماء شوارع مسجلة حول الموقع"}
                </span>
              </div>
            )}

            {lens.length > 0 ? (
              <div className="mt-5">
                <h3 className="mb-3 font-semibold text-navy">المجاورون لكل حد</h3>
                <div className="space-y-3">
                  {lens.map((l, i) => (
                    <div key={i} className="rounded-xl border border-line bg-background/60 p-3">
                      <div className="mb-2 flex items-center justify-between text-sm">
                        <span className="font-semibold">
                          الحد {sideFacing(p.polygon, i)} <span className="text-muted">({i + 1} ← {((i + 1) % lens.length) + 1})</span>
                        </span>
                        <span className="font-bold text-[#8d6a2a]">{l.toFixed(2)} م</span>
                      </div>
                      <input
                        value={p.sides[i]?.neighbour ?? ""}
                        onChange={(e) => update((cur) => ({ sides: cur.sides.map((s, j) => (j === i ? { neighbour: e.target.value } : s)) }))}
                        placeholder="مثال: شارع عرض 30 م، أو قطعة رقم 1206"
                        className={inputClass}
                      />
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {NEIGHBOUR_CHIPS.map((c) => (
                          <button key={c} type="button" onClick={() => update((cur) => ({ sides: cur.sides.map((s, j) => (j === i ? { neighbour: c } : s)) }))} className="rounded-full border border-line bg-white px-2.5 py-0.5 text-xs text-muted hover:border-gold hover:text-foreground">
                            {c}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <Field label="المساحة (م²)" hint="أو ارسم حدود القطعة على الخريطة لتُحسب تلقائيًا" className="mt-5 max-w-xs">
                <input value={p.manualArea || ""} inputMode="decimal" onChange={(e) => update({ manualArea: toNum(e.target.value) || null })} className={inputClass} />
              </Field>
            )}
          </Section>

          <Section step={next()} title="المسافات إلى أهم المعالم" desc="مسافة وزمن القيادة الفعلي على الطرق — تُحسب تلقائيًا عند تحديد الموقع" icon={<Navigation className="h-5 w-5" />}>
            {!centre ? (
              <p className="rounded-xl bg-background px-4 py-6 text-center text-sm text-muted">حدد موقع العقار على الخريطة أولًا</p>
            ) : (
              <>
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm text-muted">
                    المعالم مأخوذة من <Link href="/settings" className="font-semibold text-navy underline-offset-4 hover:underline">الإعدادات</Link> لمدينة «{p.city || "—"}»
                  </p>
                  <button type="button" disabled={geoBusy.distances} onClick={() => loadDistances(centre, p.city.trim(), distKey)} className={`${buttonClass("outline")} h-9 px-3 text-sm`}>
                    <RefreshCw className={`h-4 w-4 ${geoBusy.distances ? "animate-spin" : ""}`} /> إعادة الحساب
                  </button>
                </div>
                {geoError && <p className="mb-3 rounded-xl bg-red-50 px-4 py-2 text-sm text-red-700">{geoError}</p>}
                {geoBusy.distances && !p.distances.length ? (
                  <div className="grid place-items-center rounded-xl bg-background py-8 text-sm text-muted">
                    <Loader2 className="mb-2 h-5 w-5 animate-spin" /> جارٍ حساب المسافات…
                  </div>
                ) : p.distances.length ? (
                  <div className={`overflow-hidden rounded-xl border border-line transition ${geoBusy.distances ? "opacity-50" : ""}`}>
                    <table className="w-full text-sm">
                      <thead className="bg-navy text-white">
                        <tr>
                          <th className="px-3 py-2.5 text-right font-semibold">المعلم</th>
                          <th className="px-3 py-2.5 text-right font-semibold">المسافة</th>
                          <th className="px-3 py-2.5 text-right font-semibold">الزمن</th>
                        </tr>
                      </thead>
                      <tbody>
                        {[...p.distances]
                          .sort((a, b) => a.km - b.km)
                          .map((d) => (
                            <tr key={d.name} className="border-t border-line odd:bg-background/50">
                              <td className="px-3 py-2.5 font-medium">{d.name}</td>
                              <td className="px-3 py-2.5 font-bold text-navy">{d.km.toFixed(1)} كم</td>
                              <td className="px-3 py-2.5 text-muted">{d.minutes} دقيقة</td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="rounded-xl bg-background px-4 py-6 text-center text-sm text-muted">
                    لا توجد معالم لمدينة «{p.city}». <Link href="/settings" className="font-semibold text-navy underline">أضف المعالم من الإعدادات</Link>
                  </p>
                )}
              </>
            )}
          </Section>

          {isBuilding && (
            <Section step={next()} title="بيانات المبنى" desc="تظهر في صفحة مستقلة بالملف مع صور المبنى" icon={<Building2 className="h-5 w-5" />}>
              <div className="grid gap-4 sm:grid-cols-3">
                <Field label="استخدام المبنى">
                  <div className="flex flex-wrap gap-1.5">
                    {BUILDING_USES.map((u) => (
                      <button key={u} type="button" onClick={() => setB({ use: u })} className={`h-9 rounded-lg border px-3 text-sm font-semibold transition ${p.building.use === u ? "border-navy bg-navy text-white" : "border-line bg-white text-muted hover:border-gold"}`}>
                        {u}
                      </button>
                    ))}
                  </div>
                </Field>
                <Field label="عدد الأدوار">
                  <input {...bNum("floors")} className={inputClass} />
                </Field>
                <Field label="عدد الوحدات">
                  <input {...bNum("units")} className={inputClass} />
                </Field>
                <Field label="عمر المبنى (سنة)">
                  <input {...bNum("age")} className={inputClass} />
                </Field>
                <Field label="مسطحات البناء (م²)">
                  <input {...bNum("builtArea")} className={inputClass} />
                </Field>
                <Field label={`الدخل الإجمالي السنوي (${p.currency})`} hint={inv.price && p.building.grossIncome ? `العائد الإجمالي ${((p.building.grossIncome / inv.price) * 100).toFixed(1)}% من سعر البيع` : undefined}>
                  <input {...bNum("grossIncome")} className={inputClass} />
                </Field>
                <Field label="وصف المبنى" className="sm:col-span-3">
                  <textarea
                    value={p.building.description}
                    onChange={(e) => setB({ description: e.target.value })}
                    rows={4}
                    placeholder="مثال: الدور الأرضي 4 معارض، الأدوار العلوية 12 شقة (3 غرف)، مصعد، مواقف خاصة، عدادات مستقلة…"
                    className={`${inputClass} h-auto py-3 leading-relaxed`}
                  />
                </Field>
              </div>
              <h3 className="mt-6 mb-3 font-semibold text-navy">صور المبنى</h3>
              <PhotoGrid propertyId={p.id} group="building" photos={p.buildingPhotos} onChange={(buildingPhotos) => setP((cur) => (cur ? { ...cur, buildingPhotos } : cur))} />
            </Section>
          )}

          <Section step={next()} title="السعر" desc={isBuilding ? "أدخل سعر المتر أو السعر الإجمالي — الآخر يُحسب تلقائيًا" : "سعر المتر يُقارن تلقائيًا بالصفقات والعروض المختارة"} icon={<TrendingUp className="h-5 w-5" />}>
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="سعر المتر">
                <input {...num("priceM2")} className={inputClass} />
              </Field>
              <Field label="السعر الإجمالي" hint={area ? `${fmt(area)} م² × سعر المتر` : "أدخل المساحة أولًا"}>
                <input
                  value={inv.price ? fmt(Math.round(inv.price)) : ""}
                  disabled={!area}
                  inputMode="decimal"
                  onChange={(e) => area && update({ priceM2: Math.round((toNum(e.target.value) / area) * 100) / 100 })}
                  className={inputClass}
                />
              </Field>
              <Field label="العملة">
                <select {...text("currency")} className={inputClass}>
                  {["ريال", "درهم", "دينار", "جنيه", "دولار"].map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </Field>
            </div>
            {!isBuilding && (
              <details className="group mt-5 rounded-xl border border-line bg-background/50">
                <summary className="cursor-pointer list-none px-4 py-3 text-sm font-semibold text-navy">
                  <span className="inline-block transition group-open:rotate-90">‹</span> تقديرات العائد (اختياري)
                </summary>
                <div className="grid gap-4 px-4 pb-4 sm:grid-cols-3">
                  <Field label="النمو السنوي المتوقع %">
                    <input {...num("growth")} className={inputClass} />
                  </Field>
                  <Field label="تكلفة البناء للمتر" hint="لسيناريو التطوير">
                    <input {...num("devCostM2")} className={inputClass} />
                  </Field>
                  <Field label="مسطحات البناء %" hint="من مساحة الأرض">
                    <input {...num("buaRatio")} className={inputClass} />
                  </Field>
                  <Field label="الإيجار السنوي للمتر" hint="بعد التطوير">
                    <input {...num("rentM2")} className={inputClass} />
                  </Field>
                  <Field label="إيجار الأرض سنويًا" hint="لسيناريو التأجير كما هي">
                    <input {...num("landLease")} className={inputClass} />
                  </Field>
                </div>
              </details>
            )}
          </Section>

          <Section step={next()} title="مقارنة الأسعار" desc="اختر الصفقات والعروض المشابهة من قاعدة بياناتك — تظهر في جداول المقارنة بالملف" icon={<Scale className="h-5 w-5" />}>
            <ComparablesPicker p={p} onChange={(comparableIds) => update({ comparableIds })} />
          </Section>

          <Section step={next()} title="المميزات والوصف التسويقي" desc="المميزات تظهر كبطاقات، والوصف في صدر الملف" icon={<Sparkles className="h-5 w-5" />}>
            <div className="flex flex-wrap gap-2">
              {p.highlights.map((h, i) => (
                <span key={i} className="inline-flex items-center gap-1.5 rounded-full bg-gold-soft py-1 pr-3 pl-1.5 text-sm font-medium text-[#6f531f]">
                  {h}
                  <button type="button" onClick={() => update((cur) => ({ highlights: cur.highlights.filter((_, j) => j !== i) }))} className="rounded-full p-0.5 hover:bg-white/70" aria-label="حذف">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </span>
              ))}
            </div>
            <form
              className="mt-3 flex gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                const h = newHighlight.trim();
                if (h) update((cur) => ({ highlights: [...cur.highlights, h] }));
                setNewHighlight("");
              }}
            >
              <input value={newHighlight} onChange={(e) => setNewHighlight(e.target.value)} placeholder="أضف ميزة…" className={inputClass} />
              <button className={buttonClass("outline")}>
                <Plus className="h-4 w-4" /> إضافة
              </button>
            </form>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {HIGHLIGHT_IDEAS.filter((h) => !p.highlights.includes(h)).map((h) => (
                <button key={h} type="button" onClick={() => update((cur) => ({ highlights: [...cur.highlights, h] }))} className="rounded-full border border-dashed border-line px-2.5 py-0.5 text-xs text-muted hover:border-gold hover:text-foreground">
                  + {h}
                </button>
              ))}
            </div>

            <div className="mt-6">
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <span className="text-sm font-semibold text-foreground/85">الوصف التسويقي</span>
                <button type="button" onClick={writeDescription} disabled={writing} className={`${buttonClass("primary")} h-9 px-4 text-sm`}>
                  {writing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
                  {p.description ? "إعادة الكتابة" : "اكتب الوصف تلقائيًا"}
                </button>
              </div>
              <textarea {...text("description")} rows={5} placeholder="اضغط «اكتب الوصف تلقائيًا» أو اكتبه بنفسك" className={`${inputClass} h-auto py-3 leading-relaxed`} />
              {writeNote && <p className="mt-1.5 text-xs text-muted">{writeNote}</p>}
            </div>
          </Section>

          <Section step={next()} title={isBuilding ? "صور العقار من الخارج" : "صور العقار"} desc="الصورة الأولى تصبح غلاف الملف (اختياري — بدونها تُستخدم صورة القمر الصناعي)" icon={<Camera className="h-5 w-5" />}>
            <PhotoGrid propertyId={p.id} group="property" photos={p.photos} coverLabel="الغلاف" onChange={(photos) => setP((cur) => (cur ? { ...cur, photos } : cur))} />
          </Section>
        </div>

        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="overflow-hidden rounded-2xl bg-navy text-white shadow-lift">
            <div className="bg-grid p-5">
              <p className="text-sm text-white/60">{isBuilding ? "أرض ومبنى" : "أرض"} • ملخص العقار</p>
              <h3 className="mt-1 line-clamp-2 text-lg font-bold">{p.title || "عقار بدون عنوان"}</h3>
            </div>
            <dl className="space-y-3 p-5 text-sm">
              <Row label="المساحة" value={area ? `${fmt(area)} م²` : "—"} />
              <Row label="سعر المتر" value={p.priceM2 ? `${fmt(p.priceM2)} ${p.currency}` : "—"} />
              <Row label="السعر الإجمالي" value={inv.price ? `${fmt(inv.price)} ${p.currency}` : "—"} gold />
              {isBuilding && <Row label="الدخل السنوي" value={p.building.grossIncome ? `${fmt(p.building.grossIncome)}` : "—"} />}
              <Row label="المعالم المحسوبة" value={p.distances.length ? `${p.distances.length}` : "—"} />
              <Row label="المقارنات المختارة" value={p.comparableIds.length ? `${p.comparableIds.length}` : "—"} />
            </dl>
            <div className="p-5 pt-0">
              <Link href={`/p/${p.id}/report`} className={`${buttonClass("gold")} w-full`}>
                <FileText className="h-4 w-4" /> معاينة وتحميل PDF
              </Link>
            </div>
          </div>
          <p className="mt-3 text-center text-xs text-muted">يُحفظ كل تعديل تلقائيًا في قاعدة بيانات المكتب</p>
        </aside>
      </main>
    </>
  );
}

function ComparablesPicker({ p, onChange }: { p: Property; onChange: (ids: number[]) => void }) {
  const [all, setAll] = useState<Comparable[] | null>(null);
  const [adding, setAdding] = useState(false);
  const [scope, setScope] = useState<"district" | "city">("city");
  const city = p.city.trim();

  useEffect(() => {
    listComparables(city || undefined)
      .then(setAll)
      .catch(() => setAll([]));
  }, [city]);

  if (all === null) return <div className="grid place-items-center py-8 text-muted"><Loader2 className="h-5 w-5 animate-spin" /></div>;

  const selected = new Set(p.comparableIds);
  const visible = all.filter((c) => scope === "city" || !p.district || c.district === p.district || selected.has(c.id));
  const toggle = (id: number) => onChange(selected.has(id) ? p.comparableIds.filter((x) => x !== id) : [...p.comparableIds, id]);
  const own = p.kind === "building" ? "building" : "land";
  const ownStats = stats(all.filter((c) => selected.has(c.id) && c.category === own));

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex rounded-xl border border-line bg-background p-1 text-sm">
          {(
            [
              ["city", `كل ${city || "المدن"}`],
              ["district", `حي ${p.district || "العقار"}`],
            ] as const
          ).map(([k, l]) => (
            <button key={k} type="button" onClick={() => setScope(k)} className={`h-8 rounded-lg px-3 font-semibold transition ${scope === k ? "bg-white text-navy shadow-card" : "text-muted"}`}>
              {l}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <Link href="/comparables" className={`${buttonClass("ghost")} h-9 px-3 text-sm`}>
            إدارة القاعدة
          </Link>
          {!adding && (
            <button type="button" onClick={() => setAdding(true)} className={`${buttonClass("outline")} h-9 px-3 text-sm`}>
              <Plus className="h-4 w-4" /> صفقة أو عرض جديد
            </button>
          )}
        </div>
      </div>

      {adding && (
        <div className="mb-4">
          <ComparableForm
            initial={blankComparable(city || "الرياض", p.district)}
            onCancel={() => setAdding(false)}
            onSaved={(c) => {
              setAll([c, ...all]);
              onChange([...p.comparableIds, c.id]);
              setAdding(false);
            }}
          />
        </div>
      )}

      {visible.length === 0 ? (
        <p className="rounded-xl bg-background px-4 py-6 text-center text-sm text-muted">لا توجد صفقات أو عروض مسجلة {scope === "district" ? "في هذا الحي" : `في ${city || "هذه المدينة"}`} بعد — أضف أول واحدة من الزر بالأعلى</p>
      ) : (
        <div className="max-h-[420px] overflow-auto rounded-xl border border-line">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-navy text-white">
              <tr>
                <th className="w-10 px-3 py-2.5" />
                <th className="px-2 py-2.5 text-right font-semibold">الفئة</th>
                <th className="px-2 py-2.5 text-right font-semibold">الحي / الوصف</th>
                <th className="px-2 py-2.5 text-right font-semibold">المساحة</th>
                <th className="px-2 py-2.5 text-right font-semibold">سعر المتر</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((c) => (
                <tr key={c.id} onClick={() => toggle(c.id)} className={`cursor-pointer border-t border-line transition ${selected.has(c.id) ? "bg-gold-soft/60" : "hover:bg-background"}`}>
                  <td className="px-3 py-2.5">
                    <span className={`grid h-5 w-5 place-items-center rounded-md border-2 ${selected.has(c.id) ? "border-navy bg-navy text-white" : "border-line bg-white"}`}>{selected.has(c.id) && <Check className="h-3.5 w-3.5" />}</span>
                  </td>
                  <td className="px-2 py-2.5 whitespace-nowrap">
                    <span className="font-semibold">{COMPARABLE_LABEL[c.category]}</span>
                    <span className={`mr-1.5 rounded-full px-1.5 py-0.5 text-[11px] ${c.dealType === "deal" ? "bg-emerald-50 text-emerald-700" : "bg-sky-50 text-sky-700"}`}>{c.dealType === "deal" ? "صفقة" : "عرض"}</span>
                  </td>
                  <td className="px-2 py-2.5">
                    <span className="block font-medium">{c.district || "—"}</span>
                    {c.description && <span className="block text-xs text-muted">{c.description}</span>}
                  </td>
                  <td className="px-2 py-2.5 whitespace-nowrap">{fmt(c.area)} م²</td>
                  <td className="px-2 py-2.5 font-bold whitespace-nowrap text-navy">{fmt(compM2(c))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {ownStats && p.priceM2 > 0 && (
        <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1 rounded-xl bg-background px-4 py-3 text-sm">
          <span className="text-muted">متوسط {COMPARABLE_LABEL[own]} المختارة:</span>
          <b className="text-navy">{fmt(ownStats.avg)} للمتر</b>
          <span className={p.priceM2 <= ownStats.avg ? "font-semibold text-emerald-700" : "font-semibold text-amber-700"}>
            سعر العقار {p.priceM2 <= ownStats.avg ? "أقل" : "أعلى"} من المتوسط بـ {Math.abs(((p.priceM2 - ownStats.avg) / ownStats.avg) * 100).toFixed(1)}%
          </span>
        </div>
      )}
    </div>
  );
}

function Row({ label, value, gold }: { label: string; value: string; gold?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-white/10 pb-3 last:border-0 last:pb-0">
      <dt className="text-white/60">{label}</dt>
      <dd className={`font-bold ${gold ? "text-gold-2" : ""}`}>{value}</dd>
    </div>
  );
}
