import type { Metadata } from "next";
import { IBM_Plex_Sans_Arabic } from "next/font/google";
import "./globals.css";

const arabic = IBM_Plex_Sans_Arabic({
  variable: "--font-arabic",
  subsets: ["arabic", "latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: { default: "عقار برو — ملفات تسويق عقاري احترافية", template: "%s | عقار برو" },
  description: "أدخل بيانات العقار وحدد القطعة على الخريطة، واحصل على ملف PDF تسويقي استثماري بخرائط ومخطط مساحي وحسابات عائد خلال ثوانٍ.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ar" dir="rtl" className={`${arabic.variable} h-full antialiased`}>
      <body className="min-h-full font-sans">{children}</body>
    </html>
  );
}
