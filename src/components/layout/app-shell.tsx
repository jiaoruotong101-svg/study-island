"use client";

import { AppHeader } from "./app-header";
import { AppFooter } from "./app-footer";

/**
 * 整体布局壳。
 *
 * - min-h-screen + flex-col：保证短内容时 footer 也贴底，
 *   长内容时 footer 被自然推下（满足粘性 footer 规范）
 * - main 区域居中并限制最大宽度，留白充分
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <AppHeader />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6 sm:px-6 sm:py-8">
        {children}
      </main>
      <AppFooter />
    </div>
  );
}
