"use client";

import { ArrowRight, Download, PenLine, Settings2 } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import QRCode from "qrcode";
import { useEffect, useState } from "react";
import FitA4 from "@/components/FitA4";
import Report, { earthUrl, mapsUrl } from "@/components/Report";
import { buttonClass, TopBar } from "@/components/ui";
import { centroid, type LatLng } from "@/lib/geo";
import { getOffice, getProperty, listComparables } from "@/lib/store";
import { DEFAULT_OFFICE, type Comparable, type Office, type Property } from "@/lib/types";

export default function ReportPage() {
  const { id } = useParams<{ id: string }>();
  const [p, setP] = useState<Property | null | undefined>(undefined);
  const [office, setOffice] = useState<Office>(DEFAULT_OFFICE);
  const [comparables, setComparables] = useState<Comparable[]>([]);
  const [qr, setQr] = useState({ maps: "", earth: "" });

  useEffect(() => {
    getProperty(id).then(async (x) => {
      if (x?.comparableIds.length) {
        const ids = new Set(x.comparableIds);
        setComparables((await listComparables().catch(() => [])).filter((c) => ids.has(c.id)));
      }
      setP(x);
    });
    getOffice().then(setOffice).catch(() => {});
  }, [id]);

  useEffect(() => {
    if (!p) return;
    const c: LatLng | null = p.polygon.length >= 3 ? centroid(p.polygon) : p.lat != null && p.lon != null ? [p.lat, p.lon] : null;
    if (!c) return;
    const opts = { margin: 1, width: 240, color: { dark: "#0e2a3b", light: "#ffffff" } };
    Promise.all([QRCode.toDataURL(mapsUrl(c), opts), QRCode.toDataURL(earthUrl(c), opts)]).then(([maps, earth]) => setQr({ maps, earth }));
  }, [p]);

  useEffect(() => {
    if (p?.title) document.title = `${p.title} — ملف تسويقي`;
  }, [p]);

  if (p === undefined) return <div className="grid min-h-screen place-items-center text-muted">جارٍ تجهيز الملف…</div>;
  if (p === null)
    return (
      <div className="grid min-h-screen place-items-center text-center">
        <Link href="/" className={buttonClass("primary")}>
          العقار غير موجود — العودة للرئيسية
        </Link>
      </div>
    );

  return (
    <>
      <TopBar>
        <Link href="/settings" className={`${buttonClass("ghost")} hidden px-3 sm:inline-flex`}>
          <Settings2 className="h-4 w-4" /> بيانات المكتب
        </Link>
        <Link href={`/p/${p.id}`} className={`${buttonClass("outline")} px-3`}>
          <PenLine className="h-4 w-4" /> <span className="hidden sm:inline">تعديل</span>
        </Link>
        <button onClick={() => window.print()} className={buttonClass("gold")}>
          <Download className="h-4 w-4" /> تحميل PDF
        </button>
      </TopBar>

      <div className="no-print mx-auto max-w-[830px] px-4 pt-6">
        <Link href="/" className="inline-flex items-center gap-1 text-sm text-muted hover:text-navy">
          <ArrowRight className="h-4 w-4" /> كل العقارات
        </Link>
        <div className="mt-3 rounded-2xl border border-gold/30 bg-gold-soft/60 px-4 py-3 text-sm text-[#6f531f]">
          للتحميل: اضغط <b>«تحميل PDF»</b> ثم اختر <b>«حفظ بتنسيق PDF»</b> كوجهة الطباعة. الملف يخرج بمقاس A4 بجودة كاملة، والروابط فيه قابلة للضغط.
        </div>
      </div>

      <div className="mx-auto max-w-[830px] px-4 py-6 print:p-0">
        <FitA4>
          <Report property={p} office={office} qr={qr} comparables={comparables} />
        </FitA4>
      </div>
    </>
  );
}
