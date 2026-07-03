"use client";

import { create } from "zustand";

/**
 * 番茄钟计时状态机（Zustand）。
 *
 * 设计取舍：
 *   - 不用 persist：计时态本就不应跨刷新存活（刷新=新会话，符合番茄钟直觉）。
 *   - store 仅持有"计时核心状态 + 段切换逻辑"，不持有 activeTask / onPomodoroComplete
 *     等组件 props —— 副作用（POST focus session、回调父组件）由组件层 effect
 *     监听 `lastCompletedSeq` 信号触发，保证 store 单职责。
 *   - 自然完成（tick 到 0）与跳过（skip）走不同分支：
 *       自然完成 → 推进 lastCompletedSeq，组件 effect 据此 POST + 回调；
 *       跳过     → 仅切到下一段，不记录、不回调（"跳过"非"完成"）。
 */

/* ---------------------------- 时长配置 ---------------------------- */

export const FOCUS_MIN = 25;
export const SHORT_BREAK_MIN = 5;
export const LONG_BREAK_MIN = 15;
/** 每完成 N 段专注后进入长休。 */
export const LONG_BREAK_EVERY = 4;

const FOCUS_SEC = FOCUS_MIN * 60;
const SHORT_BREAK_SEC = SHORT_BREAK_MIN * 60;
const LONG_BREAK_SEC = LONG_BREAK_MIN * 60;

/* ---------------------------- 类型 ---------------------------- */

type Phase = "focus" | "break";
type Status = "idle" | "running" | "paused";

/** 刚自然完成的段信息（供组件层 effect 读取做副作用）。 */
interface LastCompleted {
  phase: Phase;
  /** 该段实际配置的总分钟数（focus=25 / break=5|15）。 */
  durationMinutes: number;
}

interface PomodoroState {
  /** 当前段类型。 */
  phase: Phase;
  /** 计时状态：idle 未开始 / running 走字 / paused 暂停。 */
  status: Status;
  /** 当前段剩余秒数。 */
  remainingSec: number;
  /** 当前段总秒数（用于进度环与 mm:ss 比例）。 */
  currentPhaseTotalSec: number;
  /** 本次会话累计完成的专注段数（用于决定长休）。 */
  completedFocusCount: number;
  /** 今日已完成番茄数（从 API 初始化，自然完成专注时自增）。 */
  todayFocusCount: number;
  /** 是否已从 API 加载过今日番茄数（避免重复 fetch 覆盖本地自增）。 */
  todayFocusInitialized: boolean;
  /** 自然完成段信号：每次自然完成 +1，组件 effect 监听本字段触发副作用。 */
  lastCompletedSeq: number;
  /** 刚自然完成的段信息（与 lastCompletedSeq 同步设置）。 */
  lastCompleted: LastCompleted | null;

  /* ---------------------------- actions ---------------------------- */
  /** 开始 / 继续：idle 或 paused → running。 */
  start: () => void;
  /** 暂停：running → paused。 */
  pause: () => void;
  /** 重置当前段：remainingSec 回到当前段满值，状态回 idle。 */
  reset: () => void;
  /** 跳过当前段：直接进下一段，不记录、不回调。 */
  skip: () => void;
  /** 每秒调用：remainingSec-1；归 0 时自然完成当前段并进下一段。 */
  tick: () => void;
  /** 设置今日已完成番茄数（来自 API 初始化）。 */
  setTodayFocusCount: (n: number) => void;
}

/* ---------------------------- 辅助函数 ---------------------------- */

/** 根据已完成专注段数决定下一段休息秒数（每 4 段长休，0 段时短休）。 */
function nextBreakSec(completed: number): number {
  return completed > 0 && completed % LONG_BREAK_EVERY === 0
    ? LONG_BREAK_SEC
    : SHORT_BREAK_SEC;
}

/** 计算下一段 phase 与总秒数。 */
function computeNextPhase(
  current: Phase,
  completedFocusCount: number,
): { phase: Phase; totalSec: number } {
  if (current === "focus") {
    return { phase: "break", totalSec: nextBreakSec(completedFocusCount) };
  }
  return { phase: "focus", totalSec: FOCUS_SEC };
}

/* ---------------------------- store ---------------------------- */

export const usePomodoroStore = create<PomodoroState>((set, get) => ({
  phase: "focus",
  status: "idle",
  remainingSec: FOCUS_SEC,
  currentPhaseTotalSec: FOCUS_SEC,
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
    // idle 时不允许跳过（UI 也会 disable），这里加保险
    if (s.status === "idle") return;
    const next = computeNextPhase(s.phase, s.completedFocusCount);
    // 跳过专注段不递增 completedFocusCount（"跳过"非"完成"）
    set({
      phase: next.phase,
      currentPhaseTotalSec: next.totalSec,
      remainingSec: next.totalSec,
      // status 保留原状（running 自动接下一段 / paused 等用户继续）
    });
  },

  tick: () => {
    const s = get();
    if (s.status !== "running") return;

    // 还有 >1 秒：常规递减
    if (s.remainingSec > 1) {
      set({ remainingSec: s.remainingSec - 1 });
      return;
    }

    // remainingSec === 1：自然完成当前段，进下一段（保留 running 自动衔接）
    const justEndedPhase = s.phase;
    const justEndedDurationMin = Math.round(s.currentPhaseTotalSec / 60);

    let completedFocusCount = s.completedFocusCount;
    if (justEndedPhase === "focus") {
      completedFocusCount = s.completedFocusCount + 1;
    }
    const next = computeNextPhase(justEndedPhase, completedFocusCount);

    set({
      phase: next.phase,
      currentPhaseTotalSec: next.totalSec,
      remainingSec: next.totalSec,
      status: "running",
      completedFocusCount,
      todayFocusCount:
        justEndedPhase === "focus"
          ? s.todayFocusCount + 1
          : s.todayFocusCount,
      lastCompleted: {
        phase: justEndedPhase,
        durationMinutes: justEndedDurationMin,
      },
      lastCompletedSeq: s.lastCompletedSeq + 1,
    });
  },

  setTodayFocusCount: (n: number) => {
    const safe =
      typeof n === "number" && Number.isFinite(n) && n >= 0
        ? Math.floor(n)
        : 0;
    set({ todayFocusCount: safe, todayFocusInitialized: true });
  },
}));
