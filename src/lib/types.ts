// 全局类型定义 —— 学习小岛

/** 用户角色：姐姐（管理员）/ 妹妹（普通用户） */
export type Role = "sister" | "younger";

/** 当前用户信息 */
export interface CurrentUser {
  id: string;
  name: string;
  role: Role;
  avatar?: string;
}

/** 今日概览的聚合数据 */
export interface TodayOverview {
  /** 待完成任务数 */
  pendingTaskCount: number;
  /** 已完成任务数 */
  completedTaskCount: number;
  /** 今日已专注分钟数 */
  focusMinutes: number;
  /** 当前心情文字 */
  mood?: string;
}

/** 首页快捷入口的元信息 */
export interface QuickEntry {
  key: string;
  title: string;
  description: string;
  /** lucide 图标名 */
  icon: string;
  /** 进入哪个 Sprint 后的模块 */
  target: string;
  /** 该功能是否已上线（Sprint 1 仅首页上线） */
  available: boolean;
}
