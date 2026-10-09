import { deletePhoto, getPhoto } from "@/lib/repo";
import { requireApiUser } from "@/lib/session";

export async function GET(_req: Request, ctx: RouteContext<"/api/photos/[id]">) {
  const u = await requireApiUser();
  if (u instanceof Response) return u;
  const photo = await getPhoto(Number((await ctx.params).id));
  if (!photo) return new Response("Not found", { status: 404 });
  return new Response(Buffer.from(photo.base64, "base64"), {
    headers: { "content-type": photo.mime, "cache-control": "private, max-age=31536000, immutable" },
  });
}

export async function DELETE(_req: Request, ctx: RouteContext<"/api/photos/[id]">) {
  const u = await requireApiUser();
  if (u instanceof Response) return u;
  await deletePhoto(Number((await ctx.params).id));
  return Response.json({ ok: true });
}
