import { NextResponse } from "next/server";
import db from "@/lib/db";
import { getUser } from "@/lib/auth";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json();

  const task = db.prepare("SELECT * FROM tasks WHERE id = ?").get(Number(id)) as
    | { user_id: number }
    | undefined;

  if (!task) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }

  if (task.user_id !== user.id && user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const allowed = ["status", "notes", "cve_id", "ioctl_data", "vuln_data", "profile_data"];
  const sets: string[] = [];
  const values: unknown[] = [];

  for (const key of allowed) {
    if (key in body) {
      sets.push(`${key} = ?`);
      const val = body[key];
      values.push(typeof val === "object" && val !== null ? JSON.stringify(val) : val);
    }
  }

  if (sets.length === 0) {
    return NextResponse.json({ error: "No valid fields" }, { status: 400 });
  }

  sets.push("updated_at = datetime('now')");
  values.push(Number(id));

  db.prepare(`UPDATE tasks SET ${sets.join(", ")} WHERE id = ?`).run(...values);

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { id } = await params;
  const task = db.prepare("SELECT * FROM tasks WHERE id = ?").get(Number(id)) as
    | { user_id: number }
    | undefined;

  if (!task) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }

  if (task.user_id !== user.id && user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  db.prepare("DELETE FROM tasks WHERE id = ?").run(Number(id));
  return NextResponse.json({ ok: true });
}
