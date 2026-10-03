"use client";

import { Building2, FileText, Map, PenLine, Plus, Ruler, Settings2, Sparkles, Trash2, TrendingUp } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import OfficeForm from "@/components/OfficeForm";
import { buttonClass, TopBar } from "@/components/ui";
import { fmt, investment } from "@/lib/finance";
import { sampleProperty } from "@/lib/sample";
import { deleteProperty, getOffice, listProperties, newId, saveProperty } from "@/lib/store";
import { DEFAULT_OFFICE, emptyProperty, type Office, type Property } from "@/lib/types";

const FEATURES = [
  { icon: Map, title: "خرائط حقيقية", text: "صورة قمر صناعي وخريطة شوارع ورموز QR تفتح الموقع في Google Maps وGoogle Earth" },
  { icon: Ruler, title: "مخطط مساحي تلقائي", text: "ارسم حدود القطعة على الخريطة وتُحسب الأطوال والمساحة وإحداثيات الأركان فورًا" },
  { icon: TrendingUp, title: "تحليل استثماري", text: "سيناريوهات احتفاظ وتطوير وتأجير بعوائدها ورسم بياني لنمو القيمة" },
  { icon: Sparkles, title: "وصف تسويقي آلي", text: "نص تسويقي احترافي مكتوب من بيانات العقار، قابل للتعديل قبل التصدير" },
];

