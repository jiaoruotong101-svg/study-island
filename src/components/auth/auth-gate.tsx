"use client";

import { useEffect } from "react";
import { useAuthStore } from "@/store/auth-store";
import { useUserStore } from "@/store/user-store";
import { AuthScreen } from "@/components/auth/auth-screen";
import { AppHeader } from "@/components/layout/app-header";
import { AppFooter } from "@/components/layout/app-footer";

/**
 * 鉴权门。
 *
 * - 挂载时拉取 /api/me 判断登录态
 * - 未登录：渲染 AuthScreen（登录/注册）
 * - 已登录：同步 user-store（兼容层）+ 渲染子内容（含 header/footer）
 * - loading：渲染温和加载态
 */
export function AuthGate({ children }: { children: React.ReactNode }) {
  const account = useAuthStore((s) => s.account);
  const loading = useAuthStore((s) => s.loading);
  const fetchMe = useAuthStore((s) => s.fetchMe);
  const _setFromAccount = useUserStore((s) => s._setFromAccount);
  const _reset = useUserStore((s) => s._reset);

  useEffect(() => {
    void fetchMe();
  }, [fetchMe]);

  // 同步 auth → user-store（兼容层）
  useEffect(() => {
    if (account) {
      _setFromAccount({
        id: account.id,
        displayName: account.displayName,
        role: account.role,
      });
    } else {
      _reset();
    }
  }, [account, _setFromAccount, _reset]);

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-leaf/30 border-t-leaf" />
        <p className="text-sm text-muted-foreground">小岛正在醒来…</p>
      </div>
    );
  }

  if (!account) {
    return <AuthScreen />;
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <AppHeader />
      <main
        className="
          mx-auto w-full max-w-5xl flex-1
          px-4 py-6 sm:px-6 sm:py-8
          pb-[calc(5.5rem+env(safe-area-inset-bottom))]
        "
      >
        {children}
      </main>
      <AppFooter />
    </div>
  );
}
