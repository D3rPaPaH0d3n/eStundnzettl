import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * Tests für den `transaction()`-Wrapper aus database.ts.
 *
 * Wichtig: BEGIN/COMMIT/ROLLBACK laufen über `CapacitorSQLite.execute(...)`.
 * Der Mock zählt diese Calls und erlaubt uns, atomare Semantik zu verifizieren,
 * ohne ein echtes SQLite zu brauchen.
 */

interface ExecuteCall {
  database?: string;
  statements?: string;
}

const executeCalls: ExecuteCall[] = [];

const PLUGIN_MOCK = {
  checkConnectionsConsistency: vi.fn(async () => ({ result: true })),
  createConnection: vi.fn(async () => ({})),
  open: vi.fn(async () => ({})),
  close: vi.fn(async () => ({})),
  execute: vi.fn(async (opts: ExecuteCall) => {
    executeCalls.push(opts);
    return { changes: { changes: 0 } };
  }),
  run: vi.fn(async () => ({ changes: { changes: 0 } })),
  executeSet: vi.fn(async () => ({ changes: { changes: 0 } })),
  query: vi.fn(async () => ({ values: [] })),
};

vi.mock("@capacitor-community/sqlite", () => ({
  CapacitorSQLite: PLUGIN_MOCK,
}));

vi.mock("../../utils/logger", () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
  reportError: vi.fn(),
}));

const stmts = (calls: ExecuteCall[]): string[] =>
  calls.map((c) => (c.statements || "").trim());

describe("database.transaction()", () => {
  beforeEach(() => {
    vi.resetModules();
    executeCalls.length = 0;
    Object.values(PLUGIN_MOCK).forEach((fn) => fn.mockClear?.());
  });

  it("commits when fn resolves", async () => {
    const { transaction } = await import("../database");
    const fn = vi.fn(async () => "ok");

    const result = await transaction(fn);

    expect(result).toBe("ok");
    expect(fn).toHaveBeenCalledOnce();

    const txStmts = stmts(executeCalls).filter((s) =>
      /^BEGIN TRANSACTION|^COMMIT|^ROLLBACK/.test(s)
    );
    expect(txStmts).toEqual(["BEGIN TRANSACTION;", "COMMIT;"]);
  });

  it("rolls back and rethrows the original error when fn throws", async () => {
    const { transaction } = await import("../database");
    const original = new Error("boom");

    await expect(
      transaction(async () => {
        throw original;
      })
    ).rejects.toBe(original);

    const txStmts = stmts(executeCalls).filter((s) =>
      /^BEGIN TRANSACTION|^COMMIT|^ROLLBACK/.test(s)
    );
    expect(txStmts).toEqual(["BEGIN TRANSACTION;", "ROLLBACK;"]);
  });

  it("does not COMMIT when fn throws", async () => {
    const { transaction } = await import("../database");

    await expect(
      transaction(async () => {
        throw new Error("nope");
      })
    ).rejects.toThrow("nope");

    const committed = stmts(executeCalls).some((s) => s === "COMMIT;");
    expect(committed).toBe(false);
  });

  it("rethrows the ORIGINAL error even if ROLLBACK itself fails", async () => {
    const { transaction } = await import("../database");
    const original = new Error("user-fault");

    // Mache ROLLBACK kaputt — der ursprüngliche Fehler muss trotzdem durchkommen.
    PLUGIN_MOCK.execute.mockImplementation(async (opts: ExecuteCall) => {
      executeCalls.push(opts);
      if ((opts.statements || "").trim() === "ROLLBACK;") {
        throw new Error("rollback-also-broken");
      }
      return { changes: { changes: 0 } };
    });

    await expect(
      transaction(async () => {
        throw original;
      })
    ).rejects.toBe(original);
  });

  it("only opens one transaction per call (no double BEGIN)", async () => {
    const { transaction } = await import("../database");

    await transaction(async () => "x");

    const begins = stmts(executeCalls).filter((s) => s === "BEGIN TRANSACTION;");
    const commits = stmts(executeCalls).filter((s) => s === "COMMIT;");
    expect(begins).toHaveLength(1);
    expect(commits).toHaveLength(1);
  });
});
