"use client";

/* eslint-disable @next/next/no-img-element -- photo previews are data URLs */
import { Building2, Camera, Check, FileText, ImagePlus, Loader2, MapPinned, Plus, Sparkles, Star, TrendingUp, Wand2, X } from "lucide-react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { buttonClass, Field, inputClass, Section, TopBar } from "@/components/ui";
import { fmt, investment, plotArea } from "@/lib/finance";
import { sideFacing, sideLengths, type LatLng } from "@/lib/geo";
import { compressImage, getProperty, saveProperty } from "@/lib/store";
import type { Property } from "@/lib/types";

const MapEditor = dynamic(() => import("@/components/MapEditor"), {
  ssr: false,
  loading: () => <div className="grid h-[560px] place-items-center rounded-2xl border border-line bg-white text-muted">جارٍ تحميل الخريطة…</div>,
});

const TYPES = ["أرض", "فيلا", "عمارة", "شقة", "مستودع", "معرض", "مزرعة", "مبنى تجاري"];
const USES = ["تجاري", "سكني", "سكني تجاري", "صناعي", "زراعي", "استثماري"];
const NEIGHBOUR_CHIPS = ["شارع عرض 40 م", "شارع عرض 30 م", "شارع عرض 20 م", "شارع عرض 15 م", "ممر مشاة", "جار"];
const HIGHLIGHT_IDEAS = ["زاوية على شارعين", "قريب من الطرق الرئيسية", "حي مكتمل الخدمات", "صك إلكتروني جاهز", "شكل منتظم", "إطلالة مميزة"];

