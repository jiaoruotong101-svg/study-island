"use client";

import { useUserStore } from "@/store/user-store";
import { useNow } from "@/hooks/use-now";

/**
 * 顶部问候栏。
 *
 * 不放任何"系统/管理"字眼，只显示：
 * - 一朵小绿叶 logo（CSS 绘制，不依赖外部资源）
 * - 根据时段切换的温柔问候
 * - 当前身份（姐姐 / 妹妹）
 */
export function AppHeader() {
  const currentUser = useUserStore((s) => s.currentUser);
  const now = useNow();

  const greeting = getGreeting(now);
  const dateLabel = now ? formatDate(now) : "";

  return (
    <header className="sticky top-0 z-40 w-full border-b border-white/40 glass-strong">
      <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4 sm:px-6">
        <div className="flex items-center gap-3">
          <LeafMark />
          <div className="flex flex-col leading-tight">
            <span className="text-base font-semibold tracking-wide text-foreground">
              学习小岛
            </span>
            <span className="hidden text-xs text-muted-foreground sm:inline">
              <span className="font-num">{dateLabel}</span>
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="hidden text-sm text-muted-foreground sm:inline">
            {greeting}，
          </span>
          <span className="rounded-full bg-leaf-soft/70 px-3 py-1 text-sm font-medium text-leaf/90">
            {currentUser.name}
          </span>
        </div>
      </div>
    </header>
  );
}

/** 顶部小绿叶 logo —— 纯 CSS，无外部依赖 */
function LeafMark() {
  return (
    <span
      aria-hidden
      className="flex h-9 w-9 items-center justify-center rounded-xl bg-leaf-soft"
    >
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M5 21c0-6 4-10 16-11 0 8-5 12-11 12-2 0-5-0.5-5-1z"
          fill="currentColor"
          className="text-leaf"
        />
        <path
          d="M5 21c2-4 5-7 10-9"
          stroke="oklch(0.97 0.01 90)"
          strokeWidth="1.2"
          strokeLinecap="round"
        />
      </svg>
    </span>
  );
}

function getGreeting(date: Date | null): string {
  if (!date) return "你好";
  const h = date.getHours();
  if (h < 6) return "夜深啦";
  if (h < 11) return "早上好";
  if (h < 14) return "中午好";
  if (h < 18) return "下午好";
  if (h < 22) return "晚上好";
  return "夜深啦";
}

function formatDate(date: Date): string {
  const weekdays = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];
  const m = date.getMonth() + 1;
  const d = date.getDate();
  const w = weekdays[date.getDay()];
  return `${m}月${d}日 · ${w}`;
}
