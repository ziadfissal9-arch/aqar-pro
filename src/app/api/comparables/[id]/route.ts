import { parseComparable } from "@/lib/comparables";
import { deleteComparable, saveComparable } from "@/lib/repo";
import { requireApiUser } from "@/lib/session";

export async function PUT(req: Request, ctx: RouteContext<"/api/comparables/[id]">) {
  const u = await requireApiUser();
  if (u instanceof Response) return u;
  const c = parseComparable(await req.json().catch(() => null));
  if (typeof c === "string") return Response.json({ error: c }, { status: 400 });
  return Response.json(await saveComparable({ ...c, id: Number((await ctx.params).id) }));
}

export async function DELETE(_req: Request, ctx: RouteContext<"/api/comparables/[id]">) {
  const u = await requireApiUser();
  if (u instanceof Response) return u;
  await deleteComparable(Number((await ctx.params).id));
  return Response.json({ ok: true });
}
