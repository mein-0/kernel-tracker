import { NextResponse } from "next/server";
import db from "@/lib/db";

const API_KEY = process.env.SCAN_API_KEY || "kernel-scan-key-change-me";

export async function POST(req: Request) {
  const authHeader = req.headers.get("x-api-key");
  if (authHeader !== API_KEY) {
    return NextResponse.json({ error: "Invalid API key" }, { status: 401 });
  }

  const body = await req.json();
  const { user_id, drivers } = body;

  if (!user_id || !drivers || !Array.isArray(drivers)) {
    return NextResponse.json(
      { error: "user_id and drivers[] required" },
      { status: 400 }
    );
  }

  const insert = db.prepare(
    `INSERT INTO tasks (user_id, driver_name, driver_hash, status, ioctl_count, ioctl_data, vuln_data, profile_data)
     VALUES (?, ?, ?, 'researching', ?, ?, ?, ?)`
  );

  const created: number[] = [];

  const insertMany = db.transaction(() => {
    for (const drv of drivers) {
      const result = insert.run(
        user_id,
        drv.filename || drv.target,
        drv.driver_hash || null,
        drv.ioctls?.length || 0,
        drv.ioctls ? JSON.stringify(drv.ioctls) : null,
        drv.vulnerabilities ? JSON.stringify(drv.vulnerabilities) : null,
        drv.profile ? JSON.stringify(drv.profile) : null
      );
      created.push(result.lastInsertRowid as number);
    }
  });

  insertMany();

  return NextResponse.json(
    { ok: true, created: created.length, task_ids: created },
    { status: 201 }
  );
}
