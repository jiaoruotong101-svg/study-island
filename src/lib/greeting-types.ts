// 首页顶部问候类型 —— 供 API 与前端共享

/** 首页顶部问候（大标题 + 副标题），姐姐可编辑，两人共享 */
export interface HomeGreeting {
  id: string;
  heading: string;
  subtitle: string;
  /** 作者角色：sister 姐姐 / younger 妹妹 */
  authorRole: "sister" | "younger";
  updatedAt: string;
}
