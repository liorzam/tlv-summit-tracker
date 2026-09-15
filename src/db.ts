import initSqlJs, { type Database } from "sql.js";
import { get, set } from "idb-keyval";
import { ALL_ITEMS } from "./catalog";

const IDB_KEY = "summit-watchlist.sqlite";

export type SessionRow = {
  id: string;
  title: string;
  track: string;
  status: "not_started" | "in_progress" | "watched";
  position_sec: number;
  duration_sec: number;
  notes: string;
  updated_at: string;
};

let db: Database | null = null;
let saveTimer: ReturnType<typeof setTimeout> | null = null;

function persistSoon() {
  if (!db) return;
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(async () => {
    if (!db) return;
    const bytes = db.export();
    await set(IDB_KEY, bytes);
  }, 250);
}

export async function openDatabase(): Promise<Database> {
  if (db) return db;
  const SQL = await initSqlJs({ locateFile: () => "/sql-wasm.wasm" });
  const saved = await get<Uint8Array>(IDB_KEY);
  db = saved ? new SQL.Database(saved) : new SQL.Database();

  db.run(`
    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      track TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'not_started',
      position_sec INTEGER NOT NULL DEFAULT 0,
      duration_sec INTEGER NOT NULL DEFAULT 0,
      notes TEXT NOT NULL DEFAULT '',
      updated_at TEXT NOT NULL DEFAULT ''
    );
  `);

  // Seed / sync catalog rows without clobbering existing progress.
  const insert = db.prepare(
    `INSERT INTO sessions (id, title, track) VALUES (:id, :title, :track)
     ON CONFLICT(id) DO UPDATE SET title = excluded.title, track = excluded.track`
  );
  for (const item of ALL_ITEMS) {
    insert.run({ ":id": item.id, ":title": item.title, ":track": item.track });
  }
  insert.free();

  if (!saved) persistSoon();
  return db;
}

export function getAllSessions(database: Database): SessionRow[] {
  const res = database.exec(
    `SELECT id, title, track, status, position_sec, duration_sec, notes, updated_at
     FROM sessions ORDER BY rowid`
  );
  if (res.length === 0) return [];
  const { columns, values } = res[0];
  return values.map((row) => {
    const obj: Record<string, unknown> = {};
    columns.forEach((c, i) => (obj[c] = row[i]));
    return obj as unknown as SessionRow;
  });
}

export function updateSession(
  database: Database,
  id: string,
  patch: Partial<Pick<SessionRow, "status" | "position_sec" | "duration_sec" | "notes">>
) {
  const fields: string[] = [];
  const params: Record<string, unknown> = { ":id": id };
  for (const [k, v] of Object.entries(patch)) {
    fields.push(`${k} = :${k}`);
    params[`:${k}`] = v as unknown;
  }
  fields.push(`updated_at = :updated_at`);
  params[":updated_at"] = new Date().toISOString();
  database.run(`UPDATE sessions SET ${fields.join(", ")} WHERE id = :id`, params as any);
  persistSoon();
}

export function exportDbFile(database: Database): Blob {
  const bytes = database.export();
  return new Blob([bytes.slice().buffer], { type: "application/x-sqlite3" });
}