export default function Home() {
  const router = useRouter();
  const [items, setItems] = useState<Property[] | null>(null);
  const [office, setOffice] = useState<Office>(DEFAULT_OFFICE);
  const [editingOffice, setEditingOffice] = useState(false);

  useEffect(() => {
    listProperties().then(setItems);
    getOffice().then(setOffice);
  }, []);

  async function create(sample: boolean) {
    const id = newId();
    await saveProperty(sample ? sampleProperty(id) : emptyProperty(id));
    router.push(`/p/${id}`);
  }

  async function remove(id: string) {
    if (!confirm("حذف هذا العقار نهائيًا؟")) return;
    await deleteProperty(id);
    setItems((xs) => xs?.filter((x) => x.id !== id) ?? null);
  }

  return (
    <>
      <TopBar light>
        <button onClick={() => setEditingOffice(true)} className="flex h-10 items-center gap-2 rounded-xl px-3 text-sm text-white/85 hover:bg-white/10">
          <Settings2 className="h-4 w-4" /> <span className="hidden sm:inline">بيانات المكتب</span>
        </button>
      </TopBar>

      <section className="bg-grid relative overflow-hidden bg-navy text-white">
        <div className="absolute -top-40 -left-40 h-96 w-96 rounded-full bg-gold/20 blur-3xl" />
        <div className="relative mx-auto grid max-w-6xl items-center gap-10 px-4 py-14 sm:py-20 lg:grid-cols-[1.1fr_1fr]">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-gold/40 bg-gold/10 px-3.5 py-1 text-sm text-gold-2">
              <Sparkles className="h-4 w-4" /> ملفات تسويق عقاري بالذكاء الاصطناعي
            </span>
            <h1 className="mt-5 text-4xl leading-[1.3] font-bold sm:text-5xl">
              ملف تسويقي استثماري
              <br />
              لكل عقار <span className="text-gold-2">في دقيقة</span>
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-relaxed text-white/75">
              أدخل بيانات العقار وحدد القطعة على الخريطة، واحصل على ملف PDF احترافي بخرائط ومخطط مساحي وحسابات عائد، جاهز للإرسال للمستثمر.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <button onClick={() => create(false)} className={buttonClass("gold", "lg")}>
                <Plus className="h-5 w-5" /> عقار جديد
              </button>
              <button onClick={() => create(true)} className={`${buttonClass("outline", "lg")} border-white/25 bg-white/10 text-white hover:bg-white/15`}>
                <FileText className="h-5 w-5" /> جرّب بعقار تجريبي
              </button>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {FEATURES.map((f) => (
              <div key={f.title} className="rounded-2xl border border-white/10 bg-white/[0.06] p-5 backdrop-blur">
                <f.icon className="h-6 w-6 text-gold-2" />
                <h3 className="mt-3 font-bold">{f.title}</h3>
                <p className="mt-1 text-sm leading-relaxed text-white/65">{f.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <main className="mx-auto max-w-6xl px-4 py-10">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-2xl font-bold text-navy">عقاراتك</h2>
            <p className="text-sm text-muted">محفوظة على هذا الجهاز • المكتب: {office.name}</p>
          </div>
          <button onClick={() => create(false)} className={buttonClass("primary")}>
            <Plus className="h-4 w-4" /> إضافة عقار
          </button>
        </div>

        {items === null ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-44 animate-pulse rounded-2xl bg-white" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="rounded-2xl border-2 border-dashed border-line bg-white px-6 py-14 text-center">
            <Building2 className="mx-auto h-12 w-12 text-gold" />
            <h3 className="mt-4 text-lg font-bold text-navy">لا توجد عقارات بعد</h3>
            <p className="mx-auto mt-1 max-w-md text-muted">ابدأ بعقار جديد، أو جرّب العقار التجريبي لترى شكل الملف النهائي.</p>
            <div className="mt-6 flex justify-center gap-3">
              <button onClick={() => create(true)} className={buttonClass("gold")}>
                جرّب بعقار تجريبي
              </button>
            </div>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((p) => {
              const inv = investment(p);
              return (
                <article key={p.id} className="group flex flex-col rounded-2xl border border-line bg-white p-5 shadow-card transition hover:shadow-lift">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="truncate font-bold text-navy">{p.title || "عقار بدون عنوان"}</h3>
                      <p className="mt-0.5 text-sm text-muted">{[p.district && `حي ${p.district}`, p.city].filter(Boolean).join("، ") || "الموقع غير محدد"}</p>
                    </div>
                    <span className="shrink-0 rounded-full bg-gold-soft px-2.5 py-0.5 text-xs font-semibold text-[#8d6a2a]">
                      {p.type} • {p.use}
                    </span>
                  </div>
                  <dl className="mt-4 grid grid-cols-2 gap-2 text-sm">
                    <div className="rounded-xl bg-background px-3 py-2">
                      <dt className="text-xs text-muted">المساحة</dt>
                      <dd className="font-bold">{inv.area ? `${fmt(inv.area)} م²` : "—"}</dd>
                    </div>
                    <div className="rounded-xl bg-background px-3 py-2">
                      <dt className="text-xs text-muted">السعر</dt>
                      <dd className="font-bold">{inv.price ? `${fmt(inv.price)} ${p.currency}` : "—"}</dd>
                    </div>
                  </dl>
                  <div className="mt-auto flex items-center gap-2 pt-5">
                    <Link href={`/p/${p.id}/report`} className={`${buttonClass("primary")} h-10 flex-1 text-sm`}>
                      <FileText className="h-4 w-4" /> الملف PDF
                    </Link>
                    <Link href={`/p/${p.id}`} className={`${buttonClass("outline")} h-10 px-3 text-sm`} aria-label="تعديل">
                      <PenLine className="h-4 w-4" />
                    </Link>
                    <button onClick={() => remove(p.id)} className="grid h-10 w-10 place-items-center rounded-xl border border-line text-muted hover:border-red-200 hover:text-red-700" aria-label="حذف">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </main>

      <footer className="border-t border-line py-8 text-center text-sm text-muted">عقار برو • نسخة تجريبية للعرض — البيانات تُحفظ على جهازك فقط</footer>

      {editingOffice && (
        <OfficeForm
          office={office}
          onClose={() => setEditingOffice(false)}
          onSaved={(o) => {
            setOffice(o);
            setEditingOffice(false);
          }}
        />
      )}
    </>
  );
}
