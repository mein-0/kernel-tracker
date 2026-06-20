import { NextResponse } from "next/server";
import db from "@/lib/db";
import { getUser } from "@/lib/auth";

export async function GET(req: Request) {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const taskId = searchParams.get("task_id");
  const limit = Number(searchParams.get("limit") || "50");

  if (taskId) {
    const result = await db.execute({
      sql: `SELECT * FROM activity_log WHERE task_id = ? ORDER BY created_at DESC LIMIT ?`,
      args: [Number(taskId), limit],
    });
    return NextResponse.json(result.rows);
  }

  const result = await db.execute({
    sql: `SELECT * FROM activity_log ORDER BY created_at DESC LIMIT ?`,
    args: [limit],
  });
  return NextResponse.json(result.rows);
}
