import { addLandmark, listLandmarks } from "@/lib/repo";
import { requireApiUser } from "@/lib/session";

export async function GET(req: Request) {
  const u = await requireApiUser();
  if (u instanceof Response) return u;
  const city = new URL(req.url).searchParams.get("city") || undefined;
  return Response.json(await listLandmarks(city));
}

export async function POST(req: Request) {
  const u = await requireApiUser();
  if (u instanceof Response) return u;
  const { city, name, lat, lon } = (await req.json().catch(() => ({}))) as { city?: string; name?: string; lat?: number; lon?: number };
  const la = Number(lat);
  const lo = Number(lon);
  if (!city?.trim() || !name?.trim() || !Number.isFinite(la) || !Number.isFinite(lo) || Math.abs(la) > 90 || Math.abs(lo) > 180)
    return Response.json({ error: "أدخل المدينة واسم المعلم وإحداثيات صحيحة" }, { status: 400 });
  return Response.json(await addLandmark({ city: city.trim(), name: name.trim(), lat: la, lon: lo }));
}
