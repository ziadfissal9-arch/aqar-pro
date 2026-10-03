"use client";

import { Download } from "lucide-react";
import { buttonClass } from "./ui";

export default function PrintButton() {
  return (
    <button onClick={() => window.print()} className={buttonClass("gold")}>
      <Download className="h-4 w-4" /> تحميل PDF
    </button>
  );
}
