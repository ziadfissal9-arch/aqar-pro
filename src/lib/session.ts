import "server-only";
import { createHash } from "node:crypto";
import { eq } from "drizzle-orm";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import { getDb } from "@/db";
import { users, type User } from "@/db/schema";

const COOKIE = "aqar_session";
const TTL = 60 * 60 * 24 * 30; // 30 days

type Payload = { sub: number; ver: number };

function secret(): string {
  if (process.env.JWT_SECRET) return process.env.JWT_SECRET;
  // Derived from the database URL (already a server-only secret) when no JWT_SECRET is configured.
  const db = process.env.DATABASE_URL;
  if (!db) throw new Error("JWT_SECRET is not set");
  return createHash("sha256").update(`aqar-session:${db}`).digest("hex");
}

export async function createSession(user: Pick<User, "id" | "sessionVersion">) {
  const token = jwt.sign({ sub: user.id, ver: user.sessionVersion } satisfies Payload, secret(), { expiresIn: TTL });
  (await cookies()).set(COOKIE, token, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: TTL });
}

export async function destroySession() {
  (await cookies()).delete(COOKIE);
}

export async function getCurrentUser(): Promise<User | null> {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  let payload: Payload;
  try {
    payload = jwt.verify(token, secret()) as unknown as Payload;
  } catch {
    return null;
  }
  const [user] = await getDb().select().from(users).where(eq(users.id, payload.sub));
  if (!user || user.sessionVersion !== payload.ver) return null;
  return user;
}

/** For route handlers: the signed-in user, or a 401 response to return. */
export async function requireApiUser(): Promise<User | Response> {
  const user = await getCurrentUser();
  return user ?? Response.json({ error: "يجب تسجيل الدخول" }, { status: 401 });
}
