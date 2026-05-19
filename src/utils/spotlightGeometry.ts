export interface TargetRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

export const VIEWPORT_MARGIN = 12;

export const getViewportSize = () => ({
  width: typeof window !== "undefined" ? window.innerWidth : 390,
  height: typeof window !== "undefined" ? window.innerHeight : 800,
});

export const clampTargetRect = (rect: TargetRect, padding: number): TargetRect => {
  const viewport = getViewportSize();
  const maxWidth = Math.max(1, viewport.width - VIEWPORT_MARGIN * 2);
  const maxHeight = Math.max(1, viewport.height - VIEWPORT_MARGIN * 2);
  const paddedTop = rect.top - padding;
  const paddedLeft = rect.left - padding;
  const paddedRight = rect.left + rect.width + padding;
  const paddedBottom = rect.top + rect.height + padding;

  const top = Math.min(Math.max(paddedTop, VIEWPORT_MARGIN), viewport.height - VIEWPORT_MARGIN);
  const left = Math.min(Math.max(paddedLeft, VIEWPORT_MARGIN), viewport.width - VIEWPORT_MARGIN);
  const right = Math.min(Math.max(paddedRight, VIEWPORT_MARGIN), viewport.width - VIEWPORT_MARGIN);
  const bottom = Math.min(Math.max(paddedBottom, VIEWPORT_MARGIN), viewport.height - VIEWPORT_MARGIN);

  return {
    top,
    left,
    width: Math.min(Math.max(right - left, 1), maxWidth),
    height: Math.min(Math.max(bottom - top, 1), maxHeight),
  };
};
