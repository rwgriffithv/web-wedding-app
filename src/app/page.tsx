import { redirect } from "next/navigation";
import { parseSession } from "@/lib/auth";

export default async function HomePage() {
  const session = await parseSession();
  if (!session) redirect("/login");

  redirect("/home");
}
