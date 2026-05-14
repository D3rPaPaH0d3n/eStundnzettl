import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock Capacitor and plugin before imports
vi.mock("@capacitor/core", () => ({
  Capacitor: { isNativePlatform: () => false, getPlatform: () => "web" },
}));
vi.mock("../../plugins/NextcloudLoginFlowPlugin", () => ({
  NextcloudLoginFlow: {
    startLoginFlow: vi.fn(),
    pollLoginFlow: vi.fn(),
    httpRequest: vi.fn(),
  },
}));

// We need to test the non-exported helpers via the exported functions.
// normalizeServerUrl and buildError are internal, but exercised through
// initiateLoginFlow, uploadBackup, etc.
import {
  initiateLoginFlow,
  pollLoginResult,
  uploadBackup,
  getNextcloudErrorMessage,
} from "../nextcloudClient";

// We need fetch mock
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
});

describe("normalizeServerUrl (via initiateLoginFlow)", () => {
  it("returns error for empty server URL", async () => {
    const result = await initiateLoginFlow("");
    expect(result.ok).toBe(false);
    expect(result.error?.code).toBe("INVALID_URL");
  });

  it("returns error for whitespace-only server URL", async () => {
    const result = await initiateLoginFlow("   ");
    expect(result.ok).toBe(false);
    expect(result.error?.code).toBe("INVALID_URL");
  });

  it("prepends https:// when protocol is missing", async () => {
    mockFetch.mockResolvedValueOnce({
      status: 200,
      headers: new Headers({ "content-type": "application/json" }),
      text: async () => JSON.stringify({
        login: "https://nc.example.com/login",
        poll: { endpoint: "https://nc.example.com/poll", token: "abc" },
      }),
    });

    const result = await initiateLoginFlow("nc.example.com");
    expect(result.ok).toBe(true);
    // Verify fetch was called with https://
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("https://nc.example.com"),
      expect.any(Object),
    );
  });

  it("strips trailing slashes from URL", async () => {
    mockFetch.mockResolvedValueOnce({
      status: 200,
      headers: new Headers({ "content-type": "application/json" }),
      text: async () => JSON.stringify({
        login: "https://nc.example.com/login",
        poll: { endpoint: "https://nc.example.com/poll", token: "abc" },
      }),
    });

    await initiateLoginFlow("https://nc.example.com///");
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("https://nc.example.com/index.php"),
      expect.any(Object),
    );
  });
});

describe("buildError (via initiateLoginFlow)", () => {
  it("returns structured error with code and message", async () => {
    const result = await initiateLoginFlow("");
    expect(result.ok).toBe(false);
    expect(result.error).toBeDefined();
    expect(result.error?.code).toBe("INVALID_URL");
    expect(typeof result.error?.message).toBe("string");
    expect(result.error?.retriable).toBe(false);
  });
});

describe("initiateLoginFlow", () => {
  it("returns error on HTTP error response", async () => {
    mockFetch.mockResolvedValueOnce({
      status: 500,
      text: async () => "Internal Server Error",
    });

    const result = await initiateLoginFlow("https://nc.example.com");
    expect(result.ok).toBe(false);
    expect(result.error?.code).toBe("HTTP_ERROR");
    expect(result.error?.httpStatus).toBe(500);
    expect(result.error?.retriable).toBe(true);
  });

  it("marks 429 as retriable", async () => {
    mockFetch.mockResolvedValueOnce({
      status: 429,
      text: async () => "Too Many Requests",
    });

    const result = await initiateLoginFlow("https://nc.example.com");
    expect(result.ok).toBe(false);
    expect(result.error?.retriable).toBe(true);
  });

  it("returns NETWORK_ERROR on fetch exception", async () => {
    mockFetch.mockRejectedValueOnce(new Error("Network failure"));

    const result = await initiateLoginFlow("https://nc.example.com");
    expect(result.ok).toBe(false);
    expect(result.error?.code).toBe("NETWORK_ERROR");
    expect(result.error?.retriable).toBe(true);
  });

  it("returns INVALID_RESPONSE for incomplete JSON", async () => {
    mockFetch.mockResolvedValueOnce({
      status: 200,
      headers: new Headers({ "content-type": "application/json" }),
      text: async () => JSON.stringify({ login: "url" }),
    });

    const result = await initiateLoginFlow("https://nc.example.com");
    expect(result.ok).toBe(false);
    expect(result.error?.code).toBe("INVALID_RESPONSE");
  });
});

