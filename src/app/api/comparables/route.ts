import { parseComparable } from "@/lib/comparables";
import { listComparables, saveComparable } from "@/lib/repo";
import { requireApiUser } from "@/lib/session";

export async function GET(req: Request) {
  const u = await requireApiUser();
  if (u instanceof Response) return u;
  const city = new URL(req.url).searchParams.get("city") || undefined;
  return Response.json(await listComparables(city));
}

export async function POST(req: Request) {
  const u = await requireApiUser();
  if (u instanceof Response) return u;
  const c = parseComparable(await req.json().catch(() => null));
  if (typeof c === "string") return Response.json({ error: c }, { status: 400 });
  return Response.json(await saveComparable(c));
}
