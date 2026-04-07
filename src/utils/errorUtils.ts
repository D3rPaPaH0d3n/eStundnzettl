/**
 * Extracts a human-readable error message from an unknown error value.
 * Replaces all `(error as any)?.message` patterns throughout the codebase.
 */
export function getErrorMessage(error: unknown, fallback: string = "Unbekannter Fehler"): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  if (
    error !== null &&
    error !== undefined &&
    typeof error === "object" &&
    "message" in error &&
    typeof (error as { message: unknown }).message === "string"
  ) {
    return (error as { message: string }).message;
  }
  return fallback;
}
