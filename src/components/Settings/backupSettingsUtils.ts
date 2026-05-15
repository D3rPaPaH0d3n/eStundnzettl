import type { GoogleAuthStatus } from "../../types";

export const isGoogleConnectionReady = (status: GoogleAuthStatus | null) =>
  !!(status?.hasToken || (status?.connected && !status?.reauthRequired));
