"use client";

import { create } from "zustand";

/**
 * 顶部导航 tab 状态。
 *
 * 受"只能使用 / 单路由"约束，所有功能板块均作为 `/` 下的 section
 * 通过客户端状态切换，底部 nav 点击即切换 section。
 */
export type NavTab = "home" | "mistakes" | "chat";

interface NavState {
  activeTab: NavTab;
  setTab: (tab: NavTab) => void;
}

export const useNavStore = create<NavState>((set) => ({
  activeTab: "home",
  setTab: (tab) => set({ activeTab: tab }),
}));
