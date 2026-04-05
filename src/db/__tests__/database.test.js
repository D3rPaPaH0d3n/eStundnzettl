import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * Regressionstest für den Welle-3-Postmortem-Bug:
 *
 *   CapacitorSQLite.query(...) verlangt `values` als Pflicht-Feld, auch wenn
 *   das Statement parameterlos ist. Ein Aufruf ohne `values` wirft im echten
 *   Plugin `"Query: Must provide an Array of Strings"`. Wenn database.js den
 *   queryFn-Wrapper ohne `values` an runMigrations weitergibt, knallt der
 *   erste SELECT gegen schema_version → komplette DB-Init schlägt fehl →
 *   keine Entries, keine Backups, kein Create.
 *
 * Dieser Test nagelt den Plugin-Contract fest, damit der Bug nicht nochmal
 * still zurückkommt.
 */

const pluginCalls = {
  query: [],
  execute: [],
  createConnection: [],
  open: [],
  close: [],
  checkConnectionsConsistency: [],
};

const STRICT_PLUGIN_MOCK = {
  checkConnectionsConsistency: vi.fn(async (opts) => {
    pluginCalls.checkConnectionsConsistency.push(opts);
    return { result: true };
  }),
  createConnection: vi.fn(async (opts) => {
    pluginCalls.createConnection.push(opts);
    return {};
  }),
  open: vi.fn(async (opts) => {
    pluginCalls.open.push(opts);
    return {};
  }),
  close: vi.fn(async (opts) => {
    pluginCalls.close.push(opts);
    return {};
  }),
  execute: vi.fn(async (opts) => {
    pluginCalls.execute.push(opts);
    // CREATE TABLE / CREATE INDEX → no-op
    return { changes: { changes: 0 } };
  }),
  run: vi.fn(async () => ({ changes: { changes: 0 } })),
  executeSet: vi.fn(async () => ({ changes: { changes: 0 } })),
  query: vi.fn(async (opts) => {
    pluginCalls.query.push(opts);

    // HIER ist der Plugin-Contract fest verdrahtet: wenn `values` fehlt oder
    // kein Array ist, werfen wir exakt wie das echte Plugin.
    if (!Array.isArray(opts?.values)) {
      throw new Error("Query: Must provide an Array of Strings");
    }

    // Minimaler Response für die Queries, die runMigrations feuert:
    //  - SELECT version FROM schema_version → leer (frische DB)
    //  - SELECT name FROM sqlite_master ... name='entries' → leer
    return { values: [] };
  }),
};

vi.mock("@capacitor-community/sqlite", () => ({
  CapacitorSQLite: STRICT_PLUGIN_MOCK,
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

describe("database.js — Plugin-Contract-Regression (Welle 3 Postmortem)", () => {
  beforeEach(() => {
    // Module zwischen Tests neu laden, da database.js einen Modul-Singleton
    // (_ready) hält, der sonst aus vorherigen Tests leckt.
    vi.resetModules();
    pluginCalls.query.length = 0;
    pluginCalls.execute.length = 0;
    pluginCalls.createConnection.length = 0;
    pluginCalls.open.length = 0;
    pluginCalls.checkConnectionsConsistency.length = 0;
    Object.values(STRICT_PLUGIN_MOCK).forEach((fn) => fn.mockClear?.());
  });

  it("getDb() läuft durch, wenn der Plugin-Contract erfüllt ist", async () => {
    const { getDb } = await import("../database");
    const dbName = await getDb();
    expect(dbName).toBeTruthy();

    // Alle query()-Calls müssen `values: Array` haben — sonst wäre der
    // strict mock oben geworfen.
    expect(pluginCalls.query.length).toBeGreaterThan(0);
    for (const call of pluginCalls.query) {
      expect(Array.isArray(call.values)).toBe(true);
    }
  });

  it("query-Wrapper ruft das Plugin IMMER mit values: [] auf, auch bei parameterlosen Statements", async () => {
    const { getDb } = await import("../database");
    await getDb();

    // runMigrations feuert u.a. `SELECT version FROM schema_version` ohne Parameter.
    const schemaVersionSelect = pluginCalls.query.find((c) =>
      /SELECT\s+version\s+FROM\s+schema_version/i.test(c.statement || "")
    );
    expect(schemaVersionSelect).toBeDefined();
    expect(Array.isArray(schemaVersionSelect.values)).toBe(true);
  });

  it("wirft die erwartete Plugin-Fehlermeldung, wenn values tatsächlich vergessen wird (Sanity-Check des Mocks)", async () => {
    // Direkter Aufruf am Mock ohne `values` → muss werfen wie das echte Plugin.
    await expect(
      STRICT_PLUGIN_MOCK.query({ database: "x", statement: "SELECT 1;" })
    ).rejects.toThrow("Must provide an Array of Strings");
  });
});
