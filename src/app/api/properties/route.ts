import { randomBytes } from "node:crypto";
import { listProperties, saveProperty } from "@/lib/repo";
import { sampleProperty } from "@/lib/sample";
import { requireApiUser } from "@/lib/session";
import { emptyProperty } from "@/lib/types";

export async function GET() {
  const u = await requireApiUser();
  if (u instanceof Response) return u;
  return Response.json(await listProperties());
}

export async function POST(req: Request) {
  const u = await requireApiUser();
  if (u instanceof Response) return u;
  const { sample } = (await req.json().catch(() => ({}))) as { sample?: boolean };
  const id = randomBytes(6).toString("base64url");
  await saveProperty(sample ? sampleProperty(id) : emptyProperty(id));
  return Response.json({ id });
}
