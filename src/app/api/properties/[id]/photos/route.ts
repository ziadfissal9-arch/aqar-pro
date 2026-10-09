import { addPhoto, reorderPhotos } from "@/lib/repo";
import { requireApiUser } from "@/lib/session";

export async function POST(req: Request, ctx: RouteContext<"/api/properties/[id]/photos">) {
  const u = await requireApiUser();
  if (u instanceof Response) return u;
  const { group, dataUrl } = (await req.json()) as { group?: string; dataUrl?: string };
  try {
    return Response.json(await addPhoto((await ctx.params).id, group === "building" ? "building" : "property", dataUrl ?? ""));
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 400 });
  }
}

export async function PATCH(req: Request, ctx: RouteContext<"/api/properties/[id]/photos">) {
  const u = await requireApiUser();
  if (u instanceof Response) return u;
  const { ids } = (await req.json()) as { ids: number[] };
  await reorderPhotos((await ctx.params).id, ids.map(Number));
  return Response.json({ ok: true });
}
