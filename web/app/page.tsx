import { PlannerApp } from "@/components/PlannerApp";
import { redirect } from "next/navigation";
import { hasAccess } from "@/lib/server/require-access";

export const dynamic = "force-dynamic";

export default async function Page() {
  if (!await hasAccess()) redirect("/login");
  return <PlannerApp />;
}
