import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";

// Everything inside (app) belongs to the office: sign-in required.
export default async function AppLayout({ children }: LayoutProps<"/">) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return <>{children}</>;
}