export default function EditProperty() {
  const { id } = useParams<{ id: string }>();
  const [p, setP] = useState<Property | null | undefined>(undefined);
  const [saved, setSaved] = useState(true);
  const [writing, setWriting] = useState(false);
  const [writeNote, setWriteNote] = useState("");
  const [newHighlight, setNewHighlight] = useState("");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    getProperty(id).then((x) => setP(x ?? null));
  }, [id]);

  const update = useCallback((patch: Partial<Property>) => {
    setP((cur) => {
      if (!cur) return cur;
      const next = { ...cur, ...patch };
      setSaved(false);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => saveProperty(next).then(() => setSaved(true)), 400);
      return next;
    });
  }, []);

  const onMap = useCallback(
    (v: { lat: number | null; lon: number | null; polygon: LatLng[] }) => {
      setP((cur) => {
        if (!cur) return cur;
        const sides = v.polygon.length >= 3 ? v.polygon.map((_, i) => cur.sides[i] ?? { neighbour: "" }) : cur.sides;
        const next = { ...cur, ...v, sides };
        setSaved(false);
        if (timer.current) clearTimeout(timer.current);
        timer.current = setTimeout(() => saveProperty(next).then(() => setSaved(true)), 400);
        return next;
      });
    },
    [],
  );

  if (p === undefined) return <div className="grid min-h-screen place-items-center text-muted">جارٍ التحميل…</div>;
  if (p === null)
    return (
      <div className="grid min-h-screen place-items-center px-4 text-center">
        <div>
          <h1 className="text-xl font-bold text-navy">العقار غير موجود على هذا الجهاز</h1>
          <Link href="/" className={`${buttonClass("primary")} mt-4`}>
            العودة للرئيسية
          </Link>
        </div>
      </div>
    );

  const inv = investment(p);
  const lens = p.polygon.length >= 3 ? sideLengths(p.polygon) : [];
  const text = (k: keyof Property) => ({
    value: (p[k] as string) ?? "",
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => update({ [k]: e.target.value }),
  });
  const num = (k: keyof Property) => ({
    value: (p[k] as number) || "",
    inputMode: "decimal" as const,
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => update({ [k]: Number(e.target.value.replace(/[^\d.]/g, "")) || 0 }),
  });

  async function addPhotos(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []).slice(0, 8 - p!.photos.length);
    const urls = await Promise.all(files.map((f) => compressImage(f)));
    update({ photos: [...p!.photos, ...urls] });
    e.target.value = "";
  }

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
      setWriteNote(data.source === "ai" ? "كُتب بالذكاء الاصطناعي — راجعه وعدّله كما تحب" : "نسخة العرض: وصف تلقائي من البيانات (يتفعّل الذكاء الاصطناعي بعد ربط مفتاح الخدمة)");
    } catch {
      setWriteNote("تعذر توليد الوصف الآن، حاول مرة أخرى");
    } finally {
      setWriting(false);
    }
  }

  const area = plotArea(p);

  return (
    <>
      <TopBar>
        <span className="hidden items-center gap-1.5 text-sm text-muted sm:flex">
          {saved ? <Check className="h-4 w-4 text-emerald-600" /> : <Loader2 className="h-4 w-4 animate-spin" />}
          {saved ? "تم الحفظ" : "جارٍ الحفظ"}
        </span>
        <Link href={`/p/${p.id}/report`} className={buttonClass("gold")}>
          <FileText className="h-4 w-4" /> معاينة وتحميل PDF
        </Link>
      </TopBar>

      <main className="mx-auto grid max-w-6xl gap-6 px-4 py-8 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="min-w-0 space-y-6">
          <Section step={1} title="البيانات الأساسية" desc="العنوان يظهر بخط كبير على غلاف الملف" icon={<Building2 className="h-5 w-5" />}>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="عنوان العقار" className="sm:col-span-2">
                <input {...text("title")} placeholder="مثال: أرض تجارية على زاوية بثلاث واجهات" className={inputClass} />
              </Field>
              <Field label="نوع العقار">
                <select {...text("type")} className={inputClass}>
                  {TYPES.map((t) => (
                    <option key={t}>{t}</option>
                  ))}
                </select>
              </Field>
              <Field label="الاستخدام">
                <select {...text("use")} className={inputClass}>
                  {USES.map((t) => (
                    <option key={t}>{t}</option>
                  ))}
                </select>
              </Field>
              <Field label="المدينة">
                <input {...text("city")} placeholder="الرياض" className={inputClass} />
              </Field>
              <Field label="الحي">
                <input {...text("district")} placeholder="الملقا" className={inputClass} />
              </Field>
              <Field label="رقم المخطط">
                <input {...text("planNo")} className={inputClass} />
              </Field>
              <Field label="رقم القطعة">
                <input {...text("plotNo")} className={inputClass} />
              </Field>
              <Field label="حالة العقار" className="sm:col-span-2">
                <input {...text("condition")} placeholder="جاهزة للتطوير، مؤجرة بالكامل، تحت الإنشاء…" className={inputClass} />
              </Field>
            </div>
          </Section>

          <Section step={2} title="الموقع وحدود القطعة" desc="حدد موقع العقار، ثم ارسم أركان القطعة لتُحسب الأطوال والمساحة تلقائيًا" icon={<MapPinned className="h-5 w-5" />}>
            <MapEditor lat={p.lat} lon={p.lon} polygon={p.polygon} onChange={onMap} />
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
                        onChange={(e) => update({ sides: p.sides.map((s, j) => (j === i ? { neighbour: e.target.value } : s)) })}
                        placeholder="مثال: شارع عرض 30 م، أو قطعة رقم 1206"
                        className={inputClass}
                      />
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {NEIGHBOUR_CHIPS.map((c) => (
                          <button key={c} type="button" onClick={() => update({ sides: p.sides.map((s, j) => (j === i ? { neighbour: c } : s)) })} className="rounded-full border border-line bg-white px-2.5 py-0.5 text-xs text-muted hover:border-gold hover:text-foreground">
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
                <input value={p.manualArea || ""} inputMode="decimal" onChange={(e) => update({ manualArea: Number(e.target.value.replace(/[^\d.]/g, "")) || null })} className={inputClass} />
              </Field>
            )}
          </Section>

          <Section step={3} title="السعر والاستثمار" desc="تُحسب العوائد والسيناريوهات من هذه الأرقام" icon={<TrendingUp className="h-5 w-5" />}>
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="سعر المتر">
                <input {...num("priceM2")} className={inputClass} />
              </Field>
              <Field label="العملة">
                <select {...text("currency")} className={inputClass}>
                  {["ريال", "درهم", "دينار", "جنيه", "دولار"].map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </Field>
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
              <Field label="إيجار الأرض سنويًا (اختياري)" hint="لسيناريو التأجير كما هي" className="sm:col-span-3">
                <input {...num("landLease")} className={`${inputClass} sm:max-w-xs`} />
              </Field>
            </div>
          </Section>

          <Section step={4} title="المميزات والوصف التسويقي" desc="المميزات تظهر كبطاقات، والوصف في صدر الملف" icon={<Sparkles className="h-5 w-5" />}>
            <div className="flex flex-wrap gap-2">
              {p.highlights.map((h, i) => (
                <span key={i} className="inline-flex items-center gap-1.5 rounded-full bg-gold-soft py-1 pr-3 pl-1.5 text-sm font-medium text-[#6f531f]">
                  {h}
                  <button type="button" onClick={() => update({ highlights: p.highlights.filter((_, j) => j !== i) })} className="rounded-full p-0.5 hover:bg-white/70" aria-label="حذف">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </span>
              ))}
            </div>
            <form
              className="mt-3 flex gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                if (newHighlight.trim()) update({ highlights: [...p.highlights, newHighlight.trim()] });
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
                <button key={h} type="button" onClick={() => update({ highlights: [...p.highlights, h] })} className="rounded-full border border-dashed border-line px-2.5 py-0.5 text-xs text-muted hover:border-gold hover:text-foreground">
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

          <Section step={5} title="صور العقار" desc="الصورة الأولى تصبح غلاف الملف (اختياري — بدونها يُستخدم القمر الصناعي)" icon={<Camera className="h-5 w-5" />}>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {p.photos.map((src, i) => (
                <div key={i} className="group relative aspect-[4/3] overflow-hidden rounded-xl border border-line">
                  <img src={src} alt="" className="h-full w-full object-cover" />
                  {i === 0 && <span className="absolute top-2 right-2 rounded-full bg-navy/90 px-2 py-0.5 text-[11px] text-white">الغلاف</span>}
                  <div className="absolute inset-x-0 bottom-0 flex justify-between bg-gradient-to-t from-black/60 p-2 opacity-0 transition group-hover:opacity-100">
                    {i > 0 && (
                      <button type="button" onClick={() => update({ photos: [src, ...p.photos.filter((_, j) => j !== i)] })} className="flex items-center gap-1 rounded-lg bg-white/90 px-2 py-1 text-xs">
                        <Star className="h-3 w-3" /> غلاف
                      </button>
                    )}
                    <button type="button" onClick={() => update({ photos: p.photos.filter((_, j) => j !== i) })} className="mr-auto rounded-lg bg-white/90 p-1 text-red-700" aria-label="حذف">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
              {p.photos.length < 8 && (
                <label className="grid aspect-[4/3] cursor-pointer place-items-center rounded-xl border-2 border-dashed border-line text-muted transition hover:border-gold hover:text-foreground">
                  <span className="text-center text-sm">
                    <ImagePlus className="mx-auto mb-1 h-6 w-6" />
                    إضافة صور
                  </span>
                  <input type="file" accept="image/*" multiple onChange={addPhotos} className="hidden" />
                </label>
              )}
            </div>
          </Section>
        </div>

        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="overflow-hidden rounded-2xl bg-navy text-white shadow-lift">
            <div className="bg-grid p-5">
              <p className="text-sm text-white/60">ملخص العقار</p>
              <h3 className="mt-1 line-clamp-2 text-lg font-bold">{p.title || "عقار بدون عنوان"}</h3>
            </div>
            <dl className="space-y-3 p-5 text-sm">
              <Row label="المساحة" value={area ? `${fmt(area)} م²` : "—"} />
              <Row label="السعر الإجمالي" value={inv.price ? `${fmt(inv.price)} ${p.currency}` : "—"} />
              <Row label="أفضل سيناريو" value={inv.price ? inv.best.title : "—"} />
              <Row label="العائد المتوقع" value={inv.price ? `${inv.best.yieldPct.toFixed(1)}% ${inv.best.period}` : "—"} gold />
              <Row label="القيمة بعد 5 سنوات" value={inv.price ? `${fmt(inv.projection[5])}` : "—"} />
            </dl>
            <div className="p-5 pt-0">
              <Link href={`/p/${p.id}/report`} className={`${buttonClass("gold")} w-full`}>
                <FileText className="h-4 w-4" /> معاينة وتحميل PDF
              </Link>
            </div>
          </div>
          <p className="mt-3 text-center text-xs text-muted">يُحفظ كل تعديل تلقائيًا على هذا الجهاز</p>
        </aside>
      </main>
    </>
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
