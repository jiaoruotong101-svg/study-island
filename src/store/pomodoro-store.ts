"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

/**
 * 番茄钟计时状态机（Zustand）。
 *
 * 设计取舍：
 *   - 时长配置（focus/shortBreak/longBreak 分钟）用 persist 持久化到 localStorage，
 *     用户自定义后跨刷新保留；计时态（phase/status/remainingSec 等）不持久化，
 *     刷新=新会话，符合番茄钟直觉。
 *   - store 仅持有"计时核心状态 + 段切换逻辑"，不持有 activeTask / onPomodoroComplete
 *     等组件 props —— 副作用（POST focus session、回调父组件）由组件层 effect
 *     监听 `lastCompletedSeq` 信号触发，保证 store 单职责。
 *   - 自然完成（tick 到 0）与跳过（skip）走不同分支：
 *       自然完成 → 推进 lastCompletedSeq，组件 effect 据此 POST + 回调；
 *       跳过     → 仅切到下一段，不记录、不回调（"跳过"非"完成"）。
 */

/* ---------------------------- 默认时长（分钟） ---------------------------- */

export const DEFAULT_FOCUS_MIN = 25;
export const DEFAULT_SHORT_BREAK_MIN = 5;
export const DEFAULT_LONG_BREAK_MIN = 15;
/** 每完成 N 段专注后进入长休。 */
export const LONG_BREAK_EVERY = 4;

/* ---------------------------- 时长范围校验 ---------------------------- */

const FOCUS_RANGE = { min: 1, max: 120 } as const;
const SHORT_BREAK_RANGE = { min: 1, max: 60 } as const;
const LONG_BREAK_RANGE = { min: 1, max: 60 } as const;

function clamp(n: number, range: { min: number; max: number }): number {
  if (!Number.isFinite(n)) return range.min;
  return Math.min(range.max, Math.max(range.min, Math.floor(n)));
}

export interface PomodoroDurations {
  focusMin: number;
  shortBreakMin: number;
  longBreakMin: number;
}

/* ---------------------------- 类型 ---------------------------- */

type Phase = "focus" | "break";
type Status = "idle" | "running" | "paused";

/** 刚自然完成的段信息（供组件层 effect 读取做副作用）。 */
interface LastCompleted {
  phase: Phase;
  /** 该段实际配置的总分钟数。 */
  durationMinutes: number;
}

interface PomodoroState {
  /* ----- 时长配置（持久化） ----- */
  focusMin: number;
  shortBreakMin: number;
  longBreakMin: number;

  /* ----- 计时态（不持久化） ----- */
  phase: Phase;
  status: Status;
  remainingSec: number;
  currentPhaseTotalSec: number;
  completedFocusCount: number;
  todayFocusCount: number;
  todayFocusInitialized: boolean;
  lastCompletedSeq: number;
  lastCompleted: LastCompleted | null;

  /* ---------------------------- actions ---------------------------- */
  start: () => void;
  pause: () => void;
  reset: () => void;
  skip: () => void;
  tick: () => void;
  setTodayFocusCount: (n: number) => void;
  /** 更新时长配置；若当前 idle 且在对应段，立即同步 remainingSec。 */
  setDurations: (d: Partial<PomodoroDurations>) => void;
  /** 恢复默认时长。 */
  resetDurations: () => void;
}

/* ---------------------------- 辅助函数 ---------------------------- */

/** 根据已完成专注段数决定下一段休息秒数（每 4 段长休，0 段时短休）。 */
function nextBreakSec(completed: number, shortSec: number, longSec: number): number {
  return completed > 0 && completed % LONG_BREAK_EVERY === 0 ? longSec : shortSec;
}

/** 计算下一段 phase 与总秒数。 */
function computeNextPhase(
  current: Phase,
  completedFocusCount: number,
  focusSec: number,
  shortSec: number,
  longSec: number,
): { phase: Phase; totalSec: number } {
  if (current === "focus") {
    return { phase: "break", totalSec: nextBreakSec(completedFocusCount, shortSec, longSec) };
  }
  return { phase: "focus", totalSec: focusSec };
}

/* ---------------------------- store ---------------------------- */

