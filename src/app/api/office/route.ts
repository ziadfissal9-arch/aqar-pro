import { getOffice, saveOffice } from "@/lib/repo";
import { requireApiUser } from "@/lib/session";
import { DEFAULT_OFFICE, type Office } from "@/lib/types";

export async function GET() {
  const u = await requireApiUser();
  if (u instanceof Response) return u;
  return Response.json(await getOffice());
}

export async function PUT(req: Request) {
  const u = await requireApiUser();
  if (u instanceof Response) return u;
  const body = (await req.json()) as Partial<Office>;
  const o: Office = { ...DEFAULT_OFFICE };
  for (const k of Object.keys(o) as (keyof Office)[]) {
    const v = body[k];
    if (typeof v === "string") o[k] = v.slice(0, k === "logo" ? 700_000 : 200);
  }
  await saveOffice(o);
  return Response.json(o);
}
