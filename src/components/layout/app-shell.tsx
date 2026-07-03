"use client";

import { AuthGate } from "@/components/auth/auth-gate";

/**
 * 整体布局壳。
 *
 * AuthGate 根据登录态决定渲染登录页还是主内容（含 header/footer）。
 * 主内容布局：header sticky top + main 居中 + footer fixed bottom。
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  return <AuthGate>{children}</AuthGate>;
}
