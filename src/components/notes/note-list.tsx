"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { StickyNote } from "lucide-react";
import { format } from "date-fns";
import { zhCN } from "date-fns/locale";
import { GlassCard } from "@/components/ui/glass-card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { CreatorRole, DailyNote } from "@/lib/note-types";

/**
 * 每日留言 —— 当日留言列表。
 *
 * - GET /api/notes?date=YYYY-MM-DD，createdAt asc（早写的在前）
 * - 便签纸风格卡片：正文（宋体）+ 作者标签 + 留言时间
 * - 自己留的靠右，对方留的靠左（均便签纸风格）
 * - 姐姐留的：leaf-soft/40 浅绿；妹妹留的：cream/50 奶白
 * - 长列表 max-h-[50vh] overflow-y-auto
 * - 空态：今天"还没留言，给彼此留张小纸条吧"；往日"这天没有留言"
 * - 加载态 Skeleton；错误态条
 */

interface NoteListProps {
  /** 当前查看日期 */
  currentDate: Date;
  /** 当前查看的是否是今天（影响空态文案 + 时间显示） */
  isTodayView: boolean;
  /** 当前用户角色 */
  role: CreatorRole;
  /** 改变时重新拉取 */
  refreshKey: number;
  /** 每次拉取完成（成功/失败）后回调 */
  onLoaded?: () => void;
}

/** Date → "YYYY-MM-DD"（本地时区） */
function dateToStr(d: Date): string {
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

const CREATOR_LABEL: Record<CreatorRole, string> = {
  sister: "姐姐",
  younger: "妹妹",
};

/** 便签纸背景 —— 字面量 class，确保被 Tailwind v4 扫描 */
const STICKY_BG: Record<CreatorRole, string> = {
  sister: "bg-leaf-soft/40",
  younger: "bg-cream/50",
};

/** 今天相对时间，往日具体时间 */
function displayTime(iso: string, isTodayView: boolean): string {
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return "";
  if (isTodayView) {
    const diff = Math.max(0, Date.now() - t);
    const min = Math.floor(diff / 60000);
    if (min < 1) return "刚刚";
    if (min < 60) return `${min} 分钟前`;
    const hr = Math.floor(min / 60);
    if (hr < 24) return `${hr} 小时前`;
    return format(new Date(iso), "HH:mm", { locale: zhCN });
  }
  return format(new Date(iso), "HH:mm", { locale: zhCN });
}

export function NoteList({
  currentDate,
  isTodayView,
  role,
  refreshKey,
  onLoaded,
}: NoteListProps) {
  const [notes, setNotes] = useState<DailyNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void (async () => {
      try {
        const res = await fetch(
          `/api/notes?date=${encodeURIComponent(dateToStr(currentDate))}`,
          { cache: "no-store" },
        );
        if (!res.ok) throw new Error(`加载失败（${res.status}）`);
        const data = (await res.json()) as { notes: DailyNote[]; date: string };
        if (!cancelled) {
          setNotes(data.notes);
          setError(null);
        }
      } catch (err) {
        console.error("[notes] load list", err);
        if (!cancelled) setError("小纸条暂时打不开，稍等一下再试");
      } finally {
        if (!cancelled) setLoading(false);
        if (!cancelled) onLoaded?.();
      }
    })();
    return () => {
      cancelled = true;
    };
    // currentDate 由父级维护，每次切换会触发新 fetch；refreshKey 用于提交后强制刷新
  }, [refreshKey, currentDate, onLoaded]);

  const emptyText = isTodayView
    ? "还没留言，给彼此留张小纸条吧"
    : "这天没有留言";

  return (
    <div className="space-y-3">
      <h3 className="flex items-center gap-1.5 px-1 text-sm font-medium text-muted-foreground">
        <span>今日小纸条</span>
        <span className="font-num tabular-nums">{notes.length}</span>
        <span>张</span>
      </h3>

      {error && (
        <div
          role="alert"
          className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive"
        >
          {error}
        </div>
      )}

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full rounded-2xl" />
          ))}
        </div>
      ) : notes.length === 0 ? (
        <GlassCard pad="lg" className="bg-cream/20">
          <div className="flex flex-col items-center gap-3 py-10 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-leaf-soft/60 text-leaf">
              <StickyNote className="h-5 w-5" aria-hidden />
            </span>
            <p className="max-w-xs text-sm leading-relaxed text-muted-foreground">
              {emptyText}
            </p>
          </div>
        </GlassCard>
      ) : (
        <div className="max-h-[50vh] space-y-3 overflow-y-auto pr-1">
          {notes.map((note, idx) => {
            const mine = note.authorRole === role;
            return (
              <motion.div
                key={note.id}
                layout
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  duration: 0.25,
                  delay: Math.min(idx * 0.03, 0.2),
                }}
                className={cn(
                  "flex w-full",
                  mine ? "justify-end" : "justify-start",
                )}
              >
                <article
                  aria-label={`${CREATOR_LABEL[note.authorRole]}的留言`}
                  className={cn(
                    "relative w-full max-w-[85%] rounded-xl px-4 py-3 shadow-sm sm:max-w-[78%]",
                    "border border-white/40 dark:border-white/10",
                    STICKY_BG[note.authorRole],
                  )}
                >
                  <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-foreground/90">
                    {note.content}
                  </p>
                  <div
                    className={cn(
                      "mt-2.5 flex items-center gap-2 text-xs",
                      mine ? "justify-end" : "justify-start",
                    )}
                  >
                    <span
                      className={cn(
                        "inline-flex items-center rounded-full bg-white/50 px-2 py-0.5",
                        "font-medium text-foreground/70",
                        "dark:bg-white/10",
                      )}
                    >
                      {CREATOR_LABEL[note.authorRole]}
                    </span>
                    <span className="font-num tabular-nums text-muted-foreground">
                      {displayTime(note.createdAt, isTodayView)}
                    </span>
                  </div>
                </article>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