describe("pollLoginResult", () => {
  it("returns error for missing pollEndpoint", async () => {
    const result = await pollLoginResult("", "token");
    expect(result.ok).toBe(false);
    expect(result.error?.code).toBe("INVALID_POLL_ENDPOINT");
  });

  it("returns error for missing token", async () => {
    const result = await pollLoginResult("https://nc.example.com/poll", "");
    expect(result.ok).toBe(false);
    expect(result.error?.code).toBe("INVALID_TOKEN");
  });

  it("returns pending status on 404", async () => {
    mockFetch.mockResolvedValueOnce({ status: 404 });

    const result = await pollLoginResult("https://nc.example.com/poll", "token123");
    expect(result.ok).toBe(true);
    expect(result.status).toBe("pending");
  });

  it("returns complete with credentials on success", async () => {
    mockFetch.mockResolvedValueOnce({
      status: 200,
      headers: new Headers({ "content-type": "application/json" }),
      text: async () => JSON.stringify({
        server: "https://nc.example.com",
        loginName: "user",
        appPassword: "pass123",
      }),
    });

    const result = await pollLoginResult("https://nc.example.com/poll", "token123");
    expect(result.ok).toBe(true);
    expect(result.status).toBe("complete");
    expect(result.loginName).toBe("user");
    expect(result.appPassword).toBe("pass123");
  });
});

describe("getNextcloudErrorMessage", () => {
  it("extracts error message from NcResult", () => {
    const result = { ok: false, error: { code: "X", message: "Details", retriable: false } };
    expect(getNextcloudErrorMessage(result)).toBe("Details");
  });

  it("returns fallback for null", () => {
    expect(getNextcloudErrorMessage(null)).toBe("Nextcloud Login fehlgeschlagen");
  });

  it("returns custom fallback", () => {
    expect(getNextcloudErrorMessage(null, "Mein Fehler")).toBe("Mein Fehler");
  });

  it("returns fallback when no error property", () => {
    expect(getNextcloudErrorMessage({ ok: true })).toBe("Nextcloud Login fehlgeschlagen");
  });
});

describe("uploadBackup error handling", () => {
  it("redacts sensitive server response details from upload errors", async () => {
    mockFetch
      .mockResolvedValueOnce({
        status: 200,
        text: async () => JSON.stringify({ ocs: { data: { id: "demo-user" } } }),
      })
      .mockResolvedValueOnce({ status: 405, text: async () => "" })
      .mockResolvedValueOnce({
        status: 500,
        text: async () => "password=fixture-sensitive-value&token=fixture-sensitive-value",
      });

    await expect(uploadBackup(
      "https://nc.example.com",
      "demo-user",
      "fixture-sensitive-value",
      { entries: [] },
    )).rejects.not.toThrow("fixture-sensitive-value");
  });

  it("turns 429 responses into a retry-wait error and skips repeated WebDAV calls while limited", async () => {
    mockFetch
      .mockResolvedValueOnce({
        status: 200,
        text: async () => JSON.stringify({ ocs: { data: { id: "rate-user" } } }),
      })
      .mockResolvedValueOnce({ status: 429, text: async () => "Too Many Requests" });

    await expect(uploadBackup(
      "https://nc.example.com",
      "rate-user",
      "fixture-passphrase",
      { entries: [] },
    )).rejects.toThrow("Nextcloud drosselt gerade Anfragen");

    await expect(uploadBackup(
      "https://nc.example.com",
      "rate-user",
      "fixture-passphrase",
      { entries: [] },
    )).rejects.toThrow("Nextcloud drosselt gerade Anfragen");

    expect(mockFetch).toHaveBeenCalledTimes(2);
  });
});
