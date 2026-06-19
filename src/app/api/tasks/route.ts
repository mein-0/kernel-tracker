import { NextResponse } from "next/server";
import db from "@/lib/db";
import { getUser } from "@/lib/auth";

export async function GET() {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const tasks = db
    .prepare(
      `SELECT tasks.*, users.username
       FROM tasks
       JOIN users ON tasks.user_id = users.id
       ORDER BY tasks.updated_at DESC`
    )
    .all();

  return NextResponse.json(tasks);
}

export async function POST(req: Request) {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = await req.json();
  const {
    driver_name,
    driver_hash,
    status = "researching",
    ioctl_count = 0,
    ioctl_data,
    vuln_data,
    profile_data,
    notes,
  } = body;

  if (!driver_name) {
    return NextResponse.json({ error: "driver_name required" }, { status: 400 });
  }

  const result = db
    .prepare(
      `INSERT INTO tasks (user_id, driver_name, driver_hash, status, ioctl_count, ioctl_data, vuln_data, profile_data, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      user.id,
      driver_name,
      driver_hash || null,
      status,
      ioctl_count,
      ioctl_data ? JSON.stringify(ioctl_data) : null,
      vuln_data ? JSON.stringify(vuln_data) : null,
      profile_data ? JSON.stringify(profile_data) : null,
      notes || null
    );

  return NextResponse.json({ id: result.lastInsertRowid, ok: true }, { status: 201 });
}
