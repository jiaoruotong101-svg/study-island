"use client";

import { Component, useCallback, useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { motion } from "framer-motion";
import { RefreshCw, Loader2, ListChecks } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useUserStore } from "@/store/user-store";
import { TaskComposer } from "./task-composer";
import { TaskList } from "./task-list";
import {
  todayStr,
  type Task,
  type CreatorRole,
  type TaskComposerPayload,
  type TaskItemHandlers,
} from "./task-section.types";

/**
 * 今日任务 section —— "今日任务 + 番茄钟"一体化容器。
 *
 * 职责：
 *   - 拉取今日任务列表（useState + fetch；未引入 QueryClientProvider）
 *   - 顶部：标题 + 视角化副标题 + 刷新按钮
 *   - TaskComposer 录入
 *   - TaskList 列表（分组 / 状态分支）
 *   - 预留番茄钟区域（动态 import，避免 3-b 文件未就绪时编译失败）
 *
 * 与番茄钟的联动：
 *   - activeTaskId：当前专注任务 id（由点"设为专注"设置）
 *   - onPomodoroComplete(taskId)：番茄钟完成一段专注时回调，
 *     在此 PATCH /api/tasks/[id] { incPomodoro: true } 并刷新列表
 */

/* ------------------------------------------------------------------ */
/* 番茄钟：动态 import（3-b 文件未就绪时由 PomodoroBoundary 兜底）      */
/* ------------------------------------------------------------------ */

/**
 * PomodoroTimer 的 props 契约（与 3-b 约定）。
 * 实际实现由 3-b 在 src/components/pomodoro/pomodoro-timer.tsx 提供，
 * 导出命名导出 { PomodoroTimer }。
 */
interface PomodoroTimerProps {
  activeTask: Task | null;
  onPomodoroComplete: (taskId: string | null) => void;
}

/**
 * 动态 import 番茄钟组件，ssr:false 仅在客户端加载。
 *
 * 说明：Next 16 turbopack 会对 `import("...")` 做静态模块解析，
 * 因此 3-b 文件必须存在才能编译。为避免 3-b 未就绪时整站 500，
 * 已在 src/components/pomodoro/pomodoro-timer.tsx 放置最小占位 stub
 *（仅本任务范围内为编译而建，3-b 将覆盖为真实实现）。
 * 即便如此仍加 PomodoroBoundary 兜底，防止运行时异常拖垮整个 section。
 */
const PomodoroTimer = dynamic<PomodoroTimerProps>(
  () =>
    import("@/components/pomodoro/pomodoro-timer").then(
      (m: { PomodoroTimer: React.ComponentType<PomodoroTimerProps> }) => ({
        default: m.PomodoroTimer,
      }),
    ),
  {
    ssr: false,
    loading: () => (
      <div className="rounded-2xl glass p-6 text-sm text-muted-foreground">
        番茄钟准备中…
      </div>
    ),
  },
);

/**
 * 番茄钟容错边界：3-b 文件尚未创建时，dynamic import 会 reject，
 * 此处兜底渲染一个温柔的占位，避免整个 section 崩掉。
 */
class PomodoroBoundary extends Component<
  { children: React.ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch() {
    // 静默：3-b 文件未就绪属于预期内的开发态
  }
  render() {
    if (this.state.failed) {
      return (
        <div className="rounded-2xl glass p-6 text-sm text-muted-foreground">
          番茄钟还在路上，先列任务吧。
        </div>
      );
    }
    return this.props.children;
  }
}

/* ------------------------------------------------------------------ */
/* TaskSection                                                         */
/* ------------------------------------------------------------------ */

