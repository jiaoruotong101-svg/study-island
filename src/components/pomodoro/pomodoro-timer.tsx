"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";
import { motion } from "framer-motion";
import { Pause, Play, RotateCcw, SkipForward, Timer } from "lucide-react";
import { GlassCard } from "@/components/ui/glass-card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useUserStore } from "@/store/user-store";
import {
  LONG_BREAK_EVERY,
  usePomodoroStore,
} from "@/store/pomodoro-store";
import { PomodoroSettings } from "@/components/pomodoro/pomodoro-settings";
import type { CreatorRole } from "@/lib/task-types";

/**
 * 番茄钟（任务 section 下半部分）。
 *
 * 契约：
 *   - activeTask：当前关联的专注任务（null 表示自由专注）。
 *   - onPomodoroComplete(taskId)：一段专注**自然完成**时回调，
 *     父组件在此 PATCH /api/tasks/[id] { incPomodoro: true } 并刷新列表。
 *     跳过不计完成、不回调。
 *
 * 计时核心状态在 src/store/pomodoro-store.ts（Zustand，不持久化）。
 * 段完成的副作用（POST /api/focus-sessions + onPomodoroComplete）由本组件
 * effect 监听 store 的 `lastCompletedSeq` 信号触发，避免 store 依赖组件 props。
 */

export interface PomodoroTimerProps {
  activeTask: {
    id: string;
    title: string;
    subject: string | null;
    estimatedPomodoros: number;
    completedPomodoros: number;
  } | null;
  onPomodoroComplete: (taskId: string | null) => void;
}

/* ---------------------------- 辅助 ---------------------------- */

/** 是否客户端（避免 hydration mismatch；dynamic import 已 ssr:false，此处防御性使用）。 */
function useIsClient(): boolean {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
}

