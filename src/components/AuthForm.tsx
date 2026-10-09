"use client";

import { Eye, EyeOff, Loader2, LogIn, UserPlus } from "lucide-react";
import { useState } from "react";
import { buttonClass, Field, inputClass, Logo } from "./ui";

export default function AuthForm({ mode }: { mode: "login" | "setup" }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const res = await fetch(`/api/auth/${mode}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ name, email, password }) });
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    if (res.ok) window.location.href = "/";
    else {
      setError(data.error || "حدث خطأ");
      setBusy(false);
    }
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="bg-grid relative hidden overflow-hidden bg-navy p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="absolute -top-32 -left-32 h-96 w-96 rounded-full bg-gold/20 blur-3xl" />
        <Logo light />
        <div className="relative">
          <h1 className="text-4xl leading-[1.3] font-bold">
            ملفات تسويق عقاري
            <br />
            <span className="text-gold-2">باحترافية المستثمرين</span>
          </h1>
          <p className="mt-4 max-w-md text-white/70">خرائط، مسافات، مقارنات سعرية، ومخطط مساحي — في ملف PDF واحد بشعار مكتبك.</p>
        </div>
        <p className="relative text-sm text-white/50">جميع بياناتك محفوظة في قاعدة بيانات خاصة بمكتبك</p>
      </div>
      <div className="flex items-center justify-center p-6">
        <form onSubmit={submit} className="w-full max-w-sm">
          <div className="mb-8 lg:hidden">
            <Logo />
          </div>
          <h2 className="text-2xl font-bold text-navy">{mode === "login" ? "تسجيل الدخول" : "إنشاء حساب المكتب"}</h2>
          <p className="mt-1 text-sm text-muted">{mode === "login" ? "أهلًا بعودتك" : "هذا الحساب سيكون المدير للمنصة. يُنشأ مرة واحدة فقط."}</p>
          <div className="mt-7 space-y-4">
            {mode === "setup" && (
              <Field label="الاسم">
                <input required value={name} onChange={(e) => setName(e.target.value)} className={inputClass} />
              </Field>
            )}
            <Field label="البريد الإلكتروني">
              <input required type="email" dir="ltr" value={email} onChange={(e) => setEmail(e.target.value)} className={`${inputClass} text-right`} autoComplete="email" />
            </Field>
            <Field label="كلمة المرور" hint={mode === "setup" ? "8 أحرف على الأقل" : undefined}>
              <div className="relative">
                <input required type={show ? "text" : "password"} dir="ltr" minLength={mode === "setup" ? 8 : undefined} value={password} onChange={(e) => setPassword(e.target.value)} className={`${inputClass} pl-11 text-right`} autoComplete={mode === "login" ? "current-password" : "new-password"} />
                <button type="button" onClick={() => setShow(!show)} className="absolute top-1/2 left-3 -translate-y-1/2 text-muted" aria-label="إظهار كلمة المرور">
                  {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </Field>
          </div>
          {error && <p className="mt-4 rounded-xl bg-red-50 px-4 py-2.5 text-sm text-red-700">{error}</p>}
          <button disabled={busy} className={`${buttonClass("primary")} mt-6 w-full`}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : mode === "login" ? <LogIn className="h-4 w-4" /> : <UserPlus className="h-4 w-4" />}
            {mode === "login" ? "دخول" : "إنشاء الحساب"}
          </button>
          <p className="mt-6 text-center text-sm text-muted">
            <a href="/demo" className="text-navy underline-offset-4 hover:underline">
              شاهد ملفًا نموذجيًا
            </a>
          </p>
        </form>
      </div>
    </div>
  );
}
