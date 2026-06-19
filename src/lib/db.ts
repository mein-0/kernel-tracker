import { createClient } from "@libsql/client";

const db = createClient({
  url: process.env.TURSO_URL || "libsql://kernel-tracker-mein.aws-us-east-1.turso.io",
  authToken: process.env.TURSO_AUTH_TOKEN,
});

async function init() {
  await db.executeMultiple(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT DEFAULT 'researcher',
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      driver_name TEXT NOT NULL,
      driver_hash TEXT,
      status TEXT DEFAULT 'researching',
      ioctl_count INTEGER DEFAULT 0,
      ioctl_data TEXT,
      vuln_data TEXT,
      profile_data TEXT,
      notes TEXT,
      cve_id TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id)
    );
  `);
}

init().catch(console.error);

export default db;
