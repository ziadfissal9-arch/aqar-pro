import Link from "next/link";

export const inputClass =
  "h-11 w-full rounded-xl border border-line bg-white px-3.5 text-[15px] outline-none transition placeholder:text-muted/60 focus:border-gold focus:ring-4 focus:ring-gold/15";

export function buttonClass(variant: "primary" | "gold" | "ghost" | "outline" = "primary", size: "md" | "lg" = "md") {
  const base = "inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition disabled:opacity-50 disabled:pointer-events-none";
  const sizes = { md: "h-11 px-5 text-[15px]", lg: "h-13 px-7 text-base" };
  const variants = {
    primary: "bg-navy text-white hover:bg-navy-2 shadow-card",
    gold: "bg-gold text-white hover:bg-[#b0883d] shadow-card",
    ghost: "text-navy hover:bg-navy/5",
    outline: "border border-line bg-white text-foreground hover:border-gold/60 hover:bg-gold-soft/40",
  };
  return `${base} ${sizes[size]} ${variants[variant]}`;
}

export function Field({ label, hint, children, className = "" }: { label: string; hint?: string; children: React.ReactNode; className?: string }) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1.5 block text-sm font-semibold text-foreground/85">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-muted">{hint}</span>}
    </label>
  );
}

export function Section({ step, title, desc, icon, children }: { step: number; title: string; desc?: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-line bg-white p-5 shadow-card sm:p-7">
      <div className="mb-5 flex items-start gap-3.5">
        <span className="relative grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-gold-soft text-[#8d6a2a]">
          {icon}
          <span className="absolute -top-1.5 -left-1.5 grid h-5 w-5 place-items-center rounded-full bg-navy text-[10px] font-bold text-white">{step}</span>
        </span>
        <div>
          <h2 className="text-lg font-bold text-navy">{title}</h2>
          {desc && <p className="mt-0.5 text-sm text-muted">{desc}</p>}
        </div>
      </div>
      {children}
    </section>
  );
}

export function Logo({ light }: { light?: boolean }) {
  return (
    <Link href="/" className="flex items-center gap-2.5">
      <span className="grid h-9 w-9 place-items-center rounded-xl bg-[linear-gradient(135deg,#c49a4a,#a77c33)] text-white shadow-card">
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 21h18M5 21V9l7-5 7 5v12" />
          <path d="M9 21v-6h6v6" />
        </svg>
      </span>
      <span className={`text-lg font-bold ${light ? "text-white" : "text-navy"}`}>
        عقار <span className="text-gold">برو</span>
      </span>
    </Link>
  );
}

export function TopBar({ children, light }: { children?: React.ReactNode; light?: boolean }) {
  return (
    <header className={`no-print sticky top-0 z-[1000] border-b ${light ? "border-white/10 bg-navy/95" : "border-line bg-white/90"} backdrop-blur`}>
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4">
        <Logo light={light} />
        <div className="flex items-center gap-2">{children}</div>
      </div>
    </header>
  );
}
