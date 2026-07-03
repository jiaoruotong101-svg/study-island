"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Clock, User } from "lucide-react";
import { GlassCard } from "@/components/ui/glass-card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import {
  type CreatorRole,
  type MoodEntry,
  getMoodOption,
} from "@/lib/mood-types";

/**
 * 今日心情时间线。
 *
 * - GET /api/moods?date=today，最新在前（API 已 desc）
 * - 每条：emoji + label + 相对时间 + 备注（如有）+ 记录者标签
 * - 空态视角化；加载 Skeleton；错误态条
 * - 长列表 max-h-[40vh] overflow-y-auto（自定义滚动条全局已就绪）
 * - refreshKey 变化时重新拉取（cancelled-flag 模式）
 */

interface MoodTimelineProps {
  role: CreatorRole;
  /** 改变时重新拉取 */
  refreshKey: number;
  /** 每次拉取完成（成功/失败）后回调，供父级关闭刷新按钮态 */
  onLoaded?: () => void;
}

const CREATOR_LABEL: Record<CreatorRole, string> = {
  sister: "姐姐",
  younger: "妹妹",
};

function todayStr(): string {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

/** 相对时间 —— 中文，不依赖外部库 */
function relativeTime(iso: string): string {
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return "";
  const diff = Math.max(0, Date.now() - t);
  const min = Math.floor(diff / 60000);
  if (min < 1) return "刚刚";
  if (min < 60) return `${min} 分钟前`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} 小时前`;
  const day = Math.floor(hr / 24);
  return `${day} 天前`;
}

export function MoodTimeline({ role, refreshKey, onLoaded }: MoodTimelineProps) {
  const [entries, setEntries] = useState<MoodEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void (async () => {
      try {
        const res = await fetch(
          `/api/moods?date=${encodeURIComponent(todayStr())}`,
          { cache: "no-store" },
        );
        if (!res.ok) throw new Error(`加载失败（${res.status}）`);
        const data = (await res.json()) as { entries: MoodEntry[] };
        if (!cancelled) {
          setEntries(data.entries);
          setError(null);
        }
      } catch (err) {
        console.error("[mood] load timeline", err);
        if (!cancelled) setError("心情暂时打不开，稍等一下再试");
      } finally {
        if (!cancelled) setLoading(false);
        if (!cancelled) onLoaded?.();
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [refreshKey, onLoaded]);

  const emptyText =
    role === "sister"
      ? "妹妹还没记心情，也许今天她很平静"
      : "今天还没记心情，选一个吧";

  return (
    <div className="space-y-3">
      <h3 className="px-1 text-sm font-medium text-muted-foreground">
        今日心情 <span className="font-num tabular-nums">{entries.length}</span> 条
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
            <Skeleton key={i} className="h-16 w-full rounded-2xl" />
          ))}
        </div>
      ) : entries.length === 0 ? (
        <GlassCard pad="lg" className="bg-cream/30">
          <div className="flex flex-col items-center gap-3 py-8 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-leaf-soft text-2xl">
              🌿
            </span>
            <p className="max-w-xs text-sm leading-relaxed text-muted-foreground">
              {emptyText}
            </p>
          </div>
        </GlassCard>
      ) : (
        <GlassCard pad="none" className="overflow-hidden">
          <ul className="max-h-[40vh] divide-y divide-border/50 overflow-y-auto">
            {entries.map((entry, idx) => {
              const opt = getMoodOption(entry.mood);
              const emoji = opt?.emoji ?? "🍃";
              const label = opt?.label ?? entry.mood;
              const textColor = opt?.textColor ?? "text-muted-foreground";
              return (
                <motion.li
                  key={entry.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    duration: 0.25,
                    delay: Math.min(idx * 0.03, 0.2),
                  }}
                  className="px-4 py-3 sm:px-5 sm:py-4"
                >
                  <div className="flex items-start gap-3">
                    <span
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-background/70 text-xl"
                      aria-hidden
                    >
                      {emoji}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <span
                          className={cn(
                            "text-sm font-medium",
                            textColor,
                          )}
                        >
                          {label}
                        </span>
                        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                          <User className="h-3 w-3" aria-hidden />
                          {CREATOR_LABEL[entry.role]}
                        </span>
                        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" aria-hidden />
                          <span className="font-num tabular-nums">
                            {relativeTime(entry.createdAt)}
                          </span>
                        </span>
                      </div>
                      {entry.note && (
                        <p className="mt-1.5 whitespace-pre-wrap break-words text-sm leading-relaxed text-foreground/80">
                          {entry.note}
                        </p>
                      )}
                    </div>
                  </div>
                </motion.li>
              );
            })}
          </ul>
        </GlassCard>
      )}
    </div>
  );
}
