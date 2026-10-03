import { sketchLayout, sideLengths, type LatLng } from "@/lib/geo";
import { fmt } from "@/lib/finance";

type Props = { polygon: LatLng[]; neighbours: string[]; plotNo: string; area: number; width?: number; height?: number };

const isStreet = (s: string) => /شارع|طريق|ممر/.test(s);

/** Survey-style sketch (كروكي): plot outline, side lengths, neighbours, corner numbers and north arrow. */
export default function PlotSketch({ polygon, neighbours, plotNo, area, width = 640, height = 470 }: Props) {
  const layout = sketchLayout(polygon, width, height, 110);
  if (!layout) {
    return (
      <div className="grid h-full place-items-center text-sm text-muted" style={{ width, height }}>
        حدد حدود القطعة على الخريطة لعرض المخطط
      </div>
    );
  }
  const { points: sk, northRotation, centre } = layout;
  const lens = sideLengths(polygon);
  const [cx, cy] = centre;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="h-full w-full">
      {sk.map((a, i) => {
        const b = sk[(i + 1) % sk.length];
        const mx = (a[0] + b[0]) / 2;
        const my = (a[1] + b[1]) / 2;
        let nx = mx - cx;
        let ny = my - cy;
        const nl = Math.hypot(nx, ny) || 1;
        nx /= nl;
        ny /= nl;
        let rot = (Math.atan2(b[1] - a[1], b[0] - a[0]) * 180) / Math.PI;
        if (rot > 90) rot -= 180;
        if (rot < -90) rot += 180;
        const label = neighbours[i] || "";
        const street = isStreet(label);
        const inner = street ? 14 : 6;
        const outer = street ? 48 : 70;
        const quad = [
          [a[0] + nx * inner, a[1] + ny * inner],
          [b[0] + nx * inner, b[1] + ny * inner],
          [b[0] + nx * outer, b[1] + ny * outer],
          [a[0] + nx * outer, a[1] + ny * outer],
        ]
          .map((p) => p.join(","))
          .join(" ");
        const lx = mx + nx * (street ? 31 : 40);
        const ly = my + ny * (street ? 31 : 40);
        const tx = mx - nx * 22;
        const ty = my - ny * 22;
        return (
          <g key={i}>
            {label && (
              <polygon points={quad} fill={street ? "#e4e1da" : "rgba(14,42,59,0.05)"} stroke={street ? "#c9c4b8" : "#b9c2c9"} strokeDasharray={street ? undefined : "5 4"} />
            )}
            {label && (
              <text x={lx} y={ly} transform={`rotate(${rot} ${lx} ${ly})`} textAnchor="middle" dominantBaseline="middle" fontSize="13" fill={street ? "#555" : "#6b7680"} fontWeight={500}>
                {label}
              </text>
            )}
            <text x={tx} y={ty} transform={`rotate(${rot} ${tx} ${ty})`} textAnchor="middle" dominantBaseline="middle" fontSize="14" fontWeight={700} fill="#8d6a2a">
              {lens[i].toFixed(2)} م
            </text>
          </g>
        );
      })}
      <polygon points={sk.map((p) => p.join(",")).join(" ")} fill="rgba(196,154,74,0.16)" stroke="#0e2a3b" strokeWidth="3" strokeLinejoin="round" />
      {sk.map(([x, y], i) => (
        <g key={`c${i}`}>
          <circle cx={x} cy={y} r="11" fill="#0e2a3b" stroke="#fff" strokeWidth="2.5" />
          <text x={x} y={y + 4} textAnchor="middle" fontSize="12" fontWeight={700} fill="#fff">
            {i + 1}
          </text>
        </g>
      ))}
      {plotNo && (
        <text x={cx} y={cy - 8} textAnchor="middle" fontSize="20" fontWeight={700} fill="#0e2a3b">
          قطعة {plotNo}
        </text>
      )}
      <text x={cx} y={cy + (plotNo ? 22 : 6)} textAnchor="middle" fontSize="15" fontWeight={600} fill="#8d6a2a">
        {fmt(area)} م²
      </text>
      <g transform={`translate(${width - 46},48) rotate(${northRotation})`}>
        <circle r="28" fill="#fff" stroke="#0e2a3b" strokeWidth="1.5" />
        <path d="M0,-22 L8,7 L0,2 L-8,7 Z" fill="#d2452f" />
      </g>
      <text x={width - 46} y={92} textAnchor="middle" fontSize="11" fontWeight={700} fill="#0e2a3b">
        الشمال
      </text>
    </svg>
  );
}
