"use client";

import { useMemo } from "react";
import { ChevronLeft, ChevronRight, CalendarDays } from "lucide-react";
import { addDays, format, isToday, isFuture } from "date-fns";
import { zhCN } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/glass-card";
import { cn } from "@/lib/utils";

/**
 * 每日留言 —— 日期切换条。
 *
 * - 左：前一天（始终可用，可回看往日留言）
 * - 中：日期展示（"今天 · 7月3日 周五" / "7月3日 周五"）+ "今天"按钮（已在今天时禁用）
 * - 右：后一天（今天是边界，不能给未来留言 → 今天或未来均禁用）
 *
 * 用 date-fns 处理日期，避免本地时区错乱。
 * 切换日期由父级 NoteSection 维护 currentDate，本组件纯展示 + onChange。
 */

interface NoteDateNavProps {
  /** 当前查看的日期 */
  currentDate: Date;
  /** 切换到新日期 */
  onChange: (next: Date) => void;
}

export function NoteDateNav({ currentDate, onChange }: NoteDateNavProps) {
  const viewingToday = isToday(currentDate);
  const viewingFutureOrToday = viewingToday || isFuture(currentDate);

  const dateLabel = useMemo(() => {
    const base = format(currentDate, "M月d日 EEEE", { locale: zhCN });
    return viewingToday ? `今天 · ${base}` : base;
  }, [currentDate, viewingToday]);

  return (
    <GlassCard pad="sm" className="bg-cream/20">
      <div className="flex items-center justify-between gap-2 sm:gap-3">
        {/* 前一天 */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onChange(addDays(currentDate, -1))}
          aria-label="前一天"
          className="size-9 rounded-full text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="h-5 w-5" />
        </Button>

        {/* 中间：日期 + 今天按钮 */}
        <div className="flex min-w-0 flex-1 flex-col items-center gap-1 sm:flex-row sm:justify-center sm:gap-3">
          <div className="flex items-center gap-1.5">
            <CalendarDays
              className="h-4 w-4 shrink-0 text-leaf"
              aria-hidden
            />
            <span
              className={cn(
                "truncate text-sm font-medium text-foreground",
                "font-num tabular-nums",
              )}
            >
              {dateLabel}
            </span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            disabled={viewingToday}
            onClick={() => onChange(new Date())}
            className="h-7 rounded-full px-2.5 text-xs text-muted-foreground"
            aria-label="回到今天"
          >
            回到今天
          </Button>
        </div>

        {/* 后一天 —— 不能给未来留言，今天/未来禁用 */}
        <Button
          variant="ghost"
          size="icon"
          disabled={viewingFutureOrToday}
          onClick={() => onChange(addDays(currentDate, 1))}
          aria-label="后一天"
          className="size-9 rounded-full text-muted-foreground hover:text-foreground disabled:opacity-40"
        >
          <ChevronRight className="h-5 w-5" />
        </Button>
      </div>
    </GlassCard>
  );
}
