export function logError(context: string, error: unknown): void {
  const message = error instanceof Error ? error.stack || error.message : String(error);
  console.error(`[${context}]`, message);
}
