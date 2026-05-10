import { describe, it, expect, vi, beforeEach } from "vitest";
import type { CalculationConfig, Entry, UserData, WorkCode } from "../../types";

/**
 * Verifiziert, dass `replaceFullSnapshot` alle drei Sektionen (Entries,
 * UserData, WorkCodes) innerhalb einer einzigen Transaktion schreibt und bei
 * Fehlern atomar zurückrollt.
 */

interface ExecuteCall {
  database?: string;
  statements?: string;
}

interface RunCall {
  statement: string;
  values: unknown[];
}

const executeCalls: ExecuteCall[] = [];
const runCalls: RunCall[] = [];

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

const txMarkers = (): string[] =>
  executeCalls
    .map((c) => (c.statements || "").trim())
    .filter((s) => /^BEGIN TRANSACTION|^COMMIT|^ROLLBACK/.test(s));

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
    Object.values(PLUGIN_MOCK).forEach((fn) => fn.mockClear?.());
    PLUGIN_MOCK.run.mockImplementation(async (opts: RunCall) => {
      runCalls.push({ statement: opts.statement, values: opts.values });
      return { changes: { changes: 1 } };
    });
  });

  it("commits all three sections in a single transaction", async () => {
    const { replaceFullSnapshot } = await import("../snapshot");

    await replaceFullSnapshot({
      entries: [sampleEntry(1, "2025-01-02"), sampleEntry(2, "2025-01-03")],
      userData: sampleUser,
      workCodes: sampleCodes,
    });

    expect(txMarkers()).toEqual(["BEGIN TRANSACTION;", "COMMIT;"]);

    const stmts = runCalls.map((c) => c.statement);
    expect(stmts.filter((s) => s.startsWith("DELETE FROM entries"))).toHaveLength(1);
    expect(stmts.filter((s) => s.startsWith("INSERT OR REPLACE INTO entries"))).toHaveLength(2);
    expect(stmts.filter((s) => s.startsWith("DELETE FROM work_codes"))).toHaveLength(1);
    expect(stmts.filter((s) => s.startsWith("INSERT INTO work_codes"))).toHaveLength(2);

    const userWrite = runCalls.find((c) =>
      c.statement.includes("INSERT OR REPLACE INTO settings") &&
      Array.isArray(c.values) && c.values[0] === "user"
    );
    expect(userWrite).toBeDefined();
    expect(JSON.parse(userWrite!.values[1] as string)).toEqual(sampleUser);
  });

  it("rolls back ALL writes when a later step fails", async () => {
    const { replaceFullSnapshot } = await import("../snapshot");

    // Lass den ersten work_codes-INSERT scheitern → entries und user wurden
    // schon geschrieben, müssen aber durch ROLLBACK zurückgenommen werden.
    PLUGIN_MOCK.run.mockImplementation(async (opts: RunCall) => {
      runCalls.push({ statement: opts.statement, values: opts.values });
      if (opts.statement.startsWith("INSERT INTO work_codes")) {
        throw new Error("simulated work_codes insert failure");
      }
      return { changes: { changes: 1 } };
    });

    await expect(
      replaceFullSnapshot({
        entries: [sampleEntry(1, "2025-01-02")],
        userData: sampleUser,
        workCodes: sampleCodes,
      })
    ).rejects.toThrow("simulated work_codes insert failure");

    expect(txMarkers()).toEqual(["BEGIN TRANSACTION;", "ROLLBACK;"]);
    expect(txMarkers()).not.toContain("COMMIT;");
  });

  it("does not touch a section that is omitted (undefined)", async () => {
    const { replaceFullSnapshot } = await import("../snapshot");

    await replaceFullSnapshot({ entries: [sampleEntry(1, "2025-01-02")] });

    expect(txMarkers()).toEqual(["BEGIN TRANSACTION;", "COMMIT;"]);

    const stmts = runCalls.map((c) => c.statement);
    expect(stmts.some((s) => s.startsWith("DELETE FROM work_codes"))).toBe(false);
    expect(stmts.some((s) => s.startsWith("INSERT INTO work_codes"))).toBe(false);
    expect(
      stmts.some(
        (s) =>
          s.includes("INSERT OR REPLACE INTO settings") &&
          runCalls.find((c) => c.values[0] === "user")
      )
    ).toBe(false);
  });

  it("clears entries when given an empty array (explicit reset)", async () => {
    const { replaceFullSnapshot } = await import("../snapshot");

    await replaceFullSnapshot({ entries: [] });

    expect(txMarkers()).toEqual(["BEGIN TRANSACTION;", "COMMIT;"]);
    const stmts = runCalls.map((c) => c.statement);
    expect(stmts.filter((s) => s.startsWith("DELETE FROM entries"))).toHaveLength(1);
    expect(stmts.filter((s) => s.startsWith("INSERT OR REPLACE INTO entries"))).toHaveLength(0);
  });

  it("empty snapshot ({}) is a no-op (still wrapped in tx, but no writes)", async () => {
    const { replaceFullSnapshot } = await import("../snapshot");

    await replaceFullSnapshot({});

    expect(txMarkers()).toEqual(["BEGIN TRANSACTION;", "COMMIT;"]);
    expect(runCalls).toHaveLength(0);
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

    expect(txMarkers()).toEqual(["BEGIN TRANSACTION;", "COMMIT;"]);
    const stmts = runCalls.map((c) => c.statement);
    expect(stmts.filter((s) => s.startsWith("DELETE FROM attachments"))).toHaveLength(1);
    expect(stmts.filter((s) => s.startsWith("INSERT OR REPLACE INTO attachments"))).toHaveLength(1);
    expect(stmts.filter((s) => s.startsWith("DELETE FROM attachment_labels"))).toHaveLength(1);
    expect(stmts.filter((s) => s.startsWith("INSERT OR REPLACE INTO attachment_labels"))).toHaveLength(2);

    // Position-Index muss für jedes Label vergeben werden (0, 1, …)
    const labelInserts = runCalls.filter((c) =>
      c.statement.startsWith("INSERT OR REPLACE INTO attachment_labels")
    );
    expect(labelInserts.map((c) => c.values[1])).toEqual([0, 1]);
  });

  it("commits calculationConfig as a settings key", async () => {
    const { replaceFullSnapshot } = await import("../snapshot");

    const calcConfig = { weekly: { mode: "fixed", hours: 38.5 } };
    await replaceFullSnapshot({ calculationConfig: calcConfig as unknown as CalculationConfig });

    expect(txMarkers()).toEqual(["BEGIN TRANSACTION;", "COMMIT;"]);
    const calcWrite = runCalls.find(
      (c) =>
        c.statement.includes("INSERT OR REPLACE INTO settings") &&
        Array.isArray(c.values) &&
        c.values[0] === "calculationConfig"
    );
    expect(calcWrite).toBeDefined();
    expect(JSON.parse(calcWrite!.values[1] as string)).toEqual(calcConfig);
  });

  it("rolls back attachments when calculationConfig write fails afterwards", async () => {
    const { replaceFullSnapshot } = await import("../snapshot");

    PLUGIN_MOCK.run.mockImplementation(async (opts: RunCall) => {
      runCalls.push({ statement: opts.statement, values: opts.values });
      if (
        opts.statement.includes("INSERT OR REPLACE INTO settings") &&
        Array.isArray(opts.values) &&
        opts.values[0] === "calculationConfig"
      ) {
        throw new Error("calc write fail");
      }
      return { changes: { changes: 1 } };
    });

    await expect(
      replaceFullSnapshot({
        attachments: [
          {
            id: "a1",
            entryId: 1,
            label: "x",
            fileName: "x",
            mimeType: "x",
            storagePath: "x",
            fileSize: 0,
            createdAt: "2025-01-02",
          },
        ],
        calculationConfig: { weekly: { mode: "fixed", hours: 40 } } as unknown as CalculationConfig,
      })
    ).rejects.toThrow("calc write fail");

    expect(txMarkers()).toEqual(["BEGIN TRANSACTION;", "ROLLBACK;"]);
  });
});
