import { headers } from "next/headers";

/** Read the client IP from proxy-set headers.
 *  Trusts x-forwarded-for / x-real-ip — correct behind Caddy/Nginx,
 *  but spoofable without a reverse proxy. This is the standard Next.js pattern. */
export async function getClientIp(): Promise<string> {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim()
    ?? h.get("x-real-ip")
    ?? "127.0.0.1";
}
