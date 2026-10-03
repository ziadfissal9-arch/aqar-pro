/* eslint-disable @next/next/no-img-element -- map tiles are positioned raw <img> elements */
import { project, TILE, type LatLng } from "@/lib/geo";

const TILE_URLS = {
  sat: (z: number, x: number, y: number) => `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${z}/${y}/${x}`,
  street: (z: number, x: number, y: number) => `https://tile.openstreetmap.org/${z}/${x}/${y}.png`,
};

export const ATTRIBUTION = { sat: "Imagery © Esri, Maxar", street: "© OpenStreetMap contributors" };

type Props = {
  centre: LatLng;
  zoom: number;
  width: number;
  height: number;
  kind: "sat" | "street";
  polygon?: LatLng[];
  marker?: boolean;
  outline?: "glow" | "plain";
};

/** A static, print-friendly map: stitched tiles plus an SVG overlay for the plot and pin. */
export default function StaticMap({ centre, zoom, width, height, kind, polygon = [], marker, outline = "plain" }: Props) {
  const [cx, cy] = project(centre[0], centre[1], zoom);
  const x0 = cx - width / 2;
  const y0 = cy - height / 2;
  const tiles: { x: number; y: number; left: number; top: number }[] = [];
  const max = 2 ** zoom;
  for (let tx = Math.floor(x0 / TILE); tx <= Math.floor((x0 + width) / TILE); tx++) {
    for (let ty = Math.floor(y0 / TILE); ty <= Math.floor((y0 + height) / TILE); ty++) {
      if (ty < 0 || ty >= max) continue;
      tiles.push({ x: ((tx % max) + max) % max, y: ty, left: tx * TILE - x0, top: ty * TILE - y0 });
    }
  }
  const pts = polygon.map(([la, lo]) => {
    const [x, y] = project(la, lo, zoom);
    return `${(x - x0).toFixed(1)},${(y - y0).toFixed(1)}`;
  });

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
      <svg width={width} height={height} className="absolute inset-0">
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
