// 任务与专注会话类型 —— 供 API 与前端共享

export type CreatorRole = "sister" | "younger";

/** 任务记录 */
export interface Task {
  id: string;
  title: string;
  subject: string | null;
  estimatedPomodoros: number;
  completedPomodoros: number;
  done: boolean;
  completedAt: string | null;
  createdBy: CreatorRole;
  /** "YYYY-MM-DD" */
  taskDate: string;
  createdAt: string;
  updatedAt: string;
}

/** 专注/休息会话记录 */
export interface FocusSession {
  id: string;
  role: CreatorRole;
  taskId: string | null;
  durationMinutes: number;
  /** "focus" | "break" */
  type: string;
  completedAt: string;
}

/** 今日概览聚合数据 */
export interface TodayOverviewData {
  pendingTaskCount: number;
  completedTaskCount: number;
  focusMinutes: number;
  /** 今日最新心情（无则 null） */
  mood: { mood: string; label: string; emoji: string } | null;
}
