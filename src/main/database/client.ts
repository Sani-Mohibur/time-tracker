import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as electronModule from 'electron';
const app = (electronModule as any)?.app || (electronModule as any)?.default?.app;
import path from 'path';
import fs from 'fs';
import * as schema from './schema';

let sqliteDb: Database.Database | null = null;
let drizzleDb: ReturnType<typeof drizzle<typeof schema>> | null = null;

export function getDatabasePath(): string {
  // In Electron runtime, store in user's AppData/userData directory
  // In tests or outside Electron, store in .data directory
  let userDataPath: string;
  try {
    if (app && typeof app.getPath === 'function') {
      userDataPath = app.getPath('userData');
    } else {
      userDataPath = path.resolve(process.cwd(), '.data');
    }
  } catch {
    userDataPath = path.resolve(process.cwd(), '.data');
  }

  if (!fs.existsSync(userDataPath)) {
    fs.mkdirSync(userDataPath, { recursive: true });
  }

  const dbPath = path.join(userDataPath, 'tracker.db');
  return dbPath;
}

export function initDatabase() {
  if (drizzleDb && sqliteDb) {
    return drizzleDb;
  }

  const dbPath = getDatabasePath();
  console.log(`[Database] Initializing SQLite database at: ${dbPath}`);

  sqliteDb = new Database(dbPath);

  // Enable foreign keys for cascading deletes
  sqliteDb.pragma('foreign_keys = ON');
  // Enable WAL mode for high concurrency & reliability
  sqliteDb.pragma('journal_mode = WAL');

  // Ensure tables exist
  sqliteDb.exec(`
    CREATE TABLE IF NOT EXISTS tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS time_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
      date TEXT NOT NULL,
      start_time INTEGER NOT NULL,
      end_time INTEGER,
      duration INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_sessions_task_id ON time_sessions(task_id);
    CREATE INDEX IF NOT EXISTS idx_sessions_date ON time_sessions(date);
    CREATE INDEX IF NOT EXISTS idx_sessions_status ON time_sessions(status);
  `);

  drizzleDb = drizzle(sqliteDb, { schema });
  return drizzleDb;
}

export function getDb() {
  if (!drizzleDb) {
    return initDatabase();
  }
  return drizzleDb;
}

export function getSqliteRaw(): Database.Database {
  if (!sqliteDb) {
    initDatabase();
  }
  return sqliteDb!;
}