export const usePomodoroStore = create<PomodoroState>()(
  persist(
    (set, get) => ({
      focusMin: DEFAULT_FOCUS_MIN,
      shortBreakMin: DEFAULT_SHORT_BREAK_MIN,
      longBreakMin: DEFAULT_LONG_BREAK_MIN,

      phase: "focus",
      status: "idle",
      // remainingSec/currentPhaseTotalSec 在 hydration 后由 onRehydrateStorage 校正
      remainingSec: DEFAULT_FOCUS_MIN * 60,
      currentPhaseTotalSec: DEFAULT_FOCUS_MIN * 60,
      completedFocusCount: 0,
      todayFocusCount: 0,
      todayFocusInitialized: false,
      lastCompletedSeq: 0,
      lastCompleted: null,

      start: () => {
        if (get().status === "running") return;
        set({ status: "running" });
      },

      pause: () => {
        if (get().status !== "running") return;
        set({ status: "paused" });
      },

      reset: () => {
        const s = get();
        set({ status: "idle", remainingSec: s.currentPhaseTotalSec });
      },

      skip: () => {
        const s = get();
        if (s.status === "idle") return;
        const focusSec = s.focusMin * 60;
        const shortSec = s.shortBreakMin * 60;
        const longSec = s.longBreakMin * 60;
        const next = computeNextPhase(s.phase, s.completedFocusCount, focusSec, shortSec, longSec);
        set({
          phase: next.phase,
          currentPhaseTotalSec: next.totalSec,
          remainingSec: next.totalSec,
        });
      },

      tick: () => {
        const s = get();
        if (s.status !== "running") return;

        if (s.remainingSec > 1) {
          set({ remainingSec: s.remainingSec - 1 });
          return;
        }

        // remainingSec === 1：自然完成当前段，进下一段
        const justEndedPhase = s.phase;
        const justEndedDurationMin = Math.round(s.currentPhaseTotalSec / 60);

        const focusSec = s.focusMin * 60;
        const shortSec = s.shortBreakMin * 60;
        const longSec = s.longBreakMin * 60;

        let completedFocusCount = s.completedFocusCount;
        if (justEndedPhase === "focus") {
          completedFocusCount = s.completedFocusCount + 1;
        }
        const next = computeNextPhase(justEndedPhase, completedFocusCount, focusSec, shortSec, longSec);

        set({
          phase: next.phase,
          currentPhaseTotalSec: next.totalSec,
          remainingSec: next.totalSec,
          status: "running",
          completedFocusCount,
          todayFocusCount:
            justEndedPhase === "focus" ? s.todayFocusCount + 1 : s.todayFocusCount,
          lastCompleted: {
            phase: justEndedPhase,
            durationMinutes: justEndedDurationMin,
          },
          lastCompletedSeq: s.lastCompletedSeq + 1,
        });
      },

      setTodayFocusCount: (n: number) => {
        const safe =
          typeof n === "number" && Number.isFinite(n) && n >= 0 ? Math.floor(n) : 0;
        set({ todayFocusCount: safe, todayFocusInitialized: true });
      },

      setDurations: (d) => {
        const s = get();
        const next = {
          focusMin: d.focusMin !== undefined ? clamp(d.focusMin, FOCUS_RANGE) : s.focusMin,
          shortBreakMin:
            d.shortBreakMin !== undefined ? clamp(d.shortBreakMin, SHORT_BREAK_RANGE) : s.shortBreakMin,
          longBreakMin:
            d.longBreakMin !== undefined ? clamp(d.longBreakMin, LONG_BREAK_RANGE) : s.longBreakMin,
        };

        // 若当前处于 idle 且正在显示某段，把 remainingSec 同步到新时长
        // 运行中/暂停中改动不影响当前段，下一段自然生效
        let patch: Partial<PomodoroState> = { ...next };
        if (s.status === "idle") {
          if (s.phase === "focus") {
            const newSec = next.focusMin * 60;
            patch = { ...patch, currentPhaseTotalSec: newSec, remainingSec: newSec };
          } else if (s.phase === "break") {
            // 当前是 break 段 idle：判断是长休还是短休（依据 currentPhaseTotalSec 与原 long）
            const wasLong = s.currentPhaseTotalSec === s.longBreakMin * 60;
            const newSec = (wasLong ? next.longBreakMin : next.shortBreakMin) * 60;
            patch = { ...patch, currentPhaseTotalSec: newSec, remainingSec: newSec };
          }
        }
        set(patch);
      },

      resetDurations: () => {
        const s = get();
        let patch: Partial<PomodoroState> = {
          focusMin: DEFAULT_FOCUS_MIN,
          shortBreakMin: DEFAULT_SHORT_BREAK_MIN,
          longBreakMin: DEFAULT_LONG_BREAK_MIN,
        };
        if (s.status === "idle") {
          if (s.phase === "focus") {
            patch.currentPhaseTotalSec = DEFAULT_FOCUS_MIN * 60;
            patch.remainingSec = DEFAULT_FOCUS_MIN * 60;
          } else {
            const wasLong = s.currentPhaseTotalSec === s.longBreakMin * 60;
            const sec = (wasLong ? DEFAULT_LONG_BREAK_MIN : DEFAULT_SHORT_BREAK_MIN) * 60;
            patch.currentPhaseTotalSec = sec;
            patch.remainingSec = sec;
          }
        }
        set(patch);
      },
    }),
    {
      name: "study-island-pomodoro-durations",
      // 只持久化时长配置，不持久化计时态
      partialize: (s) => ({
        focusMin: s.focusMin,
        shortBreakMin: s.shortBreakMin,
        longBreakMin: s.longBreakMin,
      }),
      // 持久化的时长恢复后，校正初始 remainingSec/currentPhaseTotalSec
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        const sec = state.focusMin * 60;
        state.remainingSec = sec;
        state.currentPhaseTotalSec = sec;
      },
    },
  ),
);
