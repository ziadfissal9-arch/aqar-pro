import { drivingDistances } from "@/lib/geo-server";
import { listLandmarks } from "@/lib/repo";
import { requireApiUser } from "@/lib/session";

export async function POST(req: Request) {
  const u = await requireApiUser();
  if (u instanceof Response) return u;
  const { lat, lon, city } = (await req.json().catch(() => ({}))) as { lat?: number; lon?: number; city?: string };
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return Response.json({ error: "حدد موقع العقار أولًا" }, { status: 400 });
  const marks = await listLandmarks(city || undefined);
  return Response.json(await drivingDistances([lat!, lon!], marks));
}