export function TaskSection() {
  const currentUser = useUserStore((s) => s.currentUser);
  const role: CreatorRole = currentUser.role;

  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await fetch(`/api/tasks?date=${todayStr()}`, {
        cache: "no-store",
      });
      if (!res.ok) throw new Error(`加载失败（${res.status}）`);
      const data = (await res.json()) as { tasks: Task[] };
      setTasks(data.tasks ?? []);
    } catch (err) {
      console.error("[tasks] load", err);
      setError("任务暂时打不开，稍等一下再试");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  /* -------------------- 创建 -------------------- */
  const handleCreate = useCallback(
    async (payload: TaskComposerPayload) => {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: payload.title,
          subject: payload.subject === "none" ? null : payload.subject,
          estimatedPomodoros: payload.estimatedPomodoros,
          createdBy: role,
          taskDate: todayStr(),
        }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as {
          error?: string;
        };
        throw new Error(body.error ?? `添加失败（${res.status}）`);
      }
      const data = (await res.json()) as { task: Task };
      setTasks((prev) => [...prev, data.task]);
    },
    [role],
  );

  /* -------------------- 切换完成（乐观 + 回滚） -------------------- */
  const handleToggle = useCallback(async (id: string, done: boolean) => {
    setTasks((prev) =>
      prev.map((t) =>
        t.id === id
          ? {
              ...t,
              done,
              completedAt: done ? new Date().toISOString() : null,
            }
          : t,
      ),
    );
    // 标记完成时，若它是当前专注任务，则自动取消专注
    setActiveTaskId((prev) => (prev === id && done ? null : prev));
    try {
      const res = await fetch(`/api/tasks/${encodeURIComponent(id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ done }),
      });
      if (!res.ok) throw new Error(`更新失败（${res.status}）`);
      const data = (await res.json()) as { task: Task };
      setTasks((prev) => prev.map((t) => (t.id === id ? data.task : t)));
    } catch (err) {
      console.error("[tasks] toggle", err);
      // 回滚
      setTasks((prev) =>
        prev.map((t) =>
          t.id === id
            ? {
                ...t,
                done: !done,
                completedAt: !done ? new Date().toISOString() : null,
              }
            : t,
        ),
      );
      setError("没能保存，再点一次试试");
    }
  }, []);

  /* -------------------- 删除（乐观 + 失败重载） -------------------- */
  const handleDelete = useCallback(
    async (id: string) => {
      setTasks((prev) => prev.filter((t) => t.id !== id));
      setActiveTaskId((prev) => (prev === id ? null : prev));
      try {
        const res = await fetch(`/api/tasks/${encodeURIComponent(id)}`, {
          method: "DELETE",
        });
        if (!res.ok) throw new Error(`删除失败（${res.status}）`);
      } catch (err) {
        console.error("[tasks] delete", err);
        setError("没能删掉，刷新一下看看");
        void load();
      }
    },
    [load],
  );

  /* -------------------- 设为专注（toggle） -------------------- */
  const handlePickActive = useCallback((id: string) => {
    setActiveTaskId((prev) => (prev === id ? null : id));
  }, []);

  /* -------------------- 番茄钟完成回调（乐观 +1 / 回滚） -------------------- */
  const handlePomodoroComplete = useCallback(
    async (taskId: string | null) => {
      if (!taskId) return;
      // 乐观 +1（任务若已被删除则为 no-op）
      setTasks((prev) =>
        prev.map((t) =>
          t.id === taskId
            ? { ...t, completedPomodoros: t.completedPomodoros + 1 }
            : t,
        ),
      );
      try {
        const res = await fetch(`/api/tasks/${encodeURIComponent(taskId)}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ incPomodoro: true }),
        });
        if (!res.ok) throw new Error(`更新失败（${res.status}）`);
        const data = (await res.json()) as { task: Task };
        setTasks((prev) => prev.map((t) => (t.id === taskId ? data.task : t)));
      } catch (err) {
        console.error("[tasks] pomodoro complete", err);
        // 回滚 -1
        setTasks((prev) =>
          prev.map((t) =>
            t.id === taskId
              ? {
                  ...t,
                  completedPomodoros: Math.max(0, t.completedPomodoros - 1),
                }
              : t,
          ),
        );
      }
    },
    [],
  );

  const handlers = useMemo<TaskItemHandlers>(
    () => ({
      onToggle: handleToggle,
      onDelete: handleDelete,
      onPickActive: handlePickActive,
    }),
    [handleToggle, handleDelete, handlePickActive],
  );

  const activeTask = useMemo(
    () => tasks.find((t) => t.id === activeTaskId) ?? null,
    [tasks, activeTaskId],
  );

  const subtitle =
    role === "younger"
      ? "今天想做哪几件事？慢慢来，一件一件做就好。"
      : "看看今天想陪她做哪些，不催，陪着她就好。";

  return (
    <div className="space-y-5">
      {/* 标题区 */}
      <motion.section
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex items-start justify-between gap-3 px-1"
      >
        <div className="flex items-start gap-3">
          <span className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-leaf-soft/60 text-leaf">
            <ListChecks className="h-5 w-5" />
          </span>
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
              今日任务
            </h1>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
              {subtitle}
            </p>
          </div>
        </div>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          onClick={() => {
            setRefreshing(true);
            void load();
          }}
          disabled={refreshing}
          aria-label="刷新任务列表"
          className="mt-0.5 shrink-0 text-muted-foreground hover:text-foreground"
        >
          {refreshing ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
        </Button>
      </motion.section>

      {/* 录入 */}
      <TaskComposer createdBy={role} onCreate={handleCreate} />

      {/* 列表 */}
      <TaskList
        tasks={tasks}
        loading={loading}
        error={error}
        activeTaskId={activeTaskId}
        role={role}
        handlers={handlers}
      />

      {/* 番茄钟区域（3-b 文件未就绪时由 Boundary 兜底） */}
      <PomodoroBoundary>
        <PomodoroTimer
          activeTask={activeTask}
          onPomodoroComplete={handlePomodoroComplete}
        />
      </PomodoroBoundary>
    </div>
  );
}
