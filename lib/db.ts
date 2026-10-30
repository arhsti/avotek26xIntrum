import "server-only";
import { promises as fs } from "fs";
import path from "path";
import type postgres from "postgres";

/**
 * Enkel dokumentdatabase med to backends:
 *  - Postgres (når DATABASE_URL er satt), én tabell `records` med jsonb-data
 *  - JSON-fil (lokal utvikling / demo uten database)
 */

export type Collection = "onboardings" | "cases" | "integration_log" | "funnel_events";

export type Row<T> = T & { id: string; createdAt: string; updatedAt: string };

interface Store {
  insert<T extends object>(c: Collection, id: string, data: T): Promise<Row<T>>;
  update<T extends object>(c: Collection, id: string, patch: Partial<T>): Promise<Row<T> | null>;
  get<T extends object>(c: Collection, id: string): Promise<Row<T> | null>;
  list<T extends object>(c: Collection, limit?: number): Promise<Row<T>[]>;
}

// ---------- Postgres ----------

// Vercel + Neon setter DATABASE_URL (eller POSTGRES_URL, avhengig av oppsett)
const DB_URL = process.env.DATABASE_URL || process.env.POSTGRES_URL;

let sqlClient: postgres.Sql | null = null;
let schemaReady: Promise<unknown> | null = null;

async function sql() {
  if (!sqlClient) {
    const { default: pg } = await import("postgres");
    // prepare: false – Neons pooler (PgBouncer) tåler ikke alltid lagrede spørringer
    sqlClient = pg(DB_URL!, { ssl: "require", max: 3, idle_timeout: 20, prepare: false });
  }
  if (!schemaReady) {
    schemaReady = sqlClient`
      CREATE TABLE IF NOT EXISTS records (
        collection text NOT NULL,
        id text NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        data jsonb NOT NULL,
        PRIMARY KEY (collection, id)
      )`.then(() => sqlClient!`CREATE INDEX IF NOT EXISTS records_created_idx ON records (collection, created_at DESC)`);
  }
  await schemaReady;
  return sqlClient;
}

// `undefined` forsvinner i JSON – gjør om til null slik at feltet faktisk nullstilles
const withNulls = (o: object) => JSON.parse(JSON.stringify(o, (_k, v) => (v === undefined ? null : v)));

type PgRow = { id: string; created_at: Date; updated_at: Date; data: object };

function fromPg<T>(r: PgRow): Row<T> {
  return { ...(r.data as T), id: r.id, createdAt: r.created_at.toISOString(), updatedAt: r.updated_at.toISOString() };
}

const pgStore: Store = {
  async insert(c, id, data) {
    const db = await sql();
    const [r] = await db<PgRow[]>`
      INSERT INTO records (collection, id, data) VALUES (${c}, ${id}, ${db.json(data as never)})
      RETURNING id, created_at, updated_at, data`;
    return fromPg(r);
  },
  async update(c, id, patch) {
    const db = await sql();
    const [r] = await db<PgRow[]>`
      UPDATE records SET data = data || ${db.json(withNulls(patch) as never)}, updated_at = now()
      WHERE collection = ${c} AND id = ${id}
      RETURNING id, created_at, updated_at, data`;
    return r ? fromPg(r) : null;
  },
  async get(c, id) {
    const db = await sql();
    const [r] = await db<PgRow[]>`
      SELECT id, created_at, updated_at, data FROM records WHERE collection = ${c} AND id = ${id}`;
    return r ? fromPg(r) : null;
  },
  async list(c, limit = 500) {
    const db = await sql();
    const rows = await db<PgRow[]>`
      SELECT id, created_at, updated_at, data FROM records WHERE collection = ${c}
      ORDER BY created_at DESC LIMIT ${limit}`;
    return rows.map((r) => fromPg(r));
  },
};

// ---------- JSON-fil ----------

type FileDb = Record<string, Record<string, Row<object>>>;

const filePath = process.env.VERCEL
  ? "/tmp/intrum-onboarding-db.json"
  : path.join(process.cwd(), ".data", "db.json");

let fileQueue: Promise<unknown> = Promise.resolve();

async function readFileDb(): Promise<FileDb> {
  try {
    return JSON.parse(await fs.readFile(filePath, "utf8"));
  } catch {
    return {};
  }
}

async function writeFileDb(db: FileDb) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, JSON.stringify(db, null, 2));
}

// Serialiserer skriving så samtidige kall ikke overskriver hverandre
function withFile<R>(fn: (db: FileDb) => R | Promise<R>, write: boolean): Promise<R> {
  const run = fileQueue.then(async () => {
    const db = await readFileDb();
    const result = await fn(db);
    if (write) await writeFileDb(db);
    return result;
  });
  fileQueue = run.catch(() => undefined);
  return run;
}

const fileStore: Store = {
  insert(c, id, data) {
    return withFile((db) => {
      const now = new Date().toISOString();
      const row = { ...data, id, createdAt: now, updatedAt: now };
      (db[c] ??= {})[id] = row;
      return row;
    }, true);
  },
  update<T extends object>(c: Collection, id: string, patch: Partial<T>) {
    return withFile((db) => {
      const existing = db[c]?.[id];
      if (!existing) return null;
      const row = { ...existing, ...patch, updatedAt: new Date().toISOString() };
      db[c][id] = row;
      return row as Row<T>;
    }, true);
  },
  get<T extends object>(c: Collection, id: string) {
    return withFile((db) => ((db[c]?.[id] as Row<T> | undefined) ?? null), false);
  },
  list<T extends object>(c: Collection, limit = 500) {
    return withFile(
      (db) =>
        (Object.values(db[c] ?? {}) as Row<T>[])
          .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
          .slice(0, limit),
      false,
    );
  },
};

export const db: Store = DB_URL ? pgStore : fileStore;
export const dbBackend = DB_URL ? "postgres" : process.env.VERCEL ? "tmp-file" : "file";

export function newId(prefix: string) {
  return `${prefix}_${crypto.randomUUID().replace(/-/g, "").slice(0, 16)}`;
}
