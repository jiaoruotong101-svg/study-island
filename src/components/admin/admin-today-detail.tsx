"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ListTodo, Heart, Clock } from "lucide-react";
import { GlassCard } from "@/components/ui/glass-card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { Task } from "@/lib/task-types";
import {
  type CreatorRole,
  type MoodEntry,
  getMoodOption,
} from "@/lib/mood-types";

/**
 * 姐姐后台 —— 今日详情（任务 + 心情）。
 *
 * 编排：
 *   - 两子区块（移动端堆叠，桌面端双列）
 *   - 今日任务：GET /api/tasks?date=today，最多 5 条，超出显示"还有 N 条"
 *     每条：勾选状态 + 标题 + 科目 Badge + 番茄进度
 *     空态："妹妹今天还没列任务，也许她想先歇会儿"
 *   - 今日心情：GET /api/moods?date=today，最多 3 条
 *     每条：emoji + label + 相对时间 + 备注（如有）
 *     空态："妹妹今天还没记心情"
 *
 * 状态：
 *   - Promise.allSettled 并行两请求，统一 loading + 单次 onLoaded
 *   - cancelled-flag 模式满足 lint + 卸载安全
 *
 * 设计哲学：了解而非监督，文案陪伴不催促。
 */

interface AdminTodayDetailProps {
  refreshKey: number;
  onLoaded?: () => void;
}

/** 今日日期串 YYYY-MM-DD（本地时区） */
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
  if (day === 1) {
    const dt = new Date(iso);
    return `昨天 ${dt.getMonth() + 1}月${dt.getDate()}日`;
  }
  return `${day} 天前`;
}

const CREATOR_LABEL: Record<CreatorRole, string> = {
  sister: "姐姐",
  younger: "妹妹",
};

const MAX_TASKS = 5;
const MAX_MOODS = 3;

