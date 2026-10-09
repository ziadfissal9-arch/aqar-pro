import { streetsAround } from "@/lib/geo-server";
import { requireApiUser } from "@/lib/session";

export async function POST(req: Request) {
  const u = await requireApiUser();
  if (u instanceof Response) return u;
  const { lat, lon } = (await req.json().catch(() => ({}))) as { lat?: number; lon?: number };
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return Response.json({ error: "حدد موقع العقار أولًا" }, { status: 400 });
  try {
    return Response.json(await streetsAround([lat!, lon!]));
  } catch {
    return Response.json({ error: "تعذر جلب أسماء الشوارع الآن" }, { status: 502 });
  }
}
