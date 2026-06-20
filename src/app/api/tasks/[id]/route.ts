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

  const result = await db.execute({
    sql: "SELECT * FROM tasks WHERE id = ?",
    args: [Number(id)],
  });

  const task = result.rows[0];
  if (!task) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }

  if (task.user_id !== user.id && user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const allowed = ["status", "notes", "cve_id", "ioctl_data", "vuln_data", "profile_data"];
  const sets: string[] = [];
  const values: (string | number | null)[] = [];

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

  await db.execute({
    sql: `UPDATE tasks SET ${sets.join(", ")} WHERE id = ?`,
    args: values,
  });

  const statusLabels: Record<string, string> = {
    researching: "Researching",
    exploit_dev: "Exploit Dev",
    exploit_works: "Exploit Works",
    lpe: "LPE",
    reporting: "Reporting",
    done: "Done",
  };

  if (body.status && body.status !== task.status) {
    const allUsers = await db.execute(`SELECT id FROM users WHERE id != ?`, [user.id]);
    const msg = `${user.username} moved "${task.driver_name}" to ${statusLabels[body.status] || body.status}`;
    for (const u of allUsers.rows) {
      await db.execute({
        sql: `INSERT INTO notifications (user_id, type, message, task_id, from_user) VALUES (?, 'status_change', ?, ?, ?)`,
        args: [u.id as number, msg, Number(id), user.username],
      });
    }
    await db.execute({
      sql: `INSERT INTO activity_log (user_id, username, task_id, driver_name, action, detail) VALUES (?, ?, ?, ?, 'status_change', ?)`,
      args: [user.id, user.username, Number(id), task.driver_name as string, `${statusLabels[task.status as string] || task.status} -> ${statusLabels[body.status] || body.status}`],
    });
  }

  if (body.cve_id && body.cve_id !== task.cve_id) {
    const allUsers = await db.execute(`SELECT id FROM users WHERE id != ?`, [user.id]);
    const msg = `${user.username} assigned ${body.cve_id} to "${task.driver_name}"`;
    for (const u of allUsers.rows) {
      await db.execute({
        sql: `INSERT INTO notifications (user_id, type, message, task_id, from_user) VALUES (?, 'cve_assigned', ?, ?, ?)`,
        args: [u.id as number, msg, Number(id), user.username],
      });
    }
    await db.execute({
      sql: `INSERT INTO activity_log (user_id, username, task_id, driver_name, action, detail) VALUES (?, ?, ?, ?, 'cve_assigned', ?)`,
      args: [user.id, user.username, Number(id), task.driver_name as string, body.cve_id],
    });
  }

  if (body.notes && body.notes !== task.notes) {
    await db.execute({
      sql: `INSERT INTO activity_log (user_id, username, task_id, driver_name, action, detail) VALUES (?, ?, ?, ?, 'notes_updated', ?)`,
      args: [user.id, user.username, Number(id), task.driver_name as string, body.notes.substring(0, 100)],
    });
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { id } = await params;
  const result = await db.execute({
    sql: "SELECT * FROM tasks WHERE id = ?",
    args: [Number(id)],
  });

  const task = result.rows[0];
  if (!task) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }

  if (task.user_id !== user.id && user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await db.execute({
    sql: "DELETE FROM tasks WHERE id = ?",
    args: [Number(id)],
  });

  return NextResponse.json({ ok: true });
}