/** 本地时区今日日期串 YYYY-MM-DD。 */
function todayStr(): string {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

/** 秒数 → mm:ss（两位补零）。 */
function fmt(sec: number): string {
  const safe = Math.max(0, Math.floor(sec));
  const m = Math.floor(safe / 60);
  const s = safe % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

/* ---------------------------- 常量 ---------------------------- */

/* 长休秒数由 store 的 longBreakMin 决定，不再用模块常量。 */

/* ---------------------------- 组件 ---------------------------- */

export function PomodoroTimer({
  activeTask,
  onPomodoroComplete,
}: PomodoroTimerProps) {
  const isClient = useIsClient();
  const role = useUserStore((s) => s.currentUser.role) as CreatorRole;

  /* ----- 订阅 store ----- */
  const phase = usePomodoroStore((s) => s.phase);
  const status = usePomodoroStore((s) => s.status);
  const remainingSec = usePomodoroStore((s) => s.remainingSec);
  const currentPhaseTotalSec = usePomodoroStore((s) => s.currentPhaseTotalSec);
  const completedFocusCount = usePomodoroStore((s) => s.completedFocusCount);
  const todayFocusCount = usePomodoroStore((s) => s.todayFocusCount);
  const todayFocusInitialized = usePomodoroStore(
    (s) => s.todayFocusInitialized,
  );
  const lastCompletedSeq = usePomodoroStore((s) => s.lastCompletedSeq);

  const start = usePomodoroStore((s) => s.start);
  const pause = usePomodoroStore((s) => s.pause);
  const reset = usePomodoroStore((s) => s.reset);
  const skip = usePomodoroStore((s) => s.skip);
  const tick = usePomodoroStore((s) => s.tick);
  const setTodayFocusCount = usePomodoroStore((s) => s.setTodayFocusCount);

  /* ----- 时长配置（用户可自定义） ----- */
  const focusMin = usePomodoroStore((s) => s.focusMin);
  const shortBreakMin = usePomodoroStore((s) => s.shortBreakMin);
  const longBreakMin = usePomodoroStore((s) => s.longBreakMin);
  const longBreakSec = longBreakMin * 60;

  /* ----- refs：副作用里读最新值，避免把 props 放进 effect 依赖 ----- */
  const activeTaskRef = useRef(activeTask);
  const onPomodoroCompleteRef = useRef(onPomodoroComplete);
  const roleRef = useRef(role);
  useEffect(() => {
    activeTaskRef.current = activeTask;
  }, [activeTask]);
  useEffect(() => {
    onPomodoroCompleteRef.current = onPomodoroComplete;
  }, [onPomodoroComplete]);
  useEffect(() => {
    roleRef.current = role;
  }, [role]);

  /* ----- 1) 初始化今日番茄数（仅一次） ----- */
  useEffect(() => {
    if (todayFocusInitialized) return;
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch(
          `/api/focus-sessions?date=${todayStr()}`,
          { cache: "no-store" },
        );
        if (!res.ok) return;
        const data = (await res.json()) as {
          sessions?: Array<{ type?: unknown }>;
        };
        const sessions = Array.isArray(data.sessions) ? data.sessions : [];
        const count = sessions.filter((s) => s.type === "focus").length;
        if (!cancelled) setTodayFocusCount(count);
      } catch (err) {
        console.error("[pomodoro] load today focus count", err);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [todayFocusInitialized, setTodayFocusCount]);

  /* ----- 2) 每秒 tick（仅 running 时；卸载清 interval） ----- */
  useEffect(() => {
    if (!isClient) return;
    if (status !== "running") return;
    const id = setInterval(() => tick(), 1000);
    return () => clearInterval(id);
  }, [isClient, status, tick]);

  /* ----- 3) 监听自然完成信号，触发副作用（POST + onPomodoroComplete） ----- */
  const prevSeqRef = useRef(lastCompletedSeq);
  useEffect(() => {
    if (prevSeqRef.current === lastCompletedSeq) return;
    prevSeqRef.current = lastCompletedSeq;

    const info = usePomodoroStore.getState().lastCompleted;
    if (!info) return;

    const task = activeTaskRef.current;
    const r = roleRef.current;
    const taskId = info.phase === "focus" ? (task?.id ?? null) : null;

    // POST focus session（失败仅日志，不阻塞流程；任务 PATCH 由父组件自管）
    void fetch("/api/focus-sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        role: r,
        taskId,
        durationMinutes: info.durationMinutes,
        type: info.phase,
      }),
    }).catch((err) => {
      console.error("[pomodoro] save focus session", err);
    });

    // 专注段自然完成 → 通知父组件 PATCH 任务 +1
    if (info.phase === "focus") {
      onPomodoroCompleteRef.current(task?.id ?? null);
    }
  }, [lastCompletedSeq]);

  /* ---------------------------- 派生 UI 文案 ---------------------------- */

  const isLongBreak =
    phase === "break" && currentPhaseTotalSec === longBreakSec;
  // 下一段专注若触发长休（completedFocusCount 已经是本次会话已完成数，
  // 再 +1 即下一次专注完成后的总数）
  const nextFocusTriggersLongBreak =
    phase === "focus" &&
    completedFocusCount + 1 > 0 &&
    (completedFocusCount + 1) % LONG_BREAK_EVERY === 0;

  const phaseLabel =
    phase === "focus" ? "专注中" : isLongBreak ? "长休息" : "休息一下";

  const taskLabel = activeTask?.title ?? "自由专注";

  const companionMsg = (() => {
    if (phase === "focus") {
      if (nextFocusTriggersLongBreak) return "再专注 1 个就长休啦";
      return "专注完这一段就歇会儿";
    }
    return isLongBreak ? "好好歇歇，待会儿再开始" : "休息也是学习的一部分";
  })();

  const mainBtnLabel =
    status === "running" ? "暂停" : status === "paused" ? "继续" : "开始";
  const MainBtnIcon = status === "running" ? Pause : Play;

  /* ---------------------------- 进度环几何 ---------------------------- */

  const ringSize = 240;
  const strokeWidth = 12;
  const radius = (ringSize - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const safeTotal = currentPhaseTotalSec > 0 ? currentPhaseTotalSec : 1;
  const progress = remainingSec / safeTotal; // 1 → 0
  // 满圆 → 空：offset 0 → circumference
  const dashOffset = circumference * (1 - progress);

  /* ---------------------------- 渲染 ---------------------------- */

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <GlassCard
        variant="strong"
        sheen
        pad="lg"
        className="space-y-4"
        aria-label="番茄钟"
      >
        {/* 顶部：图标 + 标题 + 设置 + 今日番茄计数 */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-leaf-soft/60 text-leaf">
              <Timer className="h-4 w-4" />
            </span>
            <h2 className="text-base font-semibold text-foreground">番茄钟</h2>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="text-sm text-muted-foreground">
              <span aria-hidden="true">🍅</span> ×{" "}
              {todayFocusInitialized ? (
                <span className="font-num text-foreground tabular-nums">
                  {todayFocusCount}
                </span>
              ) : (
                <span className="text-muted-foreground/60">…</span>
              )}
              <span className="ml-1 text-xs text-muted-foreground/80">今日</span>
            </div>
            <PomodoroSettings />
          </div>
        </div>

        {/* 阶段标签 + 关联任务 */}
        <div className="flex flex-wrap items-center justify-center gap-2 text-center">
          <Badge
            variant="outline"
            className="border-leaf/30 text-leaf"
          >
            {phaseLabel}
          </Badge>
          <span className="max-w-[180px] truncate text-sm text-muted-foreground sm:max-w-[260px]">
            {taskLabel}
          </span>
        </div>

        {/* 圆形进度环 + 中心 mm:ss */}
        <div className="flex justify-center">
          <div className="relative h-[200px] w-[200px] sm:h-[240px] sm:w-[240px]">
            <svg
              viewBox={`0 0 ${ringSize} ${ringSize}`}
              className="h-full w-full"
              aria-hidden="true"
            >
              {/* 轨道 */}
              <circle
                cx={ringSize / 2}
                cy={ringSize / 2}
                r={radius}
                fill="none"
                stroke="currentColor"
                strokeWidth={strokeWidth}
                className="text-muted/25"
              />
              {/* 进度（leaf 色；key=phase 使段切换时重挂载，避免回弹动画） */}
              <circle
                key={phase}
                cx={ringSize / 2}
                cy={ringSize / 2}
                r={radius}
                fill="none"
                stroke="currentColor"
                strokeWidth={strokeWidth}
                strokeLinecap="round"
                className="text-leaf transition-[stroke-dashoffset] duration-500 ease-out"
                style={{
                  strokeDasharray: circumference,
                  strokeDashoffset: dashOffset,
                }}
                transform={`rotate(-90 ${ringSize / 2} ${ringSize / 2})`}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="font-num text-5xl tabular-nums text-foreground sm:text-6xl">
                {fmt(remainingSec)}
              </span>
              <span className="mt-1 text-xs text-muted-foreground">
                {phase === "focus"
                  ? `专注 ${focusMin} 分钟`
                  : isLongBreak
                    ? `长休 ${longBreakMin} 分钟`
                    : `短休 ${shortBreakMin} 分钟`}
              </span>
            </div>
          </div>
        </div>

        {/* 陪伴文案 */}
        <p className="text-center text-sm leading-relaxed text-muted-foreground">
          {companionMsg}
        </p>

        {/* 控制按钮组 */}
        <div className="flex items-center justify-center gap-3">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={reset}
            disabled={status === "idle"}
            aria-label="重置当前段"
            className="text-muted-foreground hover:text-foreground"
          >
            <RotateCcw className="h-4 w-4" />
          </Button>

          <Button
            type="button"
            size="lg"
            onClick={status === "running" ? pause : start}
            className="min-w-[120px] bg-leaf text-primary-foreground shadow-sm hover:bg-leaf/90"
          >
            <MainBtnIcon className="h-4 w-4" />
            {mainBtnLabel}
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={skip}
            disabled={status === "idle"}
            aria-label="跳过当前段"
            className="text-muted-foreground hover:text-foreground"
          >
            <SkipForward className="h-4 w-4" />
          </Button>
        </div>

        {/* 当前专注任务的进度（如有） */}
        {activeTask && (
          <div className="rounded-xl bg-leaf-soft/30 px-3 py-2 text-center text-xs text-muted-foreground">
            已完成{" "}
            <span className="font-num text-foreground tabular-nums">
              {activeTask.completedPomodoros}
            </span>{" "}
            /{" "}
            <span className="font-num text-foreground tabular-nums">
              {activeTask.estimatedPomodoros}
            </span>{" "}
            段
          </div>
        )}
      </GlassCard>
    </motion.div>
  );
}
