# عقار برو — Aqar Pro

Generates an investor-ready **Arabic real-estate marketing PDF** for any property in about a minute: enter the details, draw the plot on a satellite map, and print a 5–6 page A4 report.

**Live demo:** open `/demo` for a finished sample report, or start from the home page with "جرّب بعقار تجريبي".

## What the report contains

1. **Cover** — satellite image with the plot outlined (or the first uploaded photo) and the key figures.
2. **Overview** — marketing description (Claude when `ANTHROPIC_API_KEY` is set, otherwise a fact-based template), highlights, location and property data, aerial context map.
3. **Investment** — hold / develop-and-lease / lease-as-is scenarios with yields, a 5-year value projection chart, and an automatic reading of the numbers.
4. **Maps** — street map with a pin, satellite view with the plot boundary, and QR codes that open the spot in Google Maps and Google Earth.
5. **Photos** (when more than one is uploaded).
6. **Survey sketch** — the plot drawn to scale with side lengths, neighbours, corner numbers and a north arrow, plus boundary and corner-coordinate tables.

## How it works

- **Next.js 16** (App Router), React 19, TypeScript, Tailwind v4.
- **Leaflet** for the interactive editor map (Esri World Imagery + OpenStreetMap); plot corners are clicked in order and can be dragged.
- Geometry (`src/lib/geo.ts`): haversine side lengths, area on a local metric projection, facing direction of each side, Web-Mercator tile maths, and the rotated survey-sketch layout.
- The printed maps are a custom `StaticMap` component that stitches tiles and draws the plot in SVG, so they print crisply with no map library.
- The PDF is the browser's own print engine on A4 `@page` CSS — Arabic shaping and RTL are perfect and nothing needs a server-side Chromium.
- Data is stored in the browser (IndexedDB via `idb-keyval`), so the demo needs no account or database. Moving it to Postgres per office is a straightforward next step.
- `src/app/api/describe` calls Claude through the official Anthropic SDK and falls back to the template if no key is configured.

## Run locally

```bash
npm install
npm run dev
npm test
```

Optional: `ANTHROPIC_API_KEY=...` in `.env.local` to write descriptions with Claude.

Sample figures in the demo are illustrative; the aerial imagery is real (© Esri, Maxar; © OpenStreetMap contributors).
