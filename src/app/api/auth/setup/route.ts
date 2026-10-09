import bcrypt from "bcryptjs";
import { sql } from "drizzle-orm";
import { getDb } from "@/db";
import { users } from "@/db/schema";
import { createSession } from "@/lib/session";

/** Creates the first (owner) account. Closed as soon as any account exists. */
export async function POST(req: Request) {
  const db = getDb();
  const { name, email, password } = (await req.json().catch(() => ({}))) as { name?: string; email?: string; password?: string };
  if (!name?.trim() || !email?.includes("@") || !password || password.length < 8)
    return Response.json({ error: "أدخل الاسم والبريد وكلمة مرور من 8 أحرف على الأقل" }, { status: 400 });
  const [{ count }] = (await db.execute(sql`select count(*)::int as count from users`)).rows as { count: number }[];
  if (count > 0) return Response.json({ error: "تم إنشاء الحساب مسبقًا، سجّل الدخول" }, { status: 403 });
  const [user] = await db
    .insert(users)
    .values({ name: name.trim(), email: email.trim().toLowerCase(), passwordHash: await bcrypt.hash(password, 12) })
    .returning();
  await createSession(user);
  return Response.json({ ok: true });
}
