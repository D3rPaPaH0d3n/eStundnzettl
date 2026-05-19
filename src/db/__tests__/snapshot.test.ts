import { describe, it, expect, vi, beforeEach } from "vitest";
import type { CalculationConfig, Entry, UserData, WorkCode } from "../../types";

/**
 * Verifiziert, dass `replaceFullSnapshot` alle Snapshot-Sektionen als einen
 * nativen SQLite-Batch schreibt. Das vermeidet manuelle JS-Transaktionen um
 * einzelne `run()`-Calls und passt zum Capacitor-SQLite-Pfad in der App.
 */

interface ExecuteCall {
  database?: string;
  statements?: string;
}

interface RunCall {
  statement: string;
  values: unknown[];
}

interface ExecuteSetCall {
  database?: string;
  set?: Array<{ statement: string; values: unknown[] }>;
  transaction?: boolean;
}

const executeCalls: ExecuteCall[] = [];
const runCalls: RunCall[] = [];
const executeSetCalls: ExecuteSetCall[] = [];

const PLUGIN_MOCK = {
  checkConnectionsConsistency: vi.fn(async () => ({ result: true })),
  createConnection: vi.fn(async () => ({})),
  open: vi.fn(async () => ({})),
  close: vi.fn(async () => ({})),
  execute: vi.fn(async (opts: ExecuteCall) => {
    executeCalls.push(opts);
    return { changes: { changes: 0 } };
  }),
  run: vi.fn(async (opts: RunCall) => {
    runCalls.push({ statement: opts.statement, values: opts.values });
    return { changes: { changes: 1 } };
  }),
  executeSet: vi.fn(async (opts: ExecuteSetCall) => {
    executeSetCalls.push(opts);
    return { changes: { changes: 0 } };
  }),
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

const txMarkers = (): string[] =>
  executeCalls
    .map((c) => (c.statements || "").trim())
    .filter((s) => /^BEGIN TRANSACTION|^COMMIT|^ROLLBACK/.test(s));

const snapshotSet = (): Array<{ statement: string; values: unknown[] }> => {
  expect(executeSetCalls).toHaveLength(1);
  expect(executeSetCalls[0].transaction).toBe(true);
  return executeSetCalls[0].set || [];
};

const sampleEntry = (id: number, date: string): Entry => ({
  id,
  type: "work",
  date,
  start: "08:00",
  end: "16:30",
  pause: 30,
  project: null,
  code: null,
  netDuration: 480,
});

const sampleUser: UserData = {
  name: "Markus",
} as UserData;

const sampleCodes: WorkCode[] = [
  { id: 1, label: "Montage" },
  { id: 2, label: "Service" },
];

describe("replaceFullSnapshot", () => {
  beforeEach(() => {
    vi.resetModules();
    executeCalls.length = 0;
    runCalls.length = 0;
    executeSetCalls.length = 0;
    Object.values(PLUGIN_MOCK).forEach((fn) => fn.mockClear?.());
    PLUGIN_MOCK.executeSet.mockImplementation(async (opts: ExecuteSetCall) => {
      executeSetCalls.push(opts);
      return { changes: { changes: 0 } };
    });
  });

  it("commits all three sections in a single native executeSet transaction", async () => {
    const { replaceFullSnapshot } = await import("../snapshot");

    await replaceFullSnapshot({
      entries: [sampleEntry(1, "2025-01-02"), sampleEntry(2, "2025-01-03")],
      userData: sampleUser,
      workCodes: sampleCodes,
    });

    expect(txMarkers()).toEqual([]);
    expect(runCalls).toHaveLength(0);

    const set = snapshotSet();
    const stmts = set.map((c) => c.statement);
    expect(stmts.filter((s) => s.startsWith("DELETE FROM entries"))).toHaveLength(1);
    expect(stmts.filter((s) => s.startsWith("INSERT OR REPLACE INTO entries"))).toHaveLength(2);
    expect(stmts.filter((s) => s.startsWith("DELETE FROM work_codes"))).toHaveLength(1);
    expect(stmts.filter((s) => s.startsWith("INSERT INTO work_codes"))).toHaveLength(2);

    const userWrite = set.find(
      (c) => c.statement.includes("INSERT OR REPLACE INTO settings") && c.values[0] === "user"
    );
    expect(userWrite).toBeDefined();
    expect(JSON.parse(userWrite!.values[1] as string)).toEqual(sampleUser);
  });

  it("propagates native executeSet errors", async () => {
    const { replaceFullSnapshot } = await import("../snapshot");

    PLUGIN_MOCK.executeSet.mockImplementation(async (opts: ExecuteSetCall) => {
      executeSetCalls.push(opts);
      throw new Error("simulated native batch failure");
    });

    await expect(
      replaceFullSnapshot({
        entries: [sampleEntry(1, "2025-01-02")],
        userData: sampleUser,
        workCodes: sampleCodes,
      })
    ).rejects.toThrow("simulated native batch failure");

    expect(executeSetCalls).toHaveLength(1);
    expect(executeSetCalls[0].transaction).toBe(true);
    expect(txMarkers()).toEqual([]);
  });

  it("does not touch a section that is omitted (undefined)", async () => {
    const { replaceFullSnapshot } = await import("../snapshot");

    await replaceFullSnapshot({ entries: [sampleEntry(1, "2025-01-02")] });

    const stmts = snapshotSet().map((c) => c.statement);
    expect(stmts.some((s) => s.startsWith("DELETE FROM work_codes"))).toBe(false);
    expect(stmts.some((s) => s.startsWith("INSERT INTO work_codes"))).toBe(false);
    expect(
      stmts.some((s) => s.includes("INSERT OR REPLACE INTO settings")) &&
        snapshotSet().some((c) => c.values[0] === "user")
    ).toBe(false);
  });

  it("clears entries when given an empty array (explicit reset)", async () => {
    const { replaceFullSnapshot } = await import("../snapshot");

    await replaceFullSnapshot({ entries: [] });

    const stmts = snapshotSet().map((c) => c.statement);
    expect(stmts.filter((s) => s.startsWith("DELETE FROM entries"))).toHaveLength(1);
    expect(stmts.filter((s) => s.startsWith("INSERT OR REPLACE INTO entries"))).toHaveLength(0);
  });

  it("empty snapshot ({}) is a no-op", async () => {
    const { replaceFullSnapshot } = await import("../snapshot");

    await replaceFullSnapshot({});

    expect(executeSetCalls).toHaveLength(0);
    expect(runCalls).toHaveLength(0);
    expect(txMarkers()).toEqual([]);
  });

  it("commits attachments and attachmentLabels atomically", async () => {
    const { replaceFullSnapshot } = await import("../snapshot");

    await replaceFullSnapshot({
      attachments: [
        {
          id: "a1",
          entryId: 1,
          label: "Beleg",
          fileName: "x.pdf",
          mimeType: "application/pdf",
          storagePath: "/tmp/x.pdf",
          fileSize: 1234,
          createdAt: "2025-01-02",
        },
      ],
      attachmentLabels: ["Beleg", "Foto"],
    });

    const set = snapshotSet();
    const stmts = set.map((c) => c.statement);
    expect(stmts.filter((s) => s.startsWith("DELETE FROM attachments"))).toHaveLength(1);
    expect(stmts.filter((s) => s.startsWith("INSERT OR REPLACE INTO attachments"))).toHaveLength(1);
    expect(stmts.filter((s) => s.startsWith("DELETE FROM attachment_labels"))).toHaveLength(1);
    expect(stmts.filter((s) => s.startsWith("INSERT OR REPLACE INTO attachment_labels"))).toHaveLength(2);

    const labelInserts = set.filter((c) =>
      c.statement.startsWith("INSERT OR REPLACE INTO attachment_labels")
    );
    expect(labelInserts.map((c) => c.values[1])).toEqual([0, 1]);
  });

  it("commits calculationConfig as a settings key", async () => {
    const { replaceFullSnapshot } = await import("../snapshot");

    const calcConfig = { weekly: { mode: "fixed", hours: 38.5 } };
    await replaceFullSnapshot({ calculationConfig: calcConfig as unknown as CalculationConfig });

    const calcWrite = snapshotSet().find(
      (c) => c.statement.includes("INSERT OR REPLACE INTO settings") && c.values[0] === "calculationConfig"
    );
    expect(calcWrite).toBeDefined();
    expect(JSON.parse(calcWrite!.values[1] as string)).toEqual(calcConfig);
  });
});
