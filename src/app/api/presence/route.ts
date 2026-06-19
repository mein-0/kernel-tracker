import { NextResponse } from "next/server";
import db from "@/lib/db";
import { getUser } from "@/lib/auth";

export async function GET() {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  await db.execute({
    sql: `INSERT INTO presence (user_id, username, last_seen) VALUES (?, ?, datetime('now'))
          ON CONFLICT(user_id) DO UPDATE SET last_seen = datetime('now')`,
    args: [user.id, user.username],
  });

  const result = await db.execute(
    `SELECT * FROM presence WHERE last_seen > datetime('now', '-2 minutes')`
  );

  return NextResponse.json(result.rows);
}
