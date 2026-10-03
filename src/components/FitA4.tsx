"use client";

import { useEffect, useRef, useState } from "react";

const PAGE_W = 794; // A4 width at 96 dpi

/** Shrinks the A4 report to the screen width on phones; printing always uses full size. */
export default function FitA4({ children }: { children: React.ReactNode }) {
  const wrap = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const fit = () => setScale(Math.min(1, el.clientWidth / PAGE_W));
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <div ref={wrap} className="w-full">
      <div className="report-scale mx-auto" style={{ width: PAGE_W, zoom: scale }}>
        {children}
      </div>
    </div>
  );
}