export function AdminTodayDetail({ refreshKey, onLoaded }: AdminTodayDetailProps) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [entries, setEntries] = useState<MoodEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void (async () => {
      try {
        const date = todayStr();
        const [tasksRes, moodsRes] = await Promise.allSettled([
          fetch(`/api/tasks?date=${encodeURIComponent(date)}`, {
            cache: "no-store",
          }).then((r) => {
            if (!r.ok) throw new Error(`tasks ${r.status}`);
            return r.json() as Promise<{ tasks: Task[] }>;
          }),
          fetch(`/api/moods?date=${encodeURIComponent(date)}`, {
            cache: "no-store",
          }).then((r) => {
            if (!r.ok) throw new Error(`moods ${r.status}`);
            return r.json() as Promise<{ entries: MoodEntry[] }>;
          }),
        ]);
        if (cancelled) return;
        if (tasksRes.status === "fulfilled") setTasks(tasksRes.value.tasks);
        if (moodsRes.status === "fulfilled") setEntries(moodsRes.value.entries);
      } catch (err) {
        console.error("[admin-today-detail] load", err);
      } finally {
        if (!cancelled) setLoading(false);
        if (!cancelled) onLoaded?.();
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [refreshKey, onLoaded]);

  const shownTasks = tasks.slice(0, MAX_TASKS);
  const hiddenTaskCount = Math.max(0, tasks.length - MAX_TASKS);
  const shownMoods = entries.slice(0, MAX_MOODS);

  return (
    <div className="grid grid-cols-1 gap-5 sm:gap-6 lg:grid-cols-2">
      {/* 今日任务 */}
      <GlassCard pad="md">
        <header className="mb-3 flex items-center justify-between gap-2">
          <h3 className="flex items-center gap-1.5 text-sm font-medium text-foreground">
            <ListTodo className="h-4 w-4 text-leaf" aria-hidden />
            今日任务
          </h3>
          <span className="text-xs text-muted-foreground">
            <span className="font-num tabular-nums">{tasks.length}</span> 条
          </span>
        </header>

        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full rounded-xl" />
            ))}
          </div>
        ) : tasks.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-6 text-center">
            <span
              className="flex h-10 w-10 items-center justify-center rounded-full bg-leaf-soft/50 text-xl"
              aria-hidden
            >
              🌿
            </span>
            <p className="max-w-xs text-sm leading-relaxed text-muted-foreground">
              妹妹今天还没列任务，也许她想先歇会儿
            </p>
          </div>
        ) : (
          <ul className="space-y-1.5">
            {shownTasks.map((task, idx) => (
              <motion.li
                key={task.id}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  duration: 0.25,
                  delay: Math.min(idx * 0.03, 0.2),
                }}
                className="flex items-start gap-2.5 rounded-xl px-2 py-2 hover:bg-muted/30"
              >
                <span
                  className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center text-sm"
                  aria-hidden
                >
                  {task.done ? "✅" : "○"}
                </span>
                <div className="min-w-0 flex-1">
                  <p
                    className={cn(
                      "text-sm leading-relaxed break-words",
                      task.done
                        ? "text-muted-foreground line-through"
                        : "text-foreground",
                    )}
                  >
                    {task.title}
                  </p>
                  <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                    {task.subject && (
                      <Badge
                        variant="outline"
                        className="bg-leaf-soft/40 border-leaf/30 text-foreground"
                      >
                        {task.subject}
                      </Badge>
                    )}
                    <span className="inline-flex items-center gap-0.5">
                      <span aria-hidden className="text-xs leading-none">
                        🍅
                      </span>
                      <span className="font-num">{task.completedPomodoros}</span>
                      <span className="text-muted-foreground/60">/</span>
                      <span className="font-num">{task.estimatedPomodoros}</span>
                    </span>
                    <span className="text-muted-foreground/60" aria-hidden>
                      ·
                    </span>
                    <span>{CREATOR_LABEL[task.createdBy]} 列</span>
                  </div>
                </div>
              </motion.li>
            ))}
            {hiddenTaskCount > 0 && (
              <li className="px-2 pt-1 text-xs text-muted-foreground">
                还有 <span className="font-num">{hiddenTaskCount}</span> 条
              </li>
            )}
          </ul>
        )}
      </GlassCard>

      {/* 今日心情 */}
      <GlassCard pad="md">
        <header className="mb-3 flex items-center justify-between gap-2">
          <h3 className="flex items-center gap-1.5 text-sm font-medium text-foreground">
            <Heart className="h-4 w-4 text-leaf" aria-hidden />
            今日心情
          </h3>
          <span className="text-xs text-muted-foreground">
            <span className="font-num tabular-nums">{entries.length}</span> 条
          </span>
        </header>

        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-14 w-full rounded-xl" />
            ))}
          </div>
        ) : shownMoods.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-6 text-center">
            <span
              className="flex h-10 w-10 items-center justify-center rounded-full bg-leaf-soft/50 text-xl"
              aria-hidden
            >
              🌿
            </span>
            <p className="max-w-xs text-sm leading-relaxed text-muted-foreground">
              妹妹今天还没记心情
            </p>
          </div>
        ) : (
          <ul className="space-y-1.5">
            {shownMoods.map((entry, idx) => {
              const opt = getMoodOption(entry.mood);
              const emoji = opt?.emoji ?? "🍃";
              const label = opt?.label ?? entry.mood;
              const textColor = opt?.textColor ?? "text-muted-foreground";
              return (
                <motion.li
                  key={entry.id}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    duration: 0.25,
                    delay: Math.min(idx * 0.03, 0.2),
                  }}
                  className="flex items-start gap-2.5 rounded-xl px-2 py-2 hover:bg-muted/30"
                >
                  <span
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-background/70 text-lg"
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
                        <Clock className="h-3 w-3" aria-hidden />
                        <span className="font-num tabular-nums">
                          {relativeTime(entry.createdAt)}
                        </span>
                      </span>
                      <span className="text-xs text-muted-foreground">
                        · {CREATOR_LABEL[entry.role]}
                      </span>
                    </div>
                    {entry.note && (
                      <p className="mt-1 line-clamp-2 break-words text-sm leading-relaxed text-foreground/80">
                        {entry.note}
                      </p>
                    )}
                  </div>
                </motion.li>
              );
            })}
          </ul>
        )}
      </GlassCard>
    </div>
  );
}
