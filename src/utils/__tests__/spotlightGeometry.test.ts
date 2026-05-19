import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  VIEWPORT_MARGIN,
  clampTargetRect,
  getViewportSize,
} from "../spotlightGeometry";

const setViewport = (width: number, height: number) => {
  Object.defineProperty(window, "innerWidth", { configurable: true, value: width });
  Object.defineProperty(window, "innerHeight", { configurable: true, value: height });
};

describe("spotlightGeometry", () => {
  let originalWidth: number;
  let originalHeight: number;

  beforeEach(() => {
    originalWidth = window.innerWidth;
    originalHeight = window.innerHeight;
    setViewport(800, 600);
  });

  afterEach(() => {
    setViewport(originalWidth, originalHeight);
  });

  describe("getViewportSize", () => {
    it("returns current window dimensions", () => {
      expect(getViewportSize()).toEqual({ width: 800, height: 600 });
    });
  });

  describe("clampTargetRect", () => {
    it("inflates the rect by the padding when fully inside the viewport", () => {
      const result = clampTargetRect(
        { top: 200, left: 300, width: 100, height: 50 },
        10,
      );
      expect(result).toEqual({
        top: 190,
        left: 290,
        width: 120,
        height: 70,
      });
    });

    it("clamps a rect that overflows the right edge to the viewport margin", () => {
      const result = clampTargetRect(
        { top: 100, left: 780, width: 200, height: 50 },
        8,
      );
      expect(result.left + result.width).toBeLessThanOrEqual(800 - VIEWPORT_MARGIN);
    });

    it("clamps a rect that overflows the bottom edge to the viewport margin", () => {
      const result = clampTargetRect(
        { top: 580, left: 100, width: 100, height: 100 },
        8,
      );
      expect(result.top + result.height).toBeLessThanOrEqual(600 - VIEWPORT_MARGIN);
    });

    it("returns a minimum 1x1 box when the rect collapses below the margin", () => {
      const result = clampTargetRect(
        { top: -50, left: -50, width: 1, height: 1 },
        0,
      );
      expect(result.width).toBeGreaterThanOrEqual(1);
      expect(result.height).toBeGreaterThanOrEqual(1);
      expect(result.top).toBeGreaterThanOrEqual(VIEWPORT_MARGIN);
      expect(result.left).toBeGreaterThanOrEqual(VIEWPORT_MARGIN);
    });
  });
});
