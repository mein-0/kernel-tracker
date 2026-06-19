"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Task, TaskStatus, STATUS_LABELS, STATUS_COLORS } from "@/lib/types";

const STATUSES: TaskStatus[] = [
  "researching",
  "exploit_dev",
  "exploit_works",
  "lpe",
  "reporting",
  "done",
];

export default function DashboardPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [user, setUser] = useState<{ id: number; username: string } | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [newDriver, setNewDriver] = useState("");
  const [expandedTask, setExpandedTask] = useState<number | null>(null);
  const router = useRouter();

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => {
        if (!r.ok) {
          router.push("/login");
          throw new Error("not auth");
        }
        return r.json();
      })
      .then(setUser)
      .catch(() => {});
  }, [router]);

  useEffect(() => {
    if (user) loadTasks();
  }, [user]);

  async function loadTasks() {
    const res = await fetch("/api/tasks");
    if (res.ok) setTasks(await res.json());
  }

  async function addTask() {
    if (!newDriver.trim()) return;
    await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ driver_name: newDriver }),
    });
    setNewDriver("");
    setShowAdd(false);
    loadTasks();
  }

  async function updateStatus(id: number, status: TaskStatus) {
    await fetch(`/api/tasks/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    loadTasks();
  }

  async function updateNotes(id: number, notes: string) {
    await fetch(`/api/tasks/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notes }),
    });
    loadTasks();
  }

  async function updateCve(id: number, cve_id: string) {
    await fetch(`/api/tasks/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cve_id }),
    });
    loadTasks();
  }

  async function deleteTask(id: number) {
    await fetch(`/api/tasks/${id}`, { method: "DELETE" });
    loadTasks();
  }

  function logout() {
    document.cookie = "token=; path=/; max-age=0";
    router.push("/login");
  }

  if (!user) return null;

  const myTasks = tasks.filter((t) => t.user_id === user.id);
  const teamTasks = tasks.filter((t) => t.user_id !== user.id);

  const stats = {
    total: myTasks.length,
    active: myTasks.filter((t) => t.status !== "done").length,
    cves: myTasks.filter((t) => t.cve_id).length,
  };

  return (
    <div className="flex-1 flex flex-col">
      {/* Header */}
      <header className="border-b border-zinc-800 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h1 className="text-lg font-bold text-red-500">KERNEL TRACKER</h1>
          <span className="text-zinc-600 text-sm">|</span>
          <span className="text-zinc-400 text-sm">{user.username}</span>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={() => setShowAdd(true)}
            className="bg-red-600 hover:bg-red-700 text-white px-4 py-1.5 text-xs transition-colors"
          >
            + NEW TASK
          </button>
          <button onClick={logout} className="text-zinc-500 hover:text-zinc-300 text-xs">
            LOGOUT
          </button>
        </div>
      </header>

      {/* Stats */}
      <div className="px-6 py-4 border-b border-zinc-800 flex gap-8">
        <div>
          <span className="text-zinc-500 text-xs">TOTAL</span>
          <p className="text-2xl font-bold">{stats.total}</p>
        </div>
        <div>
          <span className="text-zinc-500 text-xs">ACTIVE</span>
          <p className="text-2xl font-bold text-yellow-400">{stats.active}</p>
        </div>
        <div>
          <span className="text-zinc-500 text-xs">CVEs</span>
          <p className="text-2xl font-bold text-red-500">{stats.cves}</p>
        </div>
      </div>

      {/* Add task modal */}
      {showAdd && (
        <div className="px-6 py-3 border-b border-zinc-800 flex gap-2">
          <input
            type="text"
            placeholder="Driver name (e.g. GVCIDrv64.sys)"
            value={newDriver}
            onChange={(e) => setNewDriver(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addTask()}
            className="flex-1 bg-zinc-900 border border-zinc-700 px-3 py-2 text-sm focus:outline-none focus:border-red-500"
            autoFocus
          />
          <button onClick={addTask} className="bg-red-600 hover:bg-red-700 text-white px-4 text-xs">
            ADD
          </button>
          <button onClick={() => setShowAdd(false)} className="text-zinc-500 hover:text-zinc-300 px-2 text-xs">
            CANCEL
          </button>
        </div>
      )}

      {/* Pipeline view */}
      <div className="flex-1 overflow-auto">
        {/* My tasks */}
        <div className="px-6 py-4">
          <h2 className="text-xs text-zinc-500 mb-3 tracking-widest">MY RESEARCH</h2>
          {myTasks.length === 0 && (
            <p className="text-zinc-600 text-sm">No tasks yet. Click + NEW TASK to start.</p>
          )}
          {myTasks.map((task) => (
            <TaskRow
              key={task.id}
              task={task}
              expanded={expandedTask === task.id}
              onToggle={() => setExpandedTask(expandedTask === task.id ? null : task.id)}
              onStatusChange={(s) => updateStatus(task.id, s)}
              onNotesChange={(n) => updateNotes(task.id, n)}
              onCveChange={(c) => updateCve(task.id, c)}
              onDelete={() => deleteTask(task.id)}
              isOwner={true}
            />
          ))}
        </div>

        {/* Team tasks */}
        {teamTasks.length > 0 && (
          <div className="px-6 py-4 border-t border-zinc-800">
            <h2 className="text-xs text-zinc-500 mb-3 tracking-widest">TEAM ACTIVITY</h2>
            {teamTasks.map((task) => (
              <TaskRow
                key={task.id}
                task={task}
                expanded={expandedTask === task.id}
                onToggle={() => setExpandedTask(expandedTask === task.id ? null : task.id)}
                onStatusChange={() => {}}
                onNotesChange={() => {}}
                onCveChange={() => {}}
                onDelete={() => {}}
                isOwner={false}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function TaskRow({
  task,
  expanded,
  onToggle,
  onStatusChange,
  onNotesChange,
  onCveChange,
  onDelete,
  isOwner,
}: {
  task: Task;
  expanded: boolean;
  onToggle: () => void;
  onStatusChange: (s: TaskStatus) => void;
  onNotesChange: (n: string) => void;
  onCveChange: (c: string) => void;
  onDelete: () => void;
  isOwner: boolean;
}) {
  const [notes, setNotes] = useState(task.notes || "");
  const [cve, setCve] = useState(task.cve_id || "");

  const ioctls = task.ioctl_data ? JSON.parse(task.ioctl_data) : [];
  const vulns = task.vuln_data ? JSON.parse(task.vuln_data) : {};
  const profile = task.profile_data ? JSON.parse(task.profile_data) : {};

  return (
    <div className="border border-zinc-800 mb-2">
      {/* Main row */}
      <div
        className="flex items-center gap-4 px-4 py-3 cursor-pointer hover:bg-zinc-900/50"
        onClick={onToggle}
      >
        <span className="text-zinc-600 text-xs w-6">{expanded ? "v" : ">"}</span>
        <span className="flex-1 text-sm">{task.driver_name}</span>
        {task.username && !isOwner && (
          <span className="text-zinc-600 text-xs">@{task.username}</span>
        )}
        {task.cve_id && (
          <span className="text-red-500 text-xs font-bold">{task.cve_id}</span>
        )}
        <span className="text-zinc-500 text-xs">{task.ioctl_count} IOCTLs</span>
        <span
          className={`text-xs px-2 py-0.5 border ${STATUS_COLORS[task.status]}`}
        >
          {STATUS_LABELS[task.status]}
        </span>
      </div>

      {/* Expanded details */}
      {expanded && (
        <div className="border-t border-zinc-800 px-4 py-4 space-y-4">
          {/* Status pipeline */}
          {isOwner && (
            <div>
              <label className="text-xs text-zinc-500 mb-2 block">STATUS</label>
              <div className="flex gap-1">
                {STATUSES.map((s) => (
                  <button
                    key={s}
                    onClick={() => onStatusChange(s)}
                    className={`text-xs px-3 py-1 border transition-colors ${
                      task.status === s
                        ? STATUS_COLORS[s]
                        : "border-zinc-800 text-zinc-600 hover:text-zinc-400"
                    }`}
                  >
                    {STATUS_LABELS[s]}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Profile info */}
          {profile.purpose && (
            <div>
              <label className="text-xs text-zinc-500 mb-1 block">DRIVER PURPOSE</label>
              {profile.purpose.map((p: string, i: number) => (
                <p key={i} className="text-sm text-zinc-300">- {p}</p>
              ))}
            </div>
          )}

          {profile.risk_rating && (
            <div>
              <label className="text-xs text-zinc-500 mb-1 block">RISK</label>
              <span
                className={`text-xs px-2 py-0.5 border ${
                  profile.risk_rating.rating === "CRITICAL"
                    ? "bg-red-500/20 text-red-400 border-red-500/30"
                    : profile.risk_rating.rating === "HIGH"
                    ? "bg-orange-500/20 text-orange-400 border-orange-500/30"
                    : "bg-yellow-500/20 text-yellow-400 border-yellow-500/30"
                }`}
              >
                {profile.risk_rating.rating} (score: {profile.risk_rating.score})
              </span>
            </div>
          )}

          {/* IOCTLs */}
          {ioctls.length > 0 && (
            <div>
              <label className="text-xs text-zinc-500 mb-1 block">IOCTLs</label>
              <div className="space-y-1">
                {ioctls.map((ioctl: Record<string, string | number>, i: number) => (
                  <div key={i} className="text-xs bg-zinc-900 px-3 py-2 flex gap-4">
                    <span className="text-red-400 font-bold">{ioctl.code}</span>
                    <span className="text-zinc-400">{ioctl.method}</span>
                    <span className="text-zinc-500">conf:{ioctl.confidence}%</span>
                    <span className="text-zinc-500">{ioctl.device_type}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Vulns */}
          {vulns.driver_level && vulns.driver_level.length > 0 && (
            <div>
              <label className="text-xs text-zinc-500 mb-1 block">FINDINGS</label>
              {vulns.driver_level.map((v: Record<string, string>, i: number) => (
                <div key={i} className="text-xs mb-1">
                  <span
                    className={`${
                      v.severity === "HIGH"
                        ? "text-red-400"
                        : v.severity === "MEDIUM"
                        ? "text-yellow-400"
                        : "text-zinc-400"
                    }`}
                  >
                    [{v.severity}]
                  </span>{" "}
                  <span className="text-zinc-300">{v.title}</span>
                </div>
              ))}
            </div>
          )}

          {/* CVE */}
          {isOwner && (
            <div>
              <label className="text-xs text-zinc-500 mb-1 block">CVE ID</label>
              <input
                type="text"
                value={cve}
                onChange={(e) => setCve(e.target.value)}
                onBlur={() => onCveChange(cve)}
                placeholder="CVE-2024-XXXXX"
                className="w-64 bg-zinc-900 border border-zinc-700 px-3 py-1.5 text-xs focus:outline-none focus:border-red-500"
              />
            </div>
          )}

          {/* Notes */}
          {isOwner && (
            <div>
              <label className="text-xs text-zinc-500 mb-1 block">NOTES</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                onBlur={() => onNotesChange(notes)}
                rows={3}
                className="w-full bg-zinc-900 border border-zinc-700 px-3 py-2 text-xs focus:outline-none focus:border-red-500 resize-none"
                placeholder="Research notes..."
              />
            </div>
          )}

          {/* Delete */}
          {isOwner && (
            <button
              onClick={onDelete}
              className="text-xs text-zinc-600 hover:text-red-500 transition-colors"
            >
              DELETE TASK
            </button>
          )}
        </div>
      )}
    </div>
  );
}
