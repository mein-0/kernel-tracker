"use client";

import { useEffect, useState, useCallback } from "react";
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

interface Notification {
  id: number;
  type: string;
  message: string;
  task_id: number | null;
  from_user: string | null;
  is_read: number;
  created_at: string;
}

interface OnlineUser {
  user_id: number;
  username: string;
  last_seen: string;
}

interface IOCTL {
  code: string;
  method: string;
  confidence: number;
  device_type: string;
  function_code?: string;
  access?: string;
  description?: string;
  vulnerabilities?: { severity: string; title: string; detail: string }[];
}

export default function DashboardPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [user, setUser] = useState<{ id: number; username: string } | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [newDriver, setNewDriver] = useState("");
  const [expandedTask, setExpandedTask] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("my-tasks");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<TaskStatus | "all">("all");
  const [filterRisk, setFilterRisk] = useState<string>("all");
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showNotifs, setShowNotifs] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
  const [selectedIoctl, setSelectedIoctl] = useState<{ taskId: number; idx: number } | null>(null);
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

  const loadTasks = useCallback(async () => {
    const res = await fetch("/api/tasks");
    if (res.ok) setTasks(await res.json());
  }, []);

  const loadNotifications = useCallback(async () => {
    const res = await fetch("/api/notifications");
    if (res.ok) setNotifications(await res.json());
  }, []);

  const loadPresence = useCallback(async () => {
    const res = await fetch("/api/presence");
    if (res.ok) setOnlineUsers(await res.json());
  }, []);

  useEffect(() => {
    if (user) {
      loadTasks();
      loadNotifications();
      loadPresence();
      const interval = setInterval(() => {
        loadNotifications();
        loadPresence();
      }, 30000);
      return () => clearInterval(interval);
    }
  }, [user, loadTasks, loadNotifications, loadPresence]);

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

  async function markAllRead() {
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ read_all: true }),
    });
    loadNotifications();
  }

  function exportData(format: string, scope: string) {
    window.open(`/api/export?format=${format}&scope=${scope}`, "_blank");
  }

  function logout() {
    document.cookie = "token=; path=/; max-age=0";
    router.push("/login");
  }

  if (!user) return null;

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  function filterTasks(list: Task[]) {
    let filtered = list;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (t) =>
          t.driver_name.toLowerCase().includes(q) ||
          (t.cve_id && t.cve_id.toLowerCase().includes(q)) ||
          (t.username && t.username.toLowerCase().includes(q))
      );
    }
    if (filterStatus !== "all") {
      filtered = filtered.filter((t) => t.status === filterStatus);
    }
    if (filterRisk !== "all") {
      filtered = filtered.filter((t) => {
        const profile = t.profile_data ? JSON.parse(t.profile_data) : {};
        return profile.risk_rating?.rating === filterRisk;
      });
    }
    return filtered;
  }

  const myTasks = filterTasks(tasks.filter((t) => t.user_id === user.id));
  const allTasks = filterTasks(tasks);
  const teamMembers = [...new Set(tasks.filter((t) => t.user_id !== user.id).map((t) => t.username))];

  const myAll = tasks.filter((t) => t.user_id === user.id);
  const myStats = {
    total: myAll.length,
    active: myAll.filter((t) => t.status !== "done").length,
    cves: myAll.filter((t) => t.cve_id).length,
    done: myAll.filter((t) => t.status === "done").length,
  };

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
            <span className="ml-auto text-zinc-600">{myAll.length}</span>
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
            <span className="ml-auto text-zinc-600">{tasks.length}</span>
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

        {/* Online users */}
        <div className="px-4 py-3 border-t border-zinc-800">
          <p className="text-xs text-zinc-600 mb-2">ONLINE</p>
          {onlineUsers.length === 0 && (
            <p className="text-xs text-zinc-700">No one online</p>
          )}
          {onlineUsers.map((u) => (
            <div key={u.user_id} className="flex items-center gap-2 mb-1.5">
              <span className="w-1.5 h-1.5 bg-green-500 rounded-full" />
              <span className={`text-xs ${u.user_id === user.id ? "text-red-400" : "text-zinc-400"}`}>
                @{u.username}
              </span>
            </div>
          ))}
        </div>

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
        {/* Top bar with notifications */}
        <div className="px-6 py-2 border-b border-zinc-800 flex items-center justify-end gap-3">
          <div className="relative">
            <button
              onClick={() => setShowNotifs(!showNotifs)}
              className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors relative px-2 py-1"
            >
              NOTIFICATIONS
              {unreadCount > 0 && (
                <span className="ml-1 bg-red-600 text-white text-xs px-1.5 py-0.5 min-w-[18px] text-center">
                  {unreadCount}
                </span>
              )}
            </button>

            {showNotifs && (
              <div className="absolute right-0 top-8 w-96 bg-zinc-900 border border-zinc-700 z-50 max-h-80 overflow-auto">
                <div className="px-3 py-2 border-b border-zinc-800 flex items-center justify-between">
                  <span className="text-xs text-zinc-400">NOTIFICATIONS</span>
                  {unreadCount > 0 && (
                    <button
                      onClick={markAllRead}
                      className="text-xs text-red-500 hover:text-red-400"
                    >
                      MARK ALL READ
                    </button>
                  )}
                </div>
                {notifications.length === 0 && (
                  <p className="px-3 py-4 text-xs text-zinc-600 text-center">No notifications</p>
                )}
                {notifications.map((n) => (
                  <div
                    key={n.id}
                    className={`px-3 py-2.5 border-b border-zinc-800/50 ${
                      !n.is_read ? "bg-zinc-800/30" : ""
                    }`}
                  >
                    <p className="text-xs text-zinc-300">{n.message}</p>
                    <p className="text-xs text-zinc-600 mt-1">
                      {new Date(n.created_at + "Z").toLocaleString()}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Search and filter bar */}
        {(activeTab === "my-tasks" || activeTab === "team") && (
          <div className="px-6 py-3 border-b border-zinc-800 flex items-center gap-3">
            <input
              type="text"
              placeholder="Search driver, CVE, user..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-zinc-900 border border-zinc-700 px-3 py-1.5 text-xs w-64 focus:outline-none focus:border-red-500"
            />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as TaskStatus | "all")}
              className="bg-zinc-900 border border-zinc-700 px-2 py-1.5 text-xs text-zinc-400 focus:outline-none focus:border-red-500"
            >
              <option value="all">All Status</option>
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {STATUS_LABELS[s]}
                </option>
              ))}
            </select>
            <select
              value={filterRisk}
              onChange={(e) => setFilterRisk(e.target.value)}
              className="bg-zinc-900 border border-zinc-700 px-2 py-1.5 text-xs text-zinc-400 focus:outline-none focus:border-red-500"
            >
              <option value="all">All Risk</option>
              <option value="CRITICAL">Critical</option>
              <option value="HIGH">High</option>
              <option value="MEDIUM">Medium</option>
              <option value="LOW">Low</option>
            </select>

            {(searchQuery || filterStatus !== "all" || filterRisk !== "all") && (
              <button
                onClick={() => {
                  setSearchQuery("");
                  setFilterStatus("all");
                  setFilterRisk("all");
                }}
                className="text-xs text-zinc-600 hover:text-zinc-400"
              >
                CLEAR
              </button>
            )}

            <div className="ml-auto flex gap-2">
              <button
                onClick={() => exportData("json", activeTab === "my-tasks" ? "my" : "all")}
                className="text-xs text-zinc-600 hover:text-zinc-300 border border-zinc-800 px-3 py-1.5"
              >
                JSON
              </button>
              <button
                onClick={() => exportData("csv", activeTab === "my-tasks" ? "my" : "all")}
                className="text-xs text-zinc-600 hover:text-zinc-300 border border-zinc-800 px-3 py-1.5"
              >
                CSV
              </button>
            </div>
          </div>
        )}

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

            <div className="px-6 py-3 border-b border-zinc-800 flex gap-6">
              {STATUSES.map((s) => {
                const count = myAll.filter((t) => t.status === s).length;
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
                <p className="text-zinc-600 text-sm">
                  {searchQuery || filterStatus !== "all" || filterRisk !== "all"
                    ? "No tasks match your filters."
                    : "No tasks yet. Click + NEW TASK to start."}
                </p>
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
                  selectedIoctl={selectedIoctl}
                  onSelectIoctl={setSelectedIoctl}
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
                {allTasks.length} tasks / {teamMembers.length + 1} members
              </p>
            </header>

            <div className="flex-1 overflow-auto px-6 py-4">
              {allTasks.length === 0 && (
                <p className="text-zinc-600 text-sm">No tasks match your filters.</p>
              )}
              {allTasks.map((task) => (
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
                  selectedIoctl={selectedIoctl}
                  onSelectIoctl={setSelectedIoctl}
                />
              ))}
            </div>
          </>
        )}

        {/* Profile tab */}
        {activeTab === "profile" && (
          <>
            <header className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between">
              <h2 className="text-sm font-bold">PROFILE</h2>
              <div className="flex gap-2">
                <button
                  onClick={() => exportData("json", "my")}
                  className="text-xs text-zinc-600 hover:text-zinc-300 border border-zinc-800 px-3 py-1.5"
                >
                  EXPORT JSON
                </button>
                <button
                  onClick={() => exportData("csv", "my")}
                  className="text-xs text-zinc-600 hover:text-zinc-300 border border-zinc-800 px-3 py-1.5"
                >
                  EXPORT CSV
                </button>
              </div>
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
                  const count = myAll.filter((t) => t.status === s).length;
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

              {myAll.filter((t) => t.cve_id).length > 0 && (
                <div className="border border-zinc-800 p-5">
                  <p className="text-xs text-zinc-500 mb-3">MY CVEs</p>
                  {myAll
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

      {/* IOCTL Detail Modal */}
      {selectedIoctl && (
        <IoctlDetailModal
          task={tasks.find((t) => t.id === selectedIoctl.taskId)!}
          ioctlIdx={selectedIoctl.idx}
          onClose={() => setSelectedIoctl(null)}
        />
      )}
    </div>
  );
}

function IoctlDetailModal({
  task,
  ioctlIdx,
  onClose,
}: {
  task: Task;
  ioctlIdx: number;
  onClose: () => void;
}) {
  const ioctls: IOCTL[] = task.ioctl_data ? JSON.parse(task.ioctl_data) : [];
  const vulns = task.vuln_data ? JSON.parse(task.vuln_data) : {};
  const ioctl = ioctls[ioctlIdx];
  if (!ioctl) return null;

  const ioctlVulns = vulns.ioctl_level?.filter(
    (v: { ioctl_code: string }) => v.ioctl_code === ioctl.code
  ) || [];

  const code = parseInt(ioctl.code, 16);
  const deviceType = (code >> 16) & 0xffff;
  const access = (code >> 14) & 0x3;
  const functionCode = (code >> 2) & 0xfff;
  const transferType = code & 0x3;

  const accessLabels = ["FILE_ANY_ACCESS", "FILE_READ_ACCESS", "FILE_WRITE_ACCESS", "FILE_READ_WRITE_ACCESS"];
  const methodLabels = ["METHOD_BUFFERED", "METHOD_IN_DIRECT", "METHOD_OUT_DIRECT", "METHOD_NEITHER"];

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center" onClick={onClose}>
      <div
        className="bg-zinc-900 border border-zinc-700 w-[600px] max-h-[80vh] overflow-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-4 border-b border-zinc-800 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-red-400">{ioctl.code}</h3>
            <p className="text-xs text-zinc-500 mt-0.5">{task.driver_name}</p>
          </div>
          <button onClick={onClose} className="text-zinc-600 hover:text-zinc-300 text-sm px-2">
            X
          </button>
        </div>

        <div className="px-5 py-4 space-y-4">
          <div>
            <label className="text-xs text-zinc-500 mb-2 block">CTL_CODE BREAKDOWN</label>
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-zinc-800/50 px-3 py-2">
                <p className="text-xs text-zinc-600">Device Type</p>
                <p className="text-sm text-zinc-300">0x{deviceType.toString(16).toUpperCase()}</p>
              </div>
              <div className="bg-zinc-800/50 px-3 py-2">
                <p className="text-xs text-zinc-600">Function Code</p>
                <p className="text-sm text-zinc-300">0x{functionCode.toString(16).toUpperCase()}</p>
              </div>
              <div className="bg-zinc-800/50 px-3 py-2">
                <p className="text-xs text-zinc-600">Access</p>
                <p className="text-sm text-zinc-300">{accessLabels[access] || `0x${access.toString(16)}`}</p>
              </div>
              <div className="bg-zinc-800/50 px-3 py-2">
                <p className="text-xs text-zinc-600">Transfer Method</p>
                <p className="text-sm text-zinc-300">{methodLabels[transferType] || `0x${transferType.toString(16)}`}</p>
              </div>
            </div>
          </div>

          <div>
            <label className="text-xs text-zinc-500 mb-1 block">I/O METHOD</label>
            <div className="bg-zinc-800/50 px-3 py-2">
              <p className="text-sm text-zinc-300">{ioctl.method}</p>
              <p className="text-xs text-zinc-500 mt-1">
                {transferType === 0
                  ? "System copies input/output via SystemBuffer. Safest method — kernel gets its own copy."
                  : transferType === 1
                  ? "Input via SystemBuffer, output via MDL. Kernel maps output buffer directly."
                  : transferType === 2
                  ? "Input via SystemBuffer, output via MDL (out). Kernel maps output buffer directly."
                  : "Raw user pointers passed to driver. Most dangerous — driver must validate and probe."}
              </p>
            </div>
          </div>

          <div>
            <label className="text-xs text-zinc-500 mb-1 block">CONFIDENCE</label>
            <div className="flex items-center gap-3">
              <div className="flex-1 bg-zinc-800 h-2">
                <div
                  className={`h-full ${
                    ioctl.confidence >= 80
                      ? "bg-green-500"
                      : ioctl.confidence >= 50
                      ? "bg-yellow-500"
                      : "bg-red-500"
                  }`}
                  style={{ width: `${ioctl.confidence}%` }}
                />
              </div>
              <span className="text-xs text-zinc-400">{ioctl.confidence}%</span>
            </div>
          </div>

          {ioctl.description && (
            <div>
              <label className="text-xs text-zinc-500 mb-1 block">DESCRIPTION</label>
              <p className="text-xs text-zinc-300">{ioctl.description}</p>
            </div>
          )}

          {ioctlVulns.length > 0 && (
            <div>
              <label className="text-xs text-zinc-500 mb-2 block">VULNERABILITIES</label>
              {ioctlVulns.map((v: { severity: string; title: string; detail: string }, i: number) => (
                <div key={i} className="border border-zinc-800 mb-2 px-3 py-2">
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className={`text-xs px-1.5 py-0.5 border ${
                        v.severity === "HIGH" || v.severity === "CRITICAL"
                          ? "bg-red-500/20 text-red-400 border-red-500/30"
                          : v.severity === "MEDIUM"
                          ? "bg-yellow-500/20 text-yellow-400 border-yellow-500/30"
                          : "bg-zinc-500/20 text-zinc-400 border-zinc-500/30"
                      }`}
                    >
                      {v.severity}
                    </span>
                    <span className="text-xs text-zinc-300">{v.title}</span>
                  </div>
                  {v.detail && <p className="text-xs text-zinc-500">{v.detail}</p>}
                </div>
              ))}
            </div>
          )}

          {ioctlVulns.length === 0 && (
            <div>
              <label className="text-xs text-zinc-500 mb-1 block">VULNERABILITIES</label>
              <p className="text-xs text-zinc-600">No known vulnerabilities detected for this IOCTL.</p>
            </div>
          )}

          <div>
            <label className="text-xs text-zinc-500 mb-1 block">ATTACK SURFACE</label>
            <div className="bg-zinc-800/50 px-3 py-2 text-xs text-zinc-400 space-y-1">
              {transferType === 3 && (
                <p className="text-red-400">- METHOD_NEITHER: Driver receives raw user-mode pointers. Check for ProbeForRead/ProbeForWrite calls.</p>
              )}
              {functionCode >= 0x800 && (
                <p>- Vendor-defined function code (0x{functionCode.toString(16).toUpperCase()} &gt;= 0x800)</p>
              )}
              {deviceType >= 0x8000 && (
                <p>- Vendor-defined device type (0x{deviceType.toString(16).toUpperCase()} &gt;= 0x8000)</p>
              )}
              {access === 0 && (
                <p>- FILE_ANY_ACCESS: No access restriction — any handle can send this IOCTL</p>
              )}
              <p>- Handler address reachable via DeviceIoControl() from user mode</p>
            </div>
          </div>
        </div>
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
  showOwner,
  selectedIoctl,
  onSelectIoctl,
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
  selectedIoctl: { taskId: number; idx: number } | null;
  onSelectIoctl: (v: { taskId: number; idx: number } | null) => void;
}) {
  const [notes, setNotes] = useState(task.notes || "");
  const [cve, setCve] = useState(task.cve_id || "");

  const ioctls: IOCTL[] = task.ioctl_data ? JSON.parse(task.ioctl_data) : [];
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
          <span
            className={`text-xs px-2 py-0.5 border border-zinc-700 ${
              isOwner ? "text-red-400" : "text-zinc-500"
            }`}
          >
            @{task.username}
          </span>
        )}
        {task.cve_id && (
          <span className="text-red-500 text-xs font-bold">{task.cve_id}</span>
        )}
        {profile.risk_rating && (
          <span
            className={`text-xs px-1.5 py-0.5 border ${
              profile.risk_rating.rating === "CRITICAL"
                ? "bg-red-500/20 text-red-400 border-red-500/30"
                : profile.risk_rating.rating === "HIGH"
                ? "bg-orange-500/20 text-orange-400 border-orange-500/30"
                : profile.risk_rating.rating === "MEDIUM"
                ? "bg-yellow-500/20 text-yellow-400 border-yellow-500/30"
                : "bg-zinc-500/20 text-zinc-400 border-zinc-500/30"
            }`}
          >
            {profile.risk_rating.rating}
          </span>
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
                <p key={i} className="text-sm text-zinc-300">
                  - {p}
                </p>
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
              <label className="text-xs text-zinc-500 mb-1 block">
                IOCTLs — click for details
              </label>
              <div className="space-y-1">
                {ioctls.map((ioctl, i) => {
                  const hasVulns = vulns.ioctl_level?.some(
                    (v: { ioctl_code: string }) => v.ioctl_code === ioctl.code
                  );
                  return (
                    <div
                      key={i}
                      className="text-xs bg-zinc-900 px-3 py-2 flex gap-4 items-center cursor-pointer hover:bg-zinc-800 transition-colors"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectIoctl({ taskId: task.id, idx: i });
                      }}
                    >
                      <span className="text-red-400 font-bold">{ioctl.code}</span>
                      <span className="text-zinc-400">{ioctl.method}</span>
                      <span className="text-zinc-500">conf:{ioctl.confidence}%</span>
                      {hasVulns && (
                        <span className="text-red-500 text-xs border border-red-500/30 px-1.5 py-0.5 bg-red-500/10">
                          VULN
                        </span>
                      )}
                      <span className="ml-auto text-zinc-700">{">"}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {vulns.driver_level && vulns.driver_level.length > 0 && (
            <div>
              <label className="text-xs text-zinc-500 mb-1 block">DRIVER-LEVEL FINDINGS</label>
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
