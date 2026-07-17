import { redirect } from "next/navigation";
import { requireSessionOrRedirect } from "@/lib/auth";

export default async function HomePage() {
  await requireSessionOrRedirect();
  redirect("/home");
}
