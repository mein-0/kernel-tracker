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

type Tab = "my-tasks" | "team" | "profile";

export default function DashboardPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [user, setUser] = useState<{ id: number; username: string } | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [newDriver, setNewDriver] = useState("");
  const [expandedTask, setExpandedTask] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("my-tasks");
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

  const myStats = {
    total: myTasks.length,
    active: myTasks.filter((t) => t.status !== "done").length,
    cves: myTasks.filter((t) => t.cve_id).length,
    done: myTasks.filter((t) => t.status === "done").length,
  };

  const teamMembers = [...new Set(teamTasks.map((t) => t.username))];

  return (
    <div className="flex-1 flex">
      {/* Sidebar */}
      <aside className="w-56 border-r border-zinc-800 flex flex-col">
        <div className="px-4 py-5 border-b border-zinc-800">
          <h1 className="text-sm font-bold text-red-500 tracking-wider">KERNEL TRACKER</h1>
        </div>

        <nav className="flex-1 py-3">
          <button
            onClick={() => setActiveTab("my-tasks")}
            className={`w-full text-left px-4 py-2.5 text-xs flex items-center gap-3 transition-colors ${
              activeTab === "my-tasks"
                ? "bg-zinc-800/50 text-white border-l-2 border-red-500"
                : "text-zinc-500 hover:text-zinc-300 border-l-2 border-transparent"
            }`}
          >
            {">"} MY TASKS
            <span className="ml-auto text-zinc-600">{myTasks.length}</span>
          </button>

          <button
            onClick={() => setActiveTab("team")}
            className={`w-full text-left px-4 py-2.5 text-xs flex items-center gap-3 transition-colors ${
              activeTab === "team"
                ? "bg-zinc-800/50 text-white border-l-2 border-red-500"
                : "text-zinc-500 hover:text-zinc-300 border-l-2 border-transparent"
            }`}
          >
            {">"} TEAM BOARD
            <span className="ml-auto text-zinc-600">{teamTasks.length}</span>
          </button>

          <button
            onClick={() => setActiveTab("profile")}
            className={`w-full text-left px-4 py-2.5 text-xs flex items-center gap-3 transition-colors ${
              activeTab === "profile"
                ? "bg-zinc-800/50 text-white border-l-2 border-red-500"
                : "text-zinc-500 hover:text-zinc-300 border-l-2 border-transparent"
            }`}
          >
            {">"} PROFILE
          </button>
        </nav>

        <div className="px-4 py-4 border-t border-zinc-800">
          <p className="text-xs text-zinc-500 mb-2">@{user.username}</p>
          <button
            onClick={logout}
            className="text-xs text-zinc-600 hover:text-red-500 transition-colors"
          >
            LOGOUT
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* My Tasks tab */}
        {activeTab === "my-tasks" && (
          <>
            <header className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold">MY RESEARCH</h2>
                <p className="text-xs text-zinc-600 mt-1">
                  {myStats.active} active / {myStats.done} done / {myStats.cves} CVEs
                </p>
              </div>
              <button
                onClick={() => setShowAdd(true)}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-1.5 text-xs transition-colors"
              >
                + NEW TASK
              </button>
            </header>

            {/* Stats bar */}
            <div className="px-6 py-3 border-b border-zinc-800 flex gap-6">
              {STATUSES.map((s) => {
                const count = myTasks.filter((t) => t.status === s).length;
                return (
                  <div key={s} className="flex items-center gap-2">
                    <span className={`text-xs px-1.5 py-0.5 border ${STATUS_COLORS[s]}`}>
                      {count}
                    </span>
                    <span className="text-xs text-zinc-600">{STATUS_LABELS[s]}</span>
                  </div>
                );
              })}
            </div>

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

            <div className="flex-1 overflow-auto px-6 py-4">
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
                  showOwner={false}
                />
              ))}
            </div>
          </>
        )}

        {/* Team Board tab */}
        {activeTab === "team" && (
          <>
            <header className="px-6 py-4 border-b border-zinc-800">
              <h2 className="text-sm font-bold">TEAM BOARD</h2>
              <p className="text-xs text-zinc-600 mt-1">
                {teamTasks.length} tasks / {teamMembers.length} members
              </p>
            </header>

            <div className="flex-1 overflow-auto px-6 py-4">
              {tasks.length === 0 && (
                <p className="text-zinc-600 text-sm">No team activity yet.</p>
              )}
              {tasks.map((task) => (
                <TaskRow
                  key={task.id}
                  task={task}
                  expanded={expandedTask === task.id}
                  onToggle={() => setExpandedTask(expandedTask === task.id ? null : task.id)}
                  onStatusChange={
                    task.user_id === user.id ? (s) => updateStatus(task.id, s) : () => {}
                  }
                  onNotesChange={
                    task.user_id === user.id ? (n) => updateNotes(task.id, n) : () => {}
                  }
                  onCveChange={
                    task.user_id === user.id ? (c) => updateCve(task.id, c) : () => {}
                  }
                  onDelete={
                    task.user_id === user.id ? () => deleteTask(task.id) : () => {}
                  }
                  isOwner={task.user_id === user.id}
                  showOwner={true}
                />
              ))}
            </div>
          </>
        )}

        {/* Profile tab */}
        {activeTab === "profile" && (
          <>
            <header className="px-6 py-4 border-b border-zinc-800">
              <h2 className="text-sm font-bold">PROFILE</h2>
            </header>

            <div className="flex-1 overflow-auto px-6 py-6 space-y-6">
              <div className="border border-zinc-800 p-5">
                <p className="text-xs text-zinc-500 mb-1">USERNAME</p>
                <p className="text-lg font-bold text-red-500">@{user.username}</p>
              </div>

              <div className="grid grid-cols-4 gap-3">
                <div className="border border-zinc-800 p-4 text-center">
                  <p className="text-2xl font-bold">{myStats.total}</p>
                  <p className="text-xs text-zinc-500 mt-1">TOTAL</p>
                </div>
                <div className="border border-zinc-800 p-4 text-center">
                  <p className="text-2xl font-bold text-yellow-400">{myStats.active}</p>
                  <p className="text-xs text-zinc-500 mt-1">ACTIVE</p>
                </div>
                <div className="border border-zinc-800 p-4 text-center">
                  <p className="text-2xl font-bold text-green-400">{myStats.done}</p>
                  <p className="text-xs text-zinc-500 mt-1">DONE</p>
                </div>
                <div className="border border-zinc-800 p-4 text-center">
                  <p className="text-2xl font-bold text-red-500">{myStats.cves}</p>
                  <p className="text-xs text-zinc-500 mt-1">CVEs</p>
                </div>
              </div>

              <div className="border border-zinc-800 p-5">
                <p className="text-xs text-zinc-500 mb-3">STATUS BREAKDOWN</p>
                {STATUSES.map((s) => {
                  const count = myTasks.filter((t) => t.status === s).length;
                  const pct = myStats.total > 0 ? (count / myStats.total) * 100 : 0;
                  return (
                    <div key={s} className="flex items-center gap-3 mb-2">
                      <span className="text-xs text-zinc-500 w-28">{STATUS_LABELS[s]}</span>
                      <div className="flex-1 bg-zinc-900 h-2">
                        <div
                          className={`h-full ${
                            s === "done" ? "bg-green-500" : s === "lpe" ? "bg-red-500" : "bg-zinc-600"
                          }`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="text-xs text-zinc-600 w-6 text-right">{count}</span>
                    </div>
                  );
                })}
              </div>

              {myTasks.filter((t) => t.cve_id).length > 0 && (
                <div className="border border-zinc-800 p-5">
                  <p className="text-xs text-zinc-500 mb-3">MY CVEs</p>
                  {myTasks
                    .filter((t) => t.cve_id)
                    .map((t) => (
                      <div key={t.id} className="flex items-center gap-3 mb-2">
                        <span className="text-xs text-red-500 font-bold">{t.cve_id}</span>
                        <span className="text-xs text-zinc-400">{t.driver_name}</span>
                        <span className={`text-xs px-1.5 py-0.5 border ${STATUS_COLORS[t.status]}`}>
                          {STATUS_LABELS[t.status]}
                        </span>
                      </div>
                    ))}
                </div>
              )}
            </div>
          </>
        )}
      </main>
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
  showOwner,
}: {
  task: Task;
  expanded: boolean;
  onToggle: () => void;
  onStatusChange: (s: TaskStatus) => void;
  onNotesChange: (n: string) => void;
  onCveChange: (c: string) => void;
  onDelete: () => void;
  isOwner: boolean;
  showOwner: boolean;
}) {
  const [notes, setNotes] = useState(task.notes || "");
  const [cve, setCve] = useState(task.cve_id || "");

  const ioctls = task.ioctl_data ? JSON.parse(task.ioctl_data) : [];
  const vulns = task.vuln_data ? JSON.parse(task.vuln_data) : {};
  const profile = task.profile_data ? JSON.parse(task.profile_data) : {};

  return (
    <div className="border border-zinc-800 mb-2">
      <div
        className="flex items-center gap-4 px-4 py-3 cursor-pointer hover:bg-zinc-900/50"
        onClick={onToggle}
      >
        <span className="text-zinc-600 text-xs w-4">{expanded ? "v" : ">"}</span>
        <span className="flex-1 text-sm">{task.driver_name}</span>
        {showOwner && task.username && (
          <span className={`text-xs px-2 py-0.5 border border-zinc-700 ${
            isOwner ? "text-red-400" : "text-zinc-500"
          }`}>
            @{task.username}
          </span>
        )}
        {task.cve_id && (
          <span className="text-red-500 text-xs font-bold">{task.cve_id}</span>
        )}
        <span className="text-zinc-500 text-xs">{task.ioctl_count} IOCTLs</span>
        <span className={`text-xs px-2 py-0.5 border ${STATUS_COLORS[task.status]}`}>
          {STATUS_LABELS[task.status]}
        </span>
      </div>

      {expanded && (
        <div className="border-t border-zinc-800 px-4 py-4 space-y-4">
          {isOwner && (
            <div>
              <label className="text-xs text-zinc-500 mb-2 block">STATUS</label>
              <div className="flex gap-1 flex-wrap">
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

          {!isOwner && showOwner && (
            <div>
              <label className="text-xs text-zinc-500 mb-1 block">ASSIGNED TO</label>
              <p className="text-sm text-zinc-300">@{task.username}</p>
            </div>
          )}

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
