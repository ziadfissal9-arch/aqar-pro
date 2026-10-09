import { sql } from "drizzle-orm";
import { redirect } from "next/navigation";
import AuthForm from "@/components/AuthForm";
import { getDb } from "@/db";
import { getCurrentUser } from "@/lib/session";

export const metadata = { title: "تسجيل الدخول" };

export default async function LoginPage() {
  if (await getCurrentUser()) redirect("/");
  // A fresh installation has no account yet: send the owner to create one.
  const [{ count }] = (await getDb().execute(sql`select count(*)::int as count from users`)).rows as { count: number }[];
  if (count === 0) redirect("/setup");
  return <AuthForm mode="login" />;
}
