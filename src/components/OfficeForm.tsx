"use client";

/* eslint-disable @next/next/no-img-element -- logo preview is a data URL */
import { Check, ImagePlus, X } from "lucide-react";
import { useState } from "react";
import { compressImage, saveOffice } from "@/lib/store";
import type { Office } from "@/lib/types";
import { buttonClass, Field, inputClass } from "./ui";

export default function OfficeForm({ office, onSaved, onClose }: { office: Office; onSaved: (o: Office) => void; onClose: () => void }) {
  const [o, setO] = useState(office);
  const set = (k: keyof Office) => (e: React.ChangeEvent<HTMLInputElement>) => setO({ ...o, [k]: e.target.value });

  async function logo(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (f) setO({ ...o, logo: await compressImage(f, 400, 0.9) });
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    await saveOffice(o);
    onSaved(o);
  }

  return (
    <div className="fixed inset-0 z-[2000] grid place-items-center bg-navy/50 p-4 backdrop-blur-sm" onClick={onClose}>
      <form onSubmit={submit} onClick={(e) => e.stopPropagation()} className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-lift">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-navy">بيانات المكتب</h2>
            <p className="text-sm text-muted">تظهر على غلاف كل ملف وفي صفحة التواصل</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-2 text-muted hover:bg-background" aria-label="إغلاق">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="mb-4 flex items-center gap-4">
          <div className="grid h-16 w-16 place-items-center overflow-hidden rounded-2xl border border-line bg-background">
            {o.logo ? <img src={o.logo} alt="" className="h-full w-full object-contain" /> : <ImagePlus className="h-6 w-6 text-muted" />}
          </div>
          <label className={`${buttonClass("outline")} cursor-pointer`}>
            رفع الشعار
            <input type="file" accept="image/*" onChange={logo} className="hidden" />
          </label>
          {o.logo && (
            <button type="button" onClick={() => setO({ ...o, logo: "" })} className="text-sm text-red-700">
              إزالة
            </button>
          )}
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="اسم المكتب" className="sm:col-span-2">
            <input required value={o.name} onChange={set("name")} className={inputClass} />
          </Field>
          <Field label="الوصف المختصر" className="sm:col-span-2">
            <input value={o.tagline} onChange={set("tagline")} className={inputClass} />
          </Field>
          <Field label="رقم الجوال">
            <input value={o.phone} onChange={set("phone")} dir="ltr" className={`${inputClass} text-right`} placeholder="05xxxxxxxx" />
          </Field>
          <Field label="البريد الإلكتروني">
            <input value={o.email} onChange={set("email")} dir="ltr" type="email" className={`${inputClass} text-right`} />
          </Field>
          <Field label="رقم ترخيص فال (اختياري)" className="sm:col-span-2">
            <input value={o.license} onChange={set("license")} className={inputClass} />
          </Field>
        </div>
        <button className={`${buttonClass("primary")} mt-6 w-full`}>
          <Check className="h-4 w-4" /> حفظ بيانات المكتب
        </button>
      </form>
    </div>
  );
}
