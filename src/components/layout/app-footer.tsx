"use client";

import { Home, ListChecks, Timer, MessagesSquare, BarChart3 } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * 底部粘性导航。
 *
 * 设计取舍：
 * - 移动端友好（44px 触达区域）
 * - 当前仅"首页"可用，其余入口标注"敬请期待"但不跳转
 * - 后续 Sprint 逐步开放时，只需把 available 改为 true 并接路由
 */

interface NavItem {
  key: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  available: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { key: "home", label: "首页", icon: Home, available: true },
  { key: "tasks", label: "任务", icon: ListChecks, available: false },
  { key: "pomodoro", label: "番茄", icon: Timer, available: false },
  { key: "chat", label: "聊天", icon: MessagesSquare, available: false },
  { key: "stats", label: "我的", icon: BarChart3, available: false },
];

export function AppFooter() {
  return (
    <footer
      className="
        mt-auto
        w-full border-t border-border/60
        bg-background/90 backdrop-blur-md
        pb-[env(safe-area-inset-bottom)]
      "
    >
      <nav
        aria-label="主导航"
        className="mx-auto flex max-w-5xl items-stretch justify-around px-2 sm:px-6"
      >
        {NAV_ITEMS.map((item) => (
          <NavItemButton key={item.key} item={item} />
        ))}
      </nav>
    </footer>
  );
}

function NavItemButton({ item }: { item: NavItem }) {
  const Icon = item.icon;
  const isActive = item.key === "home"; // Sprint 1 仅首页
  return (
    <button
      type="button"
      disabled={!item.available}
      aria-current={isActive ? "page" : undefined}
      aria-label={item.label}
      className={cn(
        "relative flex min-h-[44px] flex-1 flex-col items-center justify-center gap-0.5 py-2 text-xs transition-colors",
        isActive ? "text-leaf" : "text-muted-foreground",
        item.available && !isActive && "hover:text-foreground",
        !item.available && "cursor-not-allowed opacity-50",
      )}
    >
      <Icon className="h-5 w-5" />
      <span className="text-[11px] leading-none">{item.label}</span>
      {!item.available && (
        <span className="absolute right-1 top-1 rounded bg-muted px-1 py-0.5 text-[8px] leading-none text-muted-foreground">
          即将
        </span>
      )}
      {isActive && (
        <span className="absolute -top-px h-0.5 w-8 rounded-full bg-leaf" />
      )}
    </button>
  );
}
