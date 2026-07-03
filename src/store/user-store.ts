"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { CurrentUser, Role } from "@/lib/types";

/**
 * 当前用户态。
 *
 * 设计取舍：产品仅两名用户（姐姐 / 妹妹），
 * Sprint 1 暂用本地切换，不引入完整鉴权。
 * 后续 Sprint 接入正式账号体系时再替换实现，
 * 对外 API（useUserStore）保持不变。
 */

interface UserState {
  currentUser: CurrentUser;
  /** 切换当前身份 */
  switchRole: (role: Role) => void;
}

const ROLE_PROFILE: Record<Role, CurrentUser> = {
  sister: {
    id: "sister-001",
    name: "姐姐",
    role: "sister",
  },
  younger: {
    id: "younger-001",
    name: "妹妹",
    role: "younger",
  },
};

export const useUserStore = create<UserState>()(
  persist(
    (set) => ({
      // 默认进入妹妹视角，因为她是最主要的使用者
      currentUser: ROLE_PROFILE.younger,
      switchRole: (role) =>
        set(() => ({
          currentUser: ROLE_PROFILE[role],
        })),
    }),
    {
      name: "study-island-user",
      // 仅持久化当前身份
      partialize: (state) => ({ currentUser: state.currentUser }),
    },
  ),
);
