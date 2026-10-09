import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { users } from "@/db/schema";
import { createSession } from "@/lib/session";

export async function POST(req: Request) {
  const { email, password } = (await req.json().catch(() => ({}))) as { email?: string; password?: string };
  if (!email || !password) return Response.json({ error: "أدخل البريد وكلمة المرور" }, { status: 400 });
  const [user] = await getDb().select().from(users).where(eq(users.email, email.trim().toLowerCase()));
  // Same message for an unknown email and a wrong password, so accounts can't be probed.
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    await new Promise((r) => setTimeout(r, 600));
    return Response.json({ error: "البريد أو كلمة المرور غير صحيحة" }, { status: 401 });
  }
  await createSession(user);
  return Response.json({ ok: true });
}
