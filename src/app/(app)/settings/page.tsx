"use client";

/* eslint-disable @next/next/no-img-element -- logo preview is a data URL */
import { Check, ImagePlus, Landmark as LandmarkIcon, Loader2, MapPin, Plus, Store, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import AppNav from "@/components/AppNav";
import { buttonClass, Field, inputClass, Section, TopBar } from "@/components/ui";
import { addLandmark, compressImage, deleteLandmark, getOffice, listLandmarks, saveOffice } from "@/lib/store";
import type { Landmark, Office } from "@/lib/types";

/** Accepts "24.71, 46.67" or a Google Maps link containing the coordinates. */
function parseCoords(s: string): [number, number] | null {
  const m = s.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/) ?? s.match(/[?&](?:q|query|ll)=(-?\d+\.\d+),\s*(-?\d+\.\d+)/) ?? s.match(/(-?\d{1,2}\.\d+)\s*[,،\s]\s*(-?\d{1,3}\.\d+)/);
  if (!m) return null;
  const lat = Number(m[1]);
  const lon = Number(m[2]);
  return Math.abs(lat) <= 90 && Math.abs(lon) <= 180 ? [lat, lon] : null;
}

export default function SettingsPage() {
  return (
    <>
      <TopBar>
        <AppNav />
      </TopBar>
      <main className="mx-auto max-w-4xl space-y-6 px-4 py-8">
        <div>
          <h1 className="text-2xl font-bold text-navy">الإعدادات</h1>
          <p className="mt-1 text-muted">بيانات المكتب التي تظهر على كل ملف، والمعالم التي تُحسب المسافات إليها</p>
        </div>
        <OfficeSection />
        <LandmarksSection />
      </main>
    </>
  );
}

function OfficeSection() {
  const [o, setO] = useState<Office | null>(null);
  const [state, setState] = useState<"idle" | "saving" | "saved">("idle");
  const [error, setError] = useState("");

  useEffect(() => {
    getOffice().then(setO);
  }, []);

  if (!o)
    return (
      <Section step={1} title="بيانات المكتب" icon={<Store className="h-5 w-5" />}>
        <Loader2 className="mx-auto h-5 w-5 animate-spin text-muted" />
      </Section>
    );

  const set = (k: keyof Office) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setO({ ...o, [k]: e.target.value });
    setState("idle");
  };

  async function logo(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (f) setO({ ...o!, logo: await compressImage(f, 400, 0.9) });
    setState("idle");
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setState("saving");
    setError("");
    try {
      setO(await saveOffice(o!));
      setState("saved");
    } catch (err) {
      setError((err as Error).message);
      setState("idle");
    }
  }

  return (
    <Section step={1} title="بيانات المكتب" desc="تظهر على غلاف كل ملف وفي تذييل كل صفحة" icon={<Store className="h-5 w-5" />}>
      <form onSubmit={submit}>
        <div className="mb-5 flex items-center gap-4">
          <div className="grid h-20 w-20 place-items-center overflow-hidden rounded-2xl border border-line bg-background">
            {o.logo ? <img src={o.logo} alt="" className="h-full w-full object-contain" /> : <ImagePlus className="h-7 w-7 text-muted" />}
          </div>
          <label className={`${buttonClass("outline")} cursor-pointer`}>
            {o.logo ? "تغيير الشعار" : "رفع الشعار"}
            <input type="file" accept="image/*" onChange={logo} className="hidden" />
          </label>
          {o.logo && (
            <button type="button" onClick={() => setO({ ...o, logo: "" })} className="text-sm text-red-700">
              إزالة
            </button>
          )}
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="اسم المكتب">
            <input required value={o.name} onChange={set("name")} className={inputClass} />
          </Field>
          <Field label="الوصف المختصر">
            <input value={o.tagline} onChange={set("tagline")} className={inputClass} />
          </Field>
          <Field label="رقم الجوال">
            <input value={o.phone} onChange={set("phone")} dir="ltr" className={`${inputClass} text-right`} placeholder="05xxxxxxxx" />
          </Field>
          <Field label="البريد الإلكتروني">
            <input value={o.email} onChange={set("email")} dir="ltr" type="email" className={`${inputClass} text-right`} />
          </Field>
          <Field label="رقم ترخيص فال (اختياري)">
            <input value={o.license} onChange={set("license")} className={inputClass} />
          </Field>
        </div>
        {error && <p className="mt-3 text-sm text-red-700">{error}</p>}
        <button disabled={state === "saving"} className={`${buttonClass("primary")} mt-6`}>
          {state === "saving" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
          {state === "saved" ? "تم الحفظ" : "حفظ بيانات المكتب"}
        </button>
      </form>
    </Section>
  );
}

