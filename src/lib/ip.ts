import { headers } from "next/headers";

/** Read the client IP from proxy-set headers.
 *  Prefers CF-Connecting-IP (Cloudflare's verified real client IP) over
 *  x-forwarded-for (which may contain Docker-internal IPs in tunnel setups).
 *  Falls back to 127.0.0.1 for direct connections. */
export async function getClientIp(): Promise<string> {
  const h = await headers();
  return h.get("cf-connecting-ip")
    ?? h.get("x-forwarded-for")?.split(",")[0]?.trim()
    ?? h.get("x-real-ip")
    ?? "127.0.0.1";
}
