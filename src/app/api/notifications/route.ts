import { NextResponse } from "next/server";
import db from "@/lib/db";
import { getUser } from "@/lib/auth";

export async function GET() {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const result = await db.execute({
    sql: `SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 50`,
    args: [user.id],
  });

  return NextResponse.json(result.rows);
}

export async function PATCH(req: Request) {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { id, read_all } = await req.json();

  if (read_all) {
    await db.execute({
      sql: "UPDATE notifications SET is_read = 1 WHERE user_id = ?",
      args: [user.id],
    });
  } else if (id) {
    await db.execute({
      sql: "UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?",
      args: [id, user.id],
    });
  }

  return NextResponse.json({ ok: true });
}
