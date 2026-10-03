"use client";

import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { Layers, Loader2, MapPin, PenLine, Search, Trash2, Undo2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { area, centroid, distance, type LatLng } from "@/lib/geo";
import { fmt } from "@/lib/finance";

type Props = {
  lat: number | null;
  lon: number | null;
  polygon: LatLng[];
  onChange: (v: { lat: number | null; lon: number | null; polygon: LatLng[] }) => void;
};

const SAT = "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}";
const LABELS = "https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}";
const STREET = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";

const vertexIcon = (n: number) =>
  L.divIcon({
    className: "",
    html: `<div style="width:24px;height:24px;border-radius:50%;background:#0e2a3b;border:3px solid #ffd678;color:#fff;font:700 11px/18px sans-serif;text-align:center;box-shadow:0 2px 6px rgba(0,0,0,.4);cursor:grab">${n}</div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });

const pinIcon = L.divIcon({
  className: "",
  html: `<svg width="34" height="44" viewBox="-19 -60 38 62"><path d="M0,0 C-13,-18 -19,-28 -19,-38 A19,19 0 1 1 19,-38 C19,-28 13,-18 0,0 Z" fill="#d2452f" stroke="#fff" stroke-width="3"/><circle cy="-38" r="7" fill="#fff"/></svg>`,
  iconSize: [34, 44],
  iconAnchor: [17, 42],
});

export default function MapEditor({ lat, lon, polygon, onChange }: Props) {
  const box = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const layers = useRef<{ sat: L.LayerGroup; street: L.TileLayer } | null>(null);
  const drawn = useRef<L.LayerGroup | null>(null);
  const state = useRef({ lat, lon, polygon });
  const [mode, setMode] = useState<"pin" | "draw">(polygon.length ? "draw" : "pin");
  const modeRef = useRef(mode);
  const [base, setBase] = useState<"sat" | "street">("sat");
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState("");

  // the Leaflet handlers are bound once, so they read the latest props through refs
  useEffect(() => {
    state.current = { lat, lon, polygon };
    modeRef.current = mode;
  }, [lat, lon, polygon, mode]);

  // create the map once
  useEffect(() => {
    if (!box.current || map.current) return;
    const start: LatLng = polygon.length ? centroid(polygon) : lat != null && lon != null ? [lat, lon] : [24.7136, 46.6753];
    const m = L.map(box.current, { center: start, zoom: polygon.length || lat != null ? 18 : 11, maxZoom: 19, zoomControl: true, attributionControl: true });
    const sat = L.layerGroup([L.tileLayer(SAT, { maxZoom: 19, attribution: "Imagery © Esri, Maxar" }), L.tileLayer(LABELS, { maxZoom: 19 })]);
    const street = L.tileLayer(STREET, { maxZoom: 19, attribution: "© OpenStreetMap contributors" });
    sat.addTo(m);
    layers.current = { sat, street };
    drawn.current = L.layerGroup().addTo(m);
    m.on("click", (e: L.LeafletMouseEvent) => {
      const s = state.current;
      const p: LatLng = [+e.latlng.lat.toFixed(6), +e.latlng.lng.toFixed(6)];
      if (modeRef.current === "pin") onChange({ lat: p[0], lon: p[1], polygon: s.polygon });
      else {
        const poly = [...s.polygon, p];
        const c = centroid(poly);
        onChange({ lat: +c[0].toFixed(6), lon: +c[1].toFixed(6), polygon: poly });
      }
    });
    map.current = m;
    // the container can still be settling its size when Leaflet measures it
    const settle = setTimeout(() => {
      m.invalidateSize();
      if (state.current.polygon.length >= 3) m.fitBounds(L.latLngBounds(state.current.polygon), { padding: [70, 70], maxZoom: 19 });
    }, 150);
    return () => {
      clearTimeout(settle);
      m.remove();
      map.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- the map is created once; state is read through refs
  }, []);

  // switch base layer
  useEffect(() => {
    const m = map.current;
    const l = layers.current;
    if (!m || !l) return;
    if (base === "sat") {
      m.removeLayer(l.street);
      l.sat.addTo(m);
    } else {
      m.removeLayer(l.sat);
      l.street.addTo(m);
    }
  }, [base]);

  // redraw pin / polygon / length labels
  useEffect(() => {
    const g = drawn.current;
    if (!g) return;
    g.clearLayers();
    if (polygon.length >= 2) {
      const shape = polygon.length >= 3 ? L.polygon(polygon, { color: "#ffd678", weight: 3, fillColor: "#e6c98d", fillOpacity: 0.25 }) : L.polyline(polygon, { color: "#ffd678", weight: 3 });
      shape.addTo(g);
      const sides = polygon.length >= 3 ? polygon.length : polygon.length - 1;
      for (let i = 0; i < sides; i++) {
        const a = polygon[i];
        const b = polygon[(i + 1) % polygon.length];
        L.marker([(a[0] + b[0]) / 2, (a[1] + b[1]) / 2], {
          interactive: false,
          icon: L.divIcon({ className: "", html: `<div style="transform:translate(-50%,-50%);display:inline-block;background:rgba(14,42,59,.88);color:#ffd678;font:700 11px sans-serif;padding:2px 7px;border-radius:99px;white-space:nowrap">${distance(a, b).toFixed(1)} م</div>`, iconSize: [0, 0] }),
        }).addTo(g);
      }
    }
    polygon.forEach((p, i) => {
      const mk = L.marker(p, { icon: vertexIcon(i + 1), draggable: true });
      mk.on("dragend", () => {
        const ll = mk.getLatLng();
        const poly = state.current.polygon.map((q, j) => (j === i ? ([+ll.lat.toFixed(6), +ll.lng.toFixed(6)] as LatLng) : q));
        const c = centroid(poly);
        onChange({ lat: +c[0].toFixed(6), lon: +c[1].toFixed(6), polygon: poly });
      });
      mk.addTo(g);
    });
    if (!polygon.length && lat != null && lon != null) L.marker([lat, lon], { icon: pinIcon }).addTo(g);
  }, [lat, lon, polygon, onChange]);

  async function search(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim() || !map.current) return;
    setSearching(true);
    setSearchError("");
    try {
      // Coordinates pasted directly ("24.81, 46.61")
      const coords = query.match(/(-?\d+(?:\.\d+)?)\s*[,،]\s*(-?\d+(?:\.\d+)?)/);
      if (coords) {
        const p: LatLng = [+coords[1], +coords[2]];
        map.current.setView(p, 18);
        if (!state.current.polygon.length) onChange({ lat: p[0], lon: p[1], polygon: [] });
        return;
      }
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=1&accept-language=ar&q=${encodeURIComponent(query)}`);
      const hits = (await res.json()) as { lat: string; lon: string }[];
      if (!hits.length) setSearchError("لم نجد هذا المكان، جرّب اسم الحي والمدينة أو الإحداثيات");
      else map.current.setView([+hits[0].lat, +hits[0].lon], 16);
    } catch {
      setSearchError("تعذر البحث الآن");
    } finally {
      setSearching(false);
    }
  }

  const a = polygon.length >= 3 ? area(polygon) : 0;

  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-white shadow-card">
      <div className="flex flex-wrap items-center gap-2 border-b border-line p-3">
        <form onSubmit={search} className="flex min-w-0 flex-1 items-center gap-2 rounded-xl border border-line bg-background px-3">
          <Search className="h-4 w-4 shrink-0 text-muted" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="ابحث باسم الحي والمدينة أو الصق الإحداثيات" className="h-10 min-w-0 flex-1 bg-transparent text-sm outline-none" />
          {searching && <Loader2 className="h-4 w-4 animate-spin text-muted" />}
        </form>
        <div className="flex rounded-xl border border-line bg-background p-1 text-sm">
          <ModeButton active={mode === "pin"} onClick={() => setMode("pin")} icon={<MapPin className="h-4 w-4" />} label="تحديد الموقع" />
          <ModeButton active={mode === "draw"} onClick={() => setMode("draw")} icon={<PenLine className="h-4 w-4" />} label="رسم حدود القطعة" />
        </div>
        <button type="button" onClick={() => setBase(base === "sat" ? "street" : "sat")} className="flex h-10 items-center gap-1.5 rounded-xl border border-line px-3 text-sm hover:bg-background">
          <Layers className="h-4 w-4" />
          {base === "sat" ? "خريطة الشوارع" : "القمر الصناعي"}
        </button>
      </div>
      {searchError && <p className="bg-red-50 px-4 py-2 text-sm text-red-700">{searchError}</p>}
      <div className="relative">
        <div ref={box} className="h-[420px] w-full sm:h-[480px]" />
        <div className="pointer-events-none absolute inset-x-3 top-3 z-[500] flex justify-center">
          <span className="rounded-full bg-navy/90 px-4 py-1.5 text-xs text-white shadow-lg">
            {mode === "pin" ? "اضغط على الخريطة لتحديد موقع العقار" : polygon.length < 3 ? "اضغط على أركان القطعة بالترتيب (3 أركان على الأقل)" : "اسحب أي ركن لتعديله، أو اضغط لإضافة ركن جديد"}
          </span>
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line p-3 text-sm">
        <div className="flex flex-wrap gap-4 text-muted">
          <span>
            الأركان: <b className="text-foreground">{polygon.length}</b>
          </span>
          <span>
            المساحة: <b className="text-foreground">{a ? `${fmt(a)} م²` : "—"}</b>
          </span>
          {lat != null && lon != null && (
            <span className="ltr-num">
              {lat.toFixed(5)}, {lon.toFixed(5)}
            </span>
          )}
        </div>
        <div className="flex gap-2">
          <button type="button" disabled={!polygon.length} onClick={() => onChange({ lat, lon, polygon: polygon.slice(0, -1) })} className="flex items-center gap-1.5 rounded-lg border border-line px-3 py-1.5 hover:bg-background disabled:opacity-40">
            <Undo2 className="h-4 w-4" /> تراجع
          </button>
          <button type="button" disabled={!polygon.length} onClick={() => onChange({ lat, lon, polygon: [] })} className="flex items-center gap-1.5 rounded-lg border border-red-200 px-3 py-1.5 text-red-700 hover:bg-red-50 disabled:opacity-40">
            <Trash2 className="h-4 w-4" /> مسح الحدود
          </button>
        </div>
      </div>
    </div>
  );
}

function ModeButton({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button type="button" onClick={onClick} className={`flex h-8 items-center gap-1.5 rounded-lg px-3 transition ${active ? "bg-navy text-white shadow" : "text-muted hover:text-foreground"}`}>
      {icon}
      {label}
    </button>
  );
}
