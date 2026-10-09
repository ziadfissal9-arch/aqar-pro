/* eslint-disable @next/next/no-img-element -- map tiles are positioned raw <img> elements */
import { project, TILE, type LatLng } from "@/lib/geo";
import type { Street } from "@/lib/types";

const TILE_URLS = {
  sat: (z: number, x: number, y: number) => `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${z}/${y}/${x}`,
  street: (z: number, x: number, y: number) => `https://tile.openstreetmap.org/${z}/${x}/${y}.png`,
};

export const ATTRIBUTION = { sat: "Imagery © Esri, Maxar • Streets © OpenStreetMap", street: "© OpenStreetMap contributors" };

export type Pin = { at: LatLng; label: string; main?: boolean };

type Props = {
  centre: LatLng;
  zoom: number;
  width: number;
  height: number;
  kind: "sat" | "street";
  polygon?: LatLng[];
  marker?: boolean;
  outline?: "glow" | "plain";
  streets?: Street[];
  pins?: Pin[];
};

type Label = { name: string; major: boolean; a: [number, number]; b: [number, number]; len: number };

/** One label per street name, placed on its longest straight segment that is fully in view. */
function streetLabels(streets: Street[], toPx: (p: LatLng) => [number, number], w: number, h: number): Label[] {
  const best = new Map<string, Label>();
  const inView = ([x, y]: [number, number]) => x > 12 && y > 12 && x < w - 12 && y < h - 12;
  for (const s of streets) {
    const pts = s.coords.map(toPx);
    for (let i = 0; i < pts.length - 1; i++) {
      let a = pts[i];
      let b = pts[i + 1];
      if (!inView(a) || !inView(b)) continue;
      if (b[0] < a[0]) [a, b] = [b, a]; // keep text left-to-right so it's never upside down
      const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
      const need = s.name.length * (s.major ? 7.6 : 6.4) + 16;
      if (len < need) continue;
      const cur = best.get(s.name);
      if (!cur || len > cur.len) best.set(s.name, { name: s.name, major: s.major, a, b, len });
    }
  }
  return [...best.values()].sort((x, y) => Number(y.major) - Number(x.major) || y.len - x.len).slice(0, 14);
}

/** A static, print-friendly map: stitched tiles plus an SVG overlay for the plot, streets and pins. */
export default function StaticMap({ centre, zoom, width, height, kind, polygon = [], marker, outline = "plain", streets = [], pins = [] }: Props) {
  const [cx, cy] = project(centre[0], centre[1], zoom);
  const x0 = cx - width / 2;
  const y0 = cy - height / 2;
  const toPx = ([la, lo]: LatLng): [number, number] => {
    const [x, y] = project(la, lo, zoom);
    return [x - x0, y - y0];
  };
  const tiles: { x: number; y: number; left: number; top: number }[] = [];
  const max = 2 ** zoom;
  for (let tx = Math.floor(x0 / TILE); tx <= Math.floor((x0 + width) / TILE); tx++) {
    for (let ty = Math.floor(y0 / TILE); ty <= Math.floor((y0 + height) / TILE); ty++) {
      if (ty < 0 || ty >= max) continue;
      tiles.push({ x: ((tx % max) + max) % max, y: ty, left: tx * TILE - x0, top: ty * TILE - y0 });
    }
  }
  const pts = polygon.map((p) => toPx(p).map((v) => v.toFixed(1)).join(","));
  const labels = kind === "sat" && streets.length ? streetLabels(streets, toPx, width, height) : [];
  const uid = `m${Math.round(cx)}${Math.round(cy)}${zoom}${width}`;

  return (
    <div style={{ width, height }} className="relative overflow-hidden bg-[#d9d4c7]">
      {tiles.map((t) => (
        <img
          key={`${t.x}-${t.y}`}
          src={TILE_URLS[kind](zoom, t.x, t.y)}
          alt=""
          // 1px overlap hides hairline seams when the page is scaled
          width={TILE + 1}
          height={TILE + 1}
          crossOrigin="anonymous"
          className="absolute max-w-none select-none"
          style={{ left: t.left, top: t.top, width: TILE + 1, height: TILE + 1 }}
          draggable={false}
        />
      ))}
      <svg width={width} height={height} className="absolute inset-0" style={{ fontFamily: "var(--font-arabic), sans-serif" }}>
        <defs>
          {labels.map((l, i) => (
            <path key={i} id={`${uid}-${i}`} d={`M${l.a[0]},${l.a[1]} L${l.b[0]},${l.b[1]}`} />
          ))}
        </defs>
        {pts.length >= 3 && (
          <polygon
            points={pts.join(" ")}
            fill="rgba(230,201,141,0.28)"
            stroke="#ffd678"
            strokeWidth={outline === "glow" ? 5 : 3.5}
            strokeLinejoin="round"
            style={outline === "glow" ? { filter: "drop-shadow(0 0 8px rgba(255,214,120,0.9))" } : undefined}
          />
        )}
        {labels.map((l, i) => (
          <text
            key={i}
            fontSize={l.major ? 13 : 11}
            fontWeight={l.major ? 700 : 600}
            fill="#fff"
            stroke="rgba(10,20,30,0.85)"
            strokeWidth={l.major ? 3.6 : 3}
            strokeLinejoin="round"
            style={{ paintOrder: "stroke" }}
            dy="4"
          >
            <textPath href={`#${uid}-${i}`} startOffset="50%" textAnchor="middle">
              {l.name}
            </textPath>
          </text>
        ))}
        {pins.map((p, i) => {
          const [x, y] = toPx(p.at);
          if (x < -20 || y < -20 || x > width + 20 || y > height + 20) return null;
          return p.main ? (
            <g key={i} transform={`translate(${x},${y})`}>
              <circle r="22" fill="rgba(210,69,47,0.18)" stroke="rgba(210,69,47,0.5)" strokeWidth="2" />
              <path d="M0,0 C-11,-15 -16,-23 -16,-31 A16,16 0 1 1 16,-31 C16,-23 11,-15 0,0 Z" fill="#d2452f" stroke="#fff" strokeWidth="2.5" />
              <circle cy="-31" r="6" fill="#fff" />
            </g>
          ) : (
            <g key={i} transform={`translate(${x},${y})`}>
              <circle r="11" fill="#0e2a3b" stroke="#fff" strokeWidth="2.5" />
              <text y="4" textAnchor="middle" fontSize="11" fontWeight={700} fill="#fff">
                {p.label}
              </text>
            </g>
          );
        })}
        {marker && (
          <g transform={`translate(${width / 2},${height / 2})`}>
            <circle r="30" fill="rgba(210,69,47,0.16)" stroke="rgba(210,69,47,0.45)" strokeWidth="2" />
            <path d="M0,0 C-13,-18 -19,-28 -19,-38 A19,19 0 1 1 19,-38 C19,-28 13,-18 0,0 Z" fill="#d2452f" stroke="#fff" strokeWidth="3" />
            <circle cy="-38" r="7" fill="#fff" />
          </g>
        )}
      </svg>
    </div>
  );
}
