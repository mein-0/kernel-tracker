import { NextResponse } from "next/server";
import db from "@/lib/db";
import { getUser } from "@/lib/auth";

export async function GET(req: Request) {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const driverName = searchParams.get("driver");

  if (driverName) {
    const result = await db.execute({
      sql: `SELECT tasks.*, users.username FROM tasks JOIN users ON tasks.user_id = users.id WHERE tasks.driver_name = ? ORDER BY tasks.created_at DESC`,
      args: [driverName],
    });
    return NextResponse.json(result.rows);
  }

  const result = await db.execute(
    `SELECT driver_name, COUNT(*) as scan_count FROM tasks GROUP BY driver_name HAVING COUNT(*) > 1 ORDER BY scan_count DESC`
  );
  return NextResponse.json(result.rows);
}
