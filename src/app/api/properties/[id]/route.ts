import { deleteProperty, getProperty, saveProperty } from "@/lib/repo";
import { requireApiUser } from "@/lib/session";
import { normalizeProperty, type Property } from "@/lib/types";

export async function GET(_req: Request, ctx: RouteContext<"/api/properties/[id]">) {
  const u = await requireApiUser();
  if (u instanceof Response) return u;
  const p = await getProperty((await ctx.params).id);
  return p ? Response.json(p) : Response.json({ error: "غير موجود" }, { status: 404 });
}

export async function PUT(req: Request, ctx: RouteContext<"/api/properties/[id]">) {
  const u = await requireApiUser();
  if (u instanceof Response) return u;
  const { id } = await ctx.params;
  const body = (await req.json()) as Property;
  await saveProperty(normalizeProperty({ ...body, id }));
  return Response.json({ ok: true });
}

// navigator.sendBeacon can only POST: it flushes the last edit when the editor tab closes.
export const POST = PUT;

export async function DELETE(_req: Request, ctx: RouteContext<"/api/properties/[id]">) {
  const u = await requireApiUser();
  if (u instanceof Response) return u;
  await deleteProperty((await ctx.params).id);
  return Response.json({ ok: true });
}
