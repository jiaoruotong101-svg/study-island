"use client";

import {
  ListChecks,
  BookX,
  MessagesSquare,
  StickyNote,
  Heart,
  BarChart3,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import type { QuickEntry } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useNavStore, type NavTab } from "@/store/nav-store";

/**
 * 功能入口网格。
 *
 * 已上线入口（任务/错题/聊天）点击即切到底部 nav 对应 section；
 * 其余（每日留言/心情/统计/姐姐后台）标注"即将"，后续 Sprint 接入。
 */
interface Entry extends QuickEntry {
  icon: LucideIcon;
  /** 上线时点击切到的 nav tab */
  navTab?: NavTab;
}

const ENTRIES: Entry[] = [
  {
    key: "tasks",
    title: "今日任务",
    description: "今天想完成的小目标 + 番茄钟",
    icon: "ListChecks",
    target: "tasks",
    available: true,
    navTab: "tasks",
  },
  {
    key: "mistakes",
    title: "错题记录",
    description: "拍下做错的题，慢慢理",
    icon: "BookX",
    target: "mistakes",
    available: true,
    navTab: "mistakes",
  },
  {
    key: "chat",
    title: "实时聊天",
    description: "和姐姐说说话",
    icon: "MessagesSquare",
    target: "chat",
    available: true,
    navTab: "chat",
  },
  {
    key: "notes",
    title: "每日留言",
    description: "给彼此留一张小纸条",
    icon: "StickyNote",
    target: "notes",
    available: false,
  },
  {
    key: "mood",
    title: "心情记录",
    description: "今天的心情颜色",
    icon: "Heart",
    target: "mood",
    available: true,
    navTab: "mood",
  },
  {
    key: "stats",
    title: "学习统计",
    description: "看看这段时间的坚持",
    icon: "BarChart3",
    target: "stats",
    available: false,
  },
  {
    key: "admin",
    title: "姐姐后台",
    description: "了解妹妹的学习节奏",
    icon: "Sparkles",
    target: "admin",
    available: false,
  },
];

const ICON_MAP: Record<string, LucideIcon> = {
  ListChecks,
  BookX,
  MessagesSquare,
  StickyNote,
  Heart,
  BarChart3,
  Sparkles,
};

export function QuickEntryGrid() {
  const setTab = useNavStore((s) => s.setTab);

  return (
    <section aria-label="功能入口" className="space-y-3">
      <h2 className="px-1 text-sm font-medium text-muted-foreground">
        小岛上的角落
      </h2>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
        {ENTRIES.map((entry) => {
          const Icon = ICON_MAP[entry.icon] ?? ListChecks;
          const handleClick = () => {
            if (entry.available && entry.navTab) setTab(entry.navTab);
          };
          return (
            <button
              key={entry.key}
              type="button"
              disabled={!entry.available}
              onClick={handleClick}
              className={cn(
                "group flex flex-col gap-3 rounded-2xl p-4 text-left transition-all glass",
                entry.available
                  ? "hover:-translate-y-0.5 hover:border-leaf/40"
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
                {entry.available && (
                  <span className="rounded-full bg-leaf/15 px-2 py-0.5 text-[10px] text-leaf">
                    已上线
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
