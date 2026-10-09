import { sql } from "drizzle-orm";
import { redirect } from "next/navigation";
import AuthForm from "@/components/AuthForm";
import { getDb } from "@/db";

export const metadata = { title: "إنشاء حساب المكتب" };

export default async function SetupPage() {
  const [{ count }] = (await getDb().execute(sql`select count(*)::int as count from users`)).rows as { count: number }[];
  if (count > 0) redirect("/login");
  return <AuthForm mode="setup" />;
}
