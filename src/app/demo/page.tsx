import QRCode from "qrcode";
import Link from "next/link";
import { FilePlus2 } from "lucide-react";
import FitA4 from "@/components/FitA4";
import PrintButton from "@/components/PrintButton";
import Report from "@/components/Report";
import { buttonClass, TopBar } from "@/components/ui";
import { centroid } from "@/lib/geo";
import { sampleProperty } from "@/lib/sample";
import { DEFAULT_OFFICE } from "@/lib/types";

export const metadata = { title: "نموذج ملف تسويقي" };

// Server-rendered sample report: opens instantly on any device and prints cleanly.
export default async function DemoReport() {
  const property = sampleProperty("demo");
  const [la, lo] = centroid(property.polygon).map((v) => v.toFixed(6));
  const opts = { margin: 1, width: 240, color: { dark: "#0e2a3b", light: "#ffffff" } };
  const [maps, earth] = await Promise.all([
    QRCode.toDataURL(`https://www.google.com/maps/search/?api=1&query=${la},${lo}`, opts),
    QRCode.toDataURL(`https://earth.google.com/web/@${la},${lo},640a,450d,35y,0h,45t,0r`, opts),
  ]);

  return (
    <>
      <TopBar>
        <Link href="/" className={`${buttonClass("outline")} px-3`}>
          <FilePlus2 className="h-4 w-4" /> <span className="hidden sm:inline">أنشئ ملفك</span>
        </Link>
        <PrintButton />
      </TopBar>
      <div className="no-print mx-auto max-w-[830px] px-4 pt-6">
        <div className="rounded-2xl border border-gold/30 bg-gold-soft/60 px-4 py-3 text-sm text-[#6f531f]">
          هذا ملف نموذجي لعقار تجريبي: الصور الجوية حقيقية والأرقام افتراضية. أنشئ ملفك من «أنشئ ملفك» وحدد قطعتك على الخريطة.
        </div>
      </div>
      <div className="mx-auto max-w-[830px] px-4 py-6 print:p-0">
        <FitA4>
          <Report property={property} office={DEFAULT_OFFICE} qr={{ maps, earth }} />
        </FitA4>
      </div>
    </>
  );
}
