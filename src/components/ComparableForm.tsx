"use client";

import { Check, Loader2, X } from "lucide-react";
import { useState } from "react";
import { addComparable, updateComparable } from "@/lib/store";
import { COMPARABLE_LABEL, type Comparable } from "@/lib/types";
import { buttonClass, Field, inputClass } from "./ui";

type Draft = Omit<Comparable, "id"> & { id?: number };

export const blankComparable = (city = "الرياض", district = ""): Draft => ({
  category: "land",
  dealType: "deal",
  city,
  district,
  description: "",
  area: 0,
  price: 0,
  date: new Date().toISOString().slice(0, 7),
  source: "",
});

const num = (v: string) => Number(v.replace(/[^\d.]/g, "")) || 0;

export default function ComparableForm({ initial, onSaved, onCancel }: { initial: Draft; onSaved: (c: Comparable) => void; onCancel?: () => void }) {
  const [c, setC] = useState<Draft>(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setC({ ...c, [k]: v });
  const perM2 = c.area > 0 && c.price > 0 ? c.price / c.area : 0;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const saved = c.id ? await updateComparable(c as Comparable) : await addComparable(c);
      onSaved(saved);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="rounded-2xl border border-gold/30 bg-gold-soft/30 p-4">
      <div className="grid gap-3 sm:grid-cols-4">
        <Field label="الفئة">
          <div className="flex rounded-xl border border-line bg-white p-1">
            {(["land", "building", "rent"] as const).map((k) => (
              <button key={k} type="button" onClick={() => set("category", k)} className={`h-9 flex-1 rounded-lg text-sm font-semibold transition ${c.category === k ? "bg-navy text-white" : "text-muted"}`}>
                {COMPARABLE_LABEL[k]}
              </button>
            ))}
          </div>
        </Field>
        <Field label="النوع">
          <div className="flex rounded-xl border border-line bg-white p-1">
            {(
              [
                ["deal", "صفقة"],
                ["offer", "عرض"],
              ] as const
            ).map(([k, l]) => (
              <button key={k} type="button" onClick={() => set("dealType", k)} className={`h-9 flex-1 rounded-lg text-sm font-semibold transition ${c.dealType === k ? "bg-navy text-white" : "text-muted"}`}>
                {l}
              </button>
            ))}
          </div>
        </Field>
        <Field label="المدينة">
          <input value={c.city} onChange={(e) => set("city", e.target.value)} className={inputClass} />
        </Field>
        <Field label="الحي">
          <input value={c.district} onChange={(e) => set("district", e.target.value)} className={inputClass} />
        </Field>
        <Field label="الوصف" className="sm:col-span-2">
          <input value={c.description} onChange={(e) => set("description", e.target.value)} placeholder="مثال: أرض تجارية على شارع 40 م" className={inputClass} />
        </Field>
        <Field label="المساحة (م²)" hint={c.category === "building" ? "مساحة الأرض" : c.category === "rent" ? "المساحة المؤجرة" : undefined}>
          <input value={c.area || ""} inputMode="decimal" onChange={(e) => set("area", num(e.target.value))} className={inputClass} />
        </Field>
        <Field label={c.category === "rent" ? "الإيجار السنوي" : "السعر الإجمالي"} hint={perM2 ? `= ${Math.round(perM2).toLocaleString("en-US")} للمتر${c.category === "rent" ? " سنويًا" : ""}` : undefined}>
          <input value={c.price || ""} inputMode="decimal" onChange={(e) => set("price", num(e.target.value))} className={inputClass} />
        </Field>
        <Field label="التاريخ">
          <input type="month" value={c.date} onChange={(e) => set("date", e.target.value)} className={inputClass} />
        </Field>
        <Field label="المصدر" className="sm:col-span-3">
          <input value={c.source} onChange={(e) => set("source", e.target.value)} placeholder="مثال: صفقات وزارة العدل، عقار، حراج…" className={inputClass} />
        </Field>
      </div>
      {error && <p className="mt-3 text-sm text-red-700">{error}</p>}
      <div className="mt-4 flex gap-2">
        <button disabled={busy} className={buttonClass("primary")}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} {c.id ? "حفظ التعديل" : "حفظ في قاعدة البيانات"}
        </button>
        {onCancel && (
          <button type="button" onClick={onCancel} className={buttonClass("outline")}>
            <X className="h-4 w-4" /> إلغاء
          </button>
        )}
      </div>
    </form>
  );
}
