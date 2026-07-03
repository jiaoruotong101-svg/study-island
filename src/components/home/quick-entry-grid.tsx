"use client";

import {
  ListChecks,
  Timer,
  MessagesSquare,
  StickyNote,
  Heart,
  BarChart3,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import type { QuickEntry } from "@/lib/types";
import { cn } from "@/lib/utils";

/**
 * 功能入口网格。
 *
 * Sprint 1 仅展示入口（尚未上线），点击给出"敬请期待"反馈。
 * 后续 Sprint 逐步上线时，把 available 改为 true 并接对应路由。
 */
const ENTRIES: (QuickEntry & { icon: LucideIcon })[] = [
  {
    key: "tasks",
    title: "今日任务",
    description: "今天想完成的小目标",
    icon: "ListChecks",
    target: "/tasks",
    available: false,
  },
  {
    key: "pomodoro",
    title: "番茄钟",
    description: "专注 25 分钟，休息 5 分钟",
    icon: "Timer",
    target: "/pomodoro",
    available: false,
  },
  {
    key: "chat",
    title: "实时聊天",
    description: "和姐姐说说话",
    icon: "MessagesSquare",
    target: "/chat",
    available: false,
  },
  {
    key: "notes",
    title: "每日留言",
    description: "给彼此留一张小纸条",
    icon: "StickyNote",
    target: "/notes",
    available: false,
  },
  {
    key: "mood",
    title: "心情记录",
    description: "今天的心情颜色",
    icon: "Heart",
    target: "/mood",
    available: false,
  },
  {
    key: "stats",
    title: "学习统计",
    description: "看看这段时间的坚持",
    icon: "BarChart3",
    target: "/stats",
    available: false,
  },
  {
    key: "admin",
    title: "姐姐后台",
    description: "了解妹妹的学习节奏",
    icon: "Sparkles",
    target: "/admin",
    available: false,
  },
];

const ICON_MAP: Record<string, LucideIcon> = {
  ListChecks,
  Timer,
  MessagesSquare,
  StickyNote,
  Heart,
  BarChart3,
  Sparkles,
};

export function QuickEntryGrid() {
  return (
    <section aria-label="功能入口" className="space-y-3">
      <h2 className="px-1 text-sm font-medium text-muted-foreground">
        小岛上的角落
      </h2>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
        {ENTRIES.map((entry) => {
          const Icon = ICON_MAP[entry.icon] ?? ListChecks;
          return (
            <button
              key={entry.key}
              type="button"
              disabled={!entry.available}
              className={cn(
                "group flex flex-col gap-3 rounded-2xl border border-border/70 bg-card p-4 text-left transition-all",
                entry.available
                  ? "hover:-translate-y-0.5 hover:border-leaf/40 hover:shadow-sm"
                  : "cursor-not-allowed opacity-70",
              )}
            >
              <div className="flex items-center justify-between">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-leaf-soft">
                  <Icon className="h-4.5 w-4.5 text-leaf" />
                </span>
                {!entry.available && (
                  <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">
                    即将开放
                  </span>
                )}
              </div>
              <div>
                <div className="text-sm font-semibold text-foreground">
                  {entry.title}
                </div>
                <div className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                  {entry.description}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}
