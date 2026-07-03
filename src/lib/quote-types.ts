// 首页小岛留言类型 —— 供 API 与前端共享

/** 首页小岛留言记录 */
export interface HomeQuote {
  id: string;
  content: string;
  /** 作者角色：sister 姐姐 / younger 妹妹 */
  authorRole: "sister" | "younger";
  updatedAt: string;
}
