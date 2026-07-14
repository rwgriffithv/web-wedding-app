export function isRedirectError(err: unknown): boolean {
  return err instanceof Error && "digest" in err && typeof (err as { digest: string }).digest === "string" && (err as { digest: string }).digest.startsWith("NEXT_REDIRECT");
}
