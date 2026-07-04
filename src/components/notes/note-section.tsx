"use client";

import { useCallback, useState } from "react";
import { StickyNote, RefreshCw } from "lucide-react";
import { isToday } from "date-fns";
import { Button } from "@/components/ui/button";
import { useUserStore } from "@/store/user-store";
import type { CreatorRole } from "@/lib/note-types";
import { NoteDateNav } from "./note-date-nav";
import { NoteComposer } from "./note-composer";
import { NoteList } from "./note-list";

/**
 * 每日留言板块 —— section 容器。
 *
 * 与实时聊天的区别（决定 UI 风格）：
 *   - 慢沟通，像给彼此留一张小纸条；便签纸风格；按日期归档，可翻看往日
 *
 * 编排：
 *   - header（GlassCard 外）：标题 + StickyNote 图标 + 视角化副标题 + 刷新按钮
 *   - NoteDateNav：日期切换（前一天 / 今天 / 后一天）
 *   - NoteComposer：仅当 isToday(currentDate) 时渲染（往日只读，符合"每日"语义）
 *   - NoteList：当日留言列表（早写的在前）
 *
 * 状态：
 *   - currentDate：Date 对象，默认今天
 *   - refreshKey：提交成功 / 点刷新 → +1 → NoteList 重新拉取
 */

export function NoteSection() {
  const role = useUserStore((s) => s.currentUser.role) as CreatorRole;
  const [currentDate, setCurrentDate] = useState<Date>(() => new Date());
  const [refreshKey, setRefreshKey] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  const todayView = isToday(currentDate);

  const handleChangeDate = useCallback((next: Date) => {
    setCurrentDate(next);
  }, []);

  const handleSubmitted = useCallback(() => {
    setRefreshKey((k) => k + 1);
  }, []);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    setRefreshKey((k) => k + 1);
  }, []);

  const handleLoaded = useCallback(() => {
    setRefreshing(false);
  }, []);

  const subtitle =
    role === "sister"
      ? "给妹妹留句话吧~"
      : "给姐姐留张小纸条~";

  return (
    <section aria-label="每日留言" className="space-y-5 sm:space-y-6">
      {/* 标题区 —— GlassCard 外 */}
      <header className="flex items-end justify-between gap-3 px-1">
        <div className="min-w-0">
          <h2 className="flex items-center gap-2 text-2xl font-semibold tracking-tight text-foreground">
            <StickyNote className="h-6 w-6 text-leaf" aria-hidden />
            每日留言
          </h2>
          <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
            {subtitle}
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleRefresh}
          disabled={refreshing}
          className="shrink-0 text-muted-foreground"
          aria-label="刷新当日留言"
        >
          <RefreshCw
            className={refreshing ? "h-3.5 w-3.5 animate-spin" : "h-3.5 w-3.5"}
          />
          刷新
        </Button>
      </header>

      {/* 日期切换 */}
      <NoteDateNav currentDate={currentDate} onChange={handleChangeDate} />

      {/* 录入区 —— 仅今天可写 */}
      {todayView && <NoteComposer role={role} onSubmitted={handleSubmitted} />}

      {/* 当日留言列表 */}
      <NoteList
        currentDate={currentDate}
        isTodayView={todayView}
        role={role}
        refreshKey={refreshKey}
        onLoaded={handleLoaded}
      />
    </section>
  );
}
