// 每日留言类型 —— 供 API 与前端共享

export type CreatorRole = "sister" | "younger";

/** 每日留言记录 */
export interface DailyNote {
  id: string;
  authorRole: CreatorRole;
  content: string;
  /** 归属日期 "YYYY-MM-DD" */
  noteDate: string;
  createdAt: string;
}
