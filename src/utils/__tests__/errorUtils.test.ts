import { describe, it, expect } from "vitest";
import { getErrorMessage } from "../errorUtils";

describe("getErrorMessage", () => {
  it("extracts message from Error instances", () => {
    expect(getErrorMessage(new Error("boom"))).toBe("boom");
  });

  it("extracts message from TypeError instances", () => {
    expect(getErrorMessage(new TypeError("type error"))).toBe("type error");
  });

  it("returns string errors as-is", () => {
    expect(getErrorMessage("something went wrong")).toBe("something went wrong");
  });

  it("returns empty string for empty string input", () => {
    expect(getErrorMessage("")).toBe("");
  });

  it("extracts message from plain objects with message property", () => {
    expect(getErrorMessage({ message: "obj error" })).toBe("obj error");
  });

  it("returns fallback for null", () => {
    expect(getErrorMessage(null)).toBe("Unbekannter Fehler");
  });

  it("returns fallback for undefined", () => {
    expect(getErrorMessage(undefined)).toBe("Unbekannter Fehler");
  });

  it("returns fallback for objects without message property", () => {
    expect(getErrorMessage({ code: 42 })).toBe("Unbekannter Fehler");
  });

  it("returns custom fallback when provided", () => {
    expect(getErrorMessage(null, "Custom fallback")).toBe("Custom fallback");
    expect(getErrorMessage(undefined, "Oops")).toBe("Oops");
  });

  it("returns fallback for numeric error values", () => {
    expect(getErrorMessage(42)).toBe("Unbekannter Fehler");
  });

  it("ignores non-string message properties on objects", () => {
    expect(getErrorMessage({ message: 123 })).toBe("Unbekannter Fehler");
    expect(getErrorMessage({ message: null })).toBe("Unbekannter Fehler");
  });

  it("returns fallback for boolean values", () => {
    expect(getErrorMessage(false)).toBe("Unbekannter Fehler");
    expect(getErrorMessage(true)).toBe("Unbekannter Fehler");
  });
});
