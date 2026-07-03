"use client";

import { create } from "zustand";
import type { CurrentUser, Role } from "@/lib/types";
import { useAuthStore } from "@/store/auth-store";

/**
 * 当前用户态（兼容层）。
 *
 * 架构变更后，真实身份来源是 auth-store（cookie session）。
 * 本 store 保留 `currentUser` 接口供现有组件使用，
 * 但不再持久化到 localStorage，也不再支持本地 switchRole。
 *
 * 切换身份 = 退出当前账号 + 用另一账号登录（在"我的"板块操作）。
 * 本 store 的数据由 AuthGate 在登录后同步注入。
 */

interface UserState {
  currentUser: CurrentUser;
  /** 内部同步用（AuthGate 调用） */
  _setFromAccount: (acc: {
    id: string;
    displayName: string;
    role: Role;
  }) => void;
  /** 退出时重置 */
  _reset: () => void;
}

const FALLBACK: CurrentUser = {
  id: "guest",
  name: "访客",
  role: "younger",
};

export const useUserStore = create<UserState>((set) => ({
  currentUser: FALLBACK,
  _setFromAccount: (acc) =>
    set({
      currentUser: { id: acc.id, name: acc.displayName, role: acc.role },
    }),
  _reset: () => set({ currentUser: FALLBACK }),
}));

/** 兼容旧代码的 switchRole —— 现已废弃，切换走登录流程。
 *  保留导出避免编译错误，调用时打 warn。 */
export const _deprecatedSwitchRole = (role: Role) => {
  console.warn(
    "[study-island] switchRole 已废弃，请用退出+登录切换身份。",
    role,
  );
};

// 标注 useAuthStore 已使用（避免某些 lint 误报）
void useAuthStore;
