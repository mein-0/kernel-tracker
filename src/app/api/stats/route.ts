import { NextResponse } from "next/server";
import db from "@/lib/db";
import { getUser } from "@/lib/auth";

export async function GET() {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const [tasksResult, usersResult, activityResult] = await Promise.all([
    db.execute(
      `SELECT tasks.*, users.username FROM tasks JOIN users ON tasks.user_id = users.id`
    ),
    db.execute(`SELECT id, username, created_at FROM users`),
    db.execute(
      `SELECT * FROM activity_log ORDER BY created_at DESC LIMIT 100`
    ),
  ]);

  const tasks = tasksResult.rows;
  const users = usersResult.rows;
  const activities = activityResult.rows;

  const totalTasks = tasks.length;
  const totalCves = tasks.filter((t) => t.cve_id).length;
  const totalCritical = tasks.filter((t) => {
    if (!t.profile_data) return false;
    const p = JSON.parse(t.profile_data as string);
    return p.risk_rating?.rating === "CRITICAL";
  }).length;
  const totalIoctls = tasks.reduce((sum, t) => sum + (t.ioctl_count as number || 0), 0);

  const statusBreakdown: Record<string, number> = {};
  for (const t of tasks) {
    const s = t.status as string;
    statusBreakdown[s] = (statusBreakdown[s] || 0) + 1;
  }

  const riskBreakdown: Record<string, number> = { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0 };
  for (const t of tasks) {
    if (t.profile_data) {
      const p = JSON.parse(t.profile_data as string);
      const r = p.risk_rating?.rating;
      if (r && r in riskBreakdown) riskBreakdown[r]++;
    }
  }

  const perUser = users.map((u) => {
    const userTasks = tasks.filter((t) => t.user_id === u.id);
    return {
      username: u.username,
      total: userTasks.length,
      active: userTasks.filter((t) => t.status !== "done").length,
      done: userTasks.filter((t) => t.status === "done").length,
      cves: userTasks.filter((t) => t.cve_id).length,
      critical: userTasks.filter((t) => {
        if (!t.profile_data) return false;
        const p = JSON.parse(t.profile_data as string);
        return p.risk_rating?.rating === "CRITICAL";
      }).length,
    };
  });

  const weeklyActivity: Record<string, number> = {};
  for (const a of activities) {
    const day = (a.created_at as string).substring(0, 10);
    weeklyActivity[day] = (weeklyActivity[day] || 0) + 1;
  }

  const topDrivers = tasks
    .filter((t) => t.profile_data)
    .map((t) => {
      const p = JSON.parse(t.profile_data as string);
      return {
        driver_name: t.driver_name,
        username: t.username,
        risk: p.risk_rating?.rating || "UNKNOWN",
        score: p.risk_rating?.score || 0,
        ioctl_count: t.ioctl_count,
        status: t.status,
        cve_id: t.cve_id,
      };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 10);

  return NextResponse.json({
    overview: { totalTasks, totalCves, totalCritical, totalIoctls, totalUsers: users.length },
    statusBreakdown,
    riskBreakdown,
    perUser,
    weeklyActivity,
    topDrivers,
    recentActivity: activities.slice(0, 20),
  });
}
