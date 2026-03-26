import { registerPlugin } from "@capacitor/core";

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
export const MultiShare = registerPlugin("MultiShare");
