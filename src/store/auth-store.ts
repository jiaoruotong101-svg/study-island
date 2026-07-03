"use client";

import { create } from "zustand";

/**
 * 当前登录账号态。
 *
 * 数据来源：/api/me（cookie session 驱动），不再用 localStorage 持久化身份。
 * 客户端通过 fetchMe() 主动拉取；登录/注册/退出后调用刷新。
 */

export interface SessionAccount {
  id: string;
  username: string;
  displayName: string;
  role: "sister" | "younger";
  pairId: string;
}

export interface PairInfo {
  code: string;
  partner: {
    id: string;
    displayName: string;
    role: string;
    username: string;
  } | null;
}

interface AuthState {
  account: SessionAccount | null;
  pair: PairInfo | null;
  loading: boolean;
  /** 拉取当前登录态 */
  fetchMe: () => Promise<void>;
  /** 退出登录 */
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  account: null,
  pair: null,
  loading: true,
  fetchMe: async () => {
    try {
      const res = await fetch("/api/auth/me", { cache: "no-store" });
      if (!res.ok) {
        set({ account: null, pair: null, loading: false });
        return;
      }
      const data = (await res.json()) as {
        account: SessionAccount | null;
        pair: PairInfo | null;
      };
      set({ account: data.account, pair: data.pair, loading: false });
    } catch {
      set({ account: null, pair: null, loading: false });
    }
  },
  logout: async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      set({ account: null, pair: null });
    }
  },
}));
