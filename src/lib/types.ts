export type TaskStatus =
  | "researching"
  | "exploit_dev"
  | "exploit_works"
  | "lpe"
  | "reporting"
  | "done";

export const STATUS_LABELS: Record<TaskStatus, string> = {
  researching: "Researching",
  exploit_dev: "Exploit Dev",
  exploit_works: "Exploit Works",
  lpe: "LPE",
  reporting: "Reporting",
  done: "Done",
};

export const STATUS_COLORS: Record<TaskStatus, string> = {
  researching: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  exploit_dev: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  exploit_works: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  lpe: "bg-red-500/20 text-red-400 border-red-500/30",
  reporting: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  done: "bg-green-500/20 text-green-400 border-green-500/30",
};

export interface Task {
  id: number;
  user_id: number;
  username?: string;
  driver_name: string;
  driver_hash: string | null;
  status: TaskStatus;
  ioctl_count: number;
  ioctl_data: string | null;
  vuln_data: string | null;
  profile_data: string | null;
  notes: string | null;
  cve_id: string | null;
  ai_analysis: string | null;
  created_at: string;
  updated_at: string;
}
