"use client";

import { AppHeader } from "./app-header";
import { AppFooter } from "./app-footer";

/**
 * 整体布局壳。
 *
 * - header sticky top-0 常驻顶部
 * - main 区域居中、限制最大宽度、留白充分；
 *   底部 padding 留出 fixed footer 的空间，避免内容被遮挡
 * - footer fixed bottom-0 冻结常驻，无论内容多长都可见可切换
 */
export function AppShell({ children }: { children: React.ReactNode }) {
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
