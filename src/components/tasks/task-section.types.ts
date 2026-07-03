/**
 * 今日任务 section 内部共享类型与常量。
 *
 * 仅在 src/components/tasks/* 内部使用，不对外暴露。
 * 对外共享类型走 src/lib/task-types.ts。
 */

export type { Task, CreatorRole } from "@/lib/task-types";

/** 科目下拉可选项（顺序固定，便于检索）。 */
export const SUBJECTS = [
  "数学",
  "语文",
  "英语",
  "物理",
  "化学",
  "生物",
  "历史",
  "地理",
  "政治",
  "其他",
] as const;

export type SubjectName = (typeof SUBJECTS)[number];

/** 预计番茄数可选项。 */
export const POMODORO_OPTIONS = [1, 2, 3, 4, 5, 6] as const;

/** Composer 向 section 提交的载荷。subject 为 "none" 表示不选科目。 */
export interface TaskComposerPayload {
  title: string;
  subject: SubjectName | "none";
  estimatedPomodoros: number;
}

/** TaskItem 的事件回调集合，避免 props 过长。 */
export interface TaskItemHandlers {
  /** 切换完成状态。done=true 表示标记完成。 */
  onToggle: (id: string, done: boolean) => void | Promise<void>;
  /** 删除任务。 */
  onDelete: (id: string) => void | Promise<void>;
  /** 设为当前专注任务。 */
  onPickActive: (id: string) => void;
}

/** 今日日期串 YYYY-MM-DD（本地时区）。 */
export function todayStr(): string {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}
