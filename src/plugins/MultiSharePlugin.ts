import { registerPlugin } from "@capacitor/core";

interface MultiSharePlugin {
  shareMultiple(options: {
    files: Array<{ path: string; mimeType?: string }>;
    chooserTitle?: string;
  }): Promise<any>;
  
  share(options: {
    title?: string;
    text?: string;
    files: string[];
  }): Promise<any>;
}

/**
 * MultiShare — custom Capacitor plugin for ACTION_SEND_MULTIPLE.
 *
 * Usage:
 *   import { MultiShare } from "./plugins/MultiSharePlugin";
 *   await MultiShare.shareMultiple({
 *     files: [
 *       { path: "/data/.../file.pdf", mimeType: "application/pdf" },
 *       { path: "/data/.../photo.jpg", mimeType: "image/jpeg" },
 *     ],
 *     chooserTitle: "Stundenzettel teilen",
 *   });
 */
export const MultiShare = registerPlugin<MultiSharePlugin>("MultiShare");
