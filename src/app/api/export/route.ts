import { NextResponse } from "next/server";
import db from "@/lib/db";
import { getUser } from "@/lib/auth";

export async function GET(req: Request) {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const format = searchParams.get("format") || "json";
  const scope = searchParams.get("scope") || "my";

  let result;
  if (scope === "all") {
    result = await db.execute(
      `SELECT tasks.*, users.username FROM tasks JOIN users ON tasks.user_id = users.id ORDER BY tasks.updated_at DESC`
    );
  } else {
    result = await db.execute({
      sql: `SELECT tasks.*, users.username FROM tasks JOIN users ON tasks.user_id = users.id WHERE tasks.user_id = ? ORDER BY tasks.updated_at DESC`,
      args: [user.id],
    });
  }

  const tasks = result.rows.map((row) => ({
    id: row.id,
    driver_name: row.driver_name,
    username: row.username,
    status: row.status,
    ioctl_count: row.ioctl_count,
    cve_id: row.cve_id,
    notes: row.notes,
    ioctls: row.ioctl_data ? JSON.parse(row.ioctl_data as string) : [],
    vulnerabilities: row.vuln_data ? JSON.parse(row.vuln_data as string) : {},
    profile: row.profile_data ? JSON.parse(row.profile_data as string) : {},
    created_at: row.created_at,
    updated_at: row.updated_at,
  }));

  if (format === "csv") {
    const header = "ID,Driver,User,Status,IOCTLs,CVE,Created,Updated";
    const rows = tasks.map(
      (t) =>
        `${t.id},"${t.driver_name}","${t.username}","${t.status}",${t.ioctl_count},"${t.cve_id || ""}","${t.created_at}","${t.updated_at}"`
    );
    const csv = [header, ...rows].join("\n");

    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="kernel-tracker-export.csv"`,
      },
    });
  }

  return new Response(JSON.stringify(tasks, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="kernel-tracker-export.json"`,
    },
  });
}
