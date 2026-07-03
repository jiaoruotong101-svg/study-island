"use client";

import { Home, BookX, ListChecks, MessagesSquare, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { useNavStore, type NavTab } from "@/store/nav-store";

/**
 * 底部导航栏（冻结常驻）。
 *
 * 受"只能使用 / 单路由"约束，点击切换客户端 section 而非路由。
 * 5 个 tab 全部可用：首页 / 错题 / 任务 / 聊天 / 我的。
 *
 * 布局：fixed bottom-0 始终浮在视口底部，无论内容多长都能看到可切换。
 * 配套：AppShell 的 main 已加 padding-bottom 留出空间，避免内容被遮挡。
 */

interface NavItem {
  key: NavTab;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const NAV_ITEMS: NavItem[] = [
  { key: "home", label: "首页", icon: Home },
  { key: "mistakes", label: "错题", icon: BookX },
  { key: "tasks", label: "任务", icon: ListChecks },
  { key: "chat", label: "聊天", icon: MessagesSquare },
  { key: "me", label: "我的", icon: User },
];

export function AppFooter() {
  const activeTab = useNavStore((s) => s.activeTab);
  const setTab = useNavStore((s) => s.setTab);

  return (
    <footer
      className="
        fixed bottom-0 left-0 z-40 w-full
        border-t border-white/40 glass-strong
        pb-[env(safe-area-inset-bottom)]
      "
    >
      <nav
        aria-label="主导航"
        className="mx-auto flex max-w-5xl items-stretch justify-around px-2 sm:px-6"
      >
        {NAV_ITEMS.map((item) => {
          const isActive = item.key === activeTab;
          const Icon = item.icon;
          return (
            <button
              key={item.key}
              type="button"
              onClick={() => setTab(item.key)}
              aria-current={isActive ? "page" : undefined}
              aria-label={item.label}
              className={cn(
                "relative flex min-h-[44px] flex-1 flex-col items-center justify-center gap-0.5 py-2 text-xs transition-colors",
                isActive ? "text-leaf" : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Icon className="h-5 w-5" />
              <span className="text-[11px] leading-none">{item.label}</span>
              {isActive && (
                <span className="absolute -top-px h-0.5 w-8 rounded-full bg-leaf" />
              )}
            </button>
          );
        })}
      </nav>
    </footer>
  );
}
