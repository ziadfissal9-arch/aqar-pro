"use client";

import { Building2, Home, KeyRound, Loader2, PenLine, Plus, Search, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import AppNav from "@/components/AppNav";
import ComparableForm, { blankComparable } from "@/components/ComparableForm";
import { buttonClass, inputClass, TopBar } from "@/components/ui";
import { priceM2, stats } from "@/lib/comparables";
import { fmt } from "@/lib/finance";
import { deleteComparable, listComparables } from "@/lib/store";
import { COMPARABLE_LABEL, type Comparable } from "@/lib/types";

type Cat = Comparable["category"];
const ICON = { land: Home, building: Building2, rent: KeyRound };

export default function ComparablesPage() {
  const [all, setAll] = useState<Comparable[] | null>(null);
  const [cat, setCat] = useState<Cat | "all">("all");
  const [type, setType] = useState<"all" | "deal" | "offer">("all");
  const [city, setCity] = useState("");
  const [q, setQ] = useState("");
  const [editing, setEditing] = useState<Comparable | "new" | null>(null);

  useEffect(() => {
    listComparables().then(setAll);
  }, []);

  const cities = useMemo(() => [...new Set((all ?? []).map((c) => c.city).filter(Boolean))], [all]);
  const list = (all ?? []).filter(
    (c) =>
      (cat === "all" || c.category === cat) &&
      (type === "all" || c.dealType === type) &&
      (!city || c.city === city) &&
      (!q || `${c.district} ${c.description} ${c.source}`.includes(q.trim())),
  );

  function saved(c: Comparable) {
    setAll((cur) => {
      const rest = (cur ?? []).filter((x) => x.id !== c.id);
      return editing === "new" ? [c, ...rest] : (cur ?? []).map((x) => (x.id === c.id ? c : x));
    });
    setEditing(null);
  }

  async function remove(c: Comparable) {
    if (!confirm(`حذف «${c.description || c.district || COMPARABLE_LABEL[c.category]}» من قاعدة البيانات؟`)) return;
    setAll((cur) => (cur ?? []).filter((x) => x.id !== c.id));
    await deleteComparable(c.id);
  }

  return (
    <>
      <TopBar>
        <AppNav />
      </TopBar>
      <main className="mx-auto max-w-6xl px-4 py-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-navy">قاعدة الصفقات والعروض</h1>
            <p className="mt-1 text-muted">سجّل صفقات وعروض الأراضي والمباني والإيجارات مرة واحدة، واخترها لأي عقار لتظهر في جداول المقارنة</p>
          </div>
          <button onClick={() => setEditing("new")} className={buttonClass("gold")}>
            <Plus className="h-4 w-4" /> إضافة صفقة أو عرض
          </button>
        </div>

        {editing && (
          <div className="mt-6">
            <ComparableForm key={editing === "new" ? "new" : editing.id} initial={editing === "new" ? blankComparable(city || "الرياض") : editing} onSaved={saved} onCancel={() => setEditing(null)} />
          </div>
        )}

        {/* summary per category */}
        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          {(["land", "building", "rent"] as const).map((k) => {
            const items = (all ?? []).filter((c) => c.category === k && (!city || c.city === city));
            const s = stats(items);
            const Icon = ICON[k];
            return (
              <button
                key={k}
                type="button"
                onClick={() => setCat(cat === k ? "all" : k)}
                className={`rounded-2xl border p-4 text-right transition ${cat === k ? "border-gold bg-gold-soft/50 shadow-card" : "border-line bg-white hover:border-gold/50"}`}
              >
                <div className="flex items-center gap-2">
                  <span className="grid h-9 w-9 place-items-center rounded-xl bg-navy text-white">
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="font-bold text-navy">{COMPARABLE_LABEL[k]}</span>
                  <span className="mr-auto rounded-full bg-background px-2 py-0.5 text-xs text-muted">{items.length}</span>
                </div>
                <p className="mt-3 text-xs text-muted">{k === "rent" ? "متوسط الإيجار السنوي للمتر" : "متوسط سعر المتر"}</p>
                <p className="text-xl font-bold text-navy">{s ? fmt(s.avg) : "—"}</p>
                {s && (
                  <p className="text-xs text-muted">
                    من {fmt(s.min)} إلى {fmt(s.max)}
                  </p>
                )}
              </button>
            );
          })}
        </div>

        {/* filters */}
        <div className="mt-6 flex flex-wrap items-center gap-2">
          <div className="relative min-w-[200px] flex-1">
            <Search className="absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 text-muted" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="ابحث بالحي أو الوصف أو المصدر…" className={`${inputClass} pr-9`} />
          </div>
          <select value={city} onChange={(e) => setCity(e.target.value)} className={inputClass.replace("w-full", "w-40")}>
            <option value="">كل المدن</option>
            {cities.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
          <div className="flex rounded-xl border border-line bg-white p-1 text-sm">
            {(
              [
                ["all", "الكل"],
                ["deal", "صفقات"],
                ["offer", "عروض"],
              ] as const
            ).map(([k, l]) => (
              <button key={k} type="button" onClick={() => setType(k)} className={`h-9 rounded-lg px-3 font-semibold transition ${type === k ? "bg-navy text-white" : "text-muted"}`}>
                {l}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-4 overflow-hidden rounded-2xl border border-line bg-white shadow-card">
          {all === null ? (
            <div className="grid place-items-center py-16 text-muted">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : list.length === 0 ? (
            <div className="px-4 py-16 text-center">
              <p className="font-semibold text-navy">{all.length ? "لا نتائج مطابقة للبحث" : "قاعدة البيانات فارغة"}</p>
              <p className="mt-1 text-sm text-muted">{all.length ? "غيّر الفلاتر أو امسح البحث" : "ابدأ بإضافة أول صفقة أو عرض — تبقى محفوظة وتستخدمها في كل الملفات"}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-sm">
                <thead className="bg-navy text-white">
                  <tr>
                    {["الفئة", "المدينة / الحي", "الوصف", "المساحة", "السعر", "سعر المتر", "التاريخ", ""].map((h) => (
                      <th key={h} className="px-3 py-3 text-right font-semibold">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {list.map((c) => (
                    <tr key={c.id} className="border-t border-line odd:bg-background/40">
                      <td className="px-3 py-3 whitespace-nowrap">
                        <span className="font-semibold">{COMPARABLE_LABEL[c.category]}</span>
                        <span className={`mr-1.5 rounded-full px-1.5 py-0.5 text-[11px] ${c.dealType === "deal" ? "bg-emerald-50 text-emerald-700" : "bg-sky-50 text-sky-700"}`}>{c.dealType === "deal" ? "صفقة" : "عرض"}</span>
                      </td>
                      <td className="px-3 py-3">
                        <span className="block font-medium">{c.district || "—"}</span>
                        <span className="block text-xs text-muted">{c.city}</span>
                      </td>
                      <td className="max-w-[240px] px-3 py-3">
                        <span className="block">{c.description || "—"}</span>
                        {c.source && <span className="block text-xs text-muted">المصدر: {c.source}</span>}
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap">{fmt(c.area)} م²</td>
                      <td className="px-3 py-3 whitespace-nowrap">
                        {fmt(c.price)}
                        {c.category === "rent" && <span className="text-xs text-muted"> سنويًا</span>}
                      </td>
                      <td className="px-3 py-3 font-bold whitespace-nowrap text-navy">{fmt(priceM2(c))}</td>
                      <td className="px-3 py-3 whitespace-nowrap text-muted" dir="ltr">
                        {c.date}
                      </td>
                      <td className="px-2 py-3 whitespace-nowrap">
                        <button onClick={() => setEditing(c)} className="rounded-lg p-2 text-muted hover:bg-background hover:text-navy" aria-label="تعديل">
                          <PenLine className="h-4 w-4" />
                        </button>
                        <button onClick={() => remove(c)} className="rounded-lg p-2 text-muted hover:bg-red-50 hover:text-red-700" aria-label="حذف">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </>
  );
}