function LandmarksSection() {
  const [all, setAll] = useState<Landmark[] | null>(null);
  const [city, setCity] = useState("الرياض");
  const [name, setName] = useState("");
  const [coords, setCoords] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    listLandmarks().then(setAll);
  }, []);

  const cities = useMemo(() => [...new Set([...(all ?? []).map((l) => l.city), city].filter(Boolean))], [all, city]);
  const list = (all ?? []).filter((l) => l.city === city);
  const parsed = parseCoords(coords);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!parsed) return setError("الصق الإحداثيات أو رابط قوقل ماب للمعلم");
    setBusy(true);
    setError("");
    try {
      const l = await addLandmark({ city: city.trim(), name: name.trim(), lat: parsed[0], lon: parsed[1] });
      setAll([...(all ?? []), l]);
      setName("");
      setCoords("");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function remove(l: Landmark) {
    setAll((all ?? []).filter((x) => x.id !== l.id));
    await deleteLandmark(l.id).catch(() => setError("تعذر الحذف"));
  }

  return (
    <Section step={2} title="المعالم الرئيسية" desc="يحسب النظام مسافة وزمن القيادة من كل عقار إلى معالم مدينته، ويعرضها في جدول وخريطة بالملف" icon={<LandmarkIcon className="h-5 w-5" />}>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {cities.map((c) => (
          <button key={c} type="button" onClick={() => setCity(c)} className={`h-9 rounded-full border px-4 text-sm font-semibold transition ${c === city ? "border-navy bg-navy text-white" : "border-line bg-white text-muted hover:border-gold"}`}>
            {c}
          </button>
        ))}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const v = new FormData(e.currentTarget).get("c")?.toString().trim();
            if (v) setCity(v);
            e.currentTarget.reset();
          }}
          className="flex gap-1"
        >
          <input name="c" placeholder="مدينة أخرى…" className={`${inputClass} h-9 w-36 text-sm`} />
          <button className={`${buttonClass("outline")} h-9 px-3`} aria-label="إضافة مدينة">
            <Plus className="h-4 w-4" />
          </button>
        </form>
      </div>

      {all === null ? (
        <Loader2 className="mx-auto h-5 w-5 animate-spin text-muted" />
      ) : list.length === 0 ? (
        <p className="rounded-xl bg-background px-4 py-6 text-center text-sm text-muted">لا توجد معالم لمدينة «{city}» بعد — أضف أول معلم من النموذج بالأسفل</p>
      ) : (
        <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line">
          {list.map((l, i) => (
            <li key={l.id} className="flex items-center gap-3 px-4 py-3">
              <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-navy text-xs font-bold text-white">{i + 1}</span>
              <span className="flex-1 font-medium">{l.name}</span>
              <a href={`https://www.google.com/maps/search/?api=1&query=${l.lat},${l.lon}`} target="_blank" rel="noreferrer" className="hidden text-xs text-muted hover:text-navy sm:block" dir="ltr">
                {l.lat.toFixed(5)}, {l.lon.toFixed(5)}
              </a>
              <button type="button" onClick={() => remove(l)} className="rounded-lg p-2 text-muted hover:bg-red-50 hover:text-red-700" aria-label="حذف">
                <Trash2 className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={add} className="mt-4 rounded-2xl border border-gold/30 bg-gold-soft/30 p-4">
        <p className="mb-3 text-sm font-semibold text-navy">إضافة معلم لمدينة «{city}»</p>
        <div className="grid gap-3 sm:grid-cols-[1fr_1.3fr_auto] sm:items-end">
          <Field label="اسم المعلم">
            <input required value={name} onChange={(e) => setName(e.target.value)} placeholder="مثال: مستشفى الملك فيصل التخصصي" className={inputClass} />
          </Field>
          <Field label="الموقع" hint={coords ? (parsed ? `✓ ${parsed[0].toFixed(5)}, ${parsed[1].toFixed(5)}` : "لم نتعرف على الإحداثيات") : "الصق رابط قوقل ماب أو الإحداثيات"}>
            <div className="relative">
              <MapPin className="absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 text-muted" />
              <input required value={coords} onChange={(e) => setCoords(e.target.value)} dir="ltr" placeholder="24.7136, 46.6753" className={`${inputClass} pr-9 text-right`} />
            </div>
          </Field>
          <button disabled={busy} className={`${buttonClass("primary")} sm:mb-[1.4rem]`}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} إضافة
          </button>
        </div>
        {error && <p className="mt-2 text-sm text-red-700">{error}</p>}
      </form>
    </Section>
  );
}
