import { deleteLandmark } from "@/lib/repo";
import { requireApiUser } from "@/lib/session";

export async function DELETE(_req: Request, ctx: RouteContext<"/api/landmarks/[id]">) {
  const u = await requireApiUser();
  if (u instanceof Response) return u;
  await deleteLandmark(Number((await ctx.params).id));
  return Response.json({ ok: true });
}
