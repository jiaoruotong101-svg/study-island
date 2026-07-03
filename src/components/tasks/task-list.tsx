"use client";

import { GlassCard } from "@/components/ui/glass-card";
import { Skeleton } from "@/components/ui/skeleton";
import { TaskItem } from "./task-item";
import type {
  Task,
  CreatorRole,
  TaskItemHandlers,
} from "./task-section.types";

/**
 * 任务列表区。
 *
 * 状态分支：
 *   - loading  → Skeleton × 3
 *   - error    → 陪伴向错误条
 *   - empty    → 视角化空态
 *   - normal   → 分两组（待完成 / 已完成），可滚动
 *
 * 已完成组仅在非空时渲染，避免空"已完成"标题干扰。
 */

interface TaskListProps {
  tasks: Task[];
  loading: boolean;
  error: string | null;
  activeTaskId: string | null;
  role: CreatorRole;
  handlers: TaskItemHandlers;
}

export function TaskList({
  tasks,
  loading,
  error,
  activeTaskId,
  role,
  handlers,
}: TaskListProps) {
  if (loading) {
    return (
      <GlassCard pad="md" className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-14 w-full rounded-xl" />
        ))}
      </GlassCard>
    );
  }

  if (error) {
    return (
      <GlassCard pad="md" className="text-sm leading-relaxed text-muted-foreground">
        {error}
      </GlassCard>
    );
  }

  if (tasks.length === 0) {
    return (
      <GlassCard pad="lg" className="text-center">
        <p className="text-sm leading-relaxed text-muted-foreground">
          {role === "younger"
            ? "今天还没列任务，先想想最重要的一件是什么"
            : "妹妹还没列任务，也许她想先歇会儿"}
        </p>
      </GlassCard>
    );
  }

  const pending = tasks.filter((t) => !t.done);
  const done = tasks.filter((t) => t.done);

  return (
    <div className="max-h-[40vh] space-y-4 overflow-y-auto pr-1">
      <Group
        title="待完成"
        tasks={pending}
        activeTaskId={activeTaskId}
        handlers={handlers}
        emptyHint="都做完啦，今天辛苦了"
      />
      {done.length > 0 && (
        <Group
          title={`已完成（${done.length}）`}
          tasks={done}
          activeTaskId={activeTaskId}
          handlers={handlers}
        />
      )}
    </div>
  );
}

interface GroupProps {
  title: string;
  tasks: Task[];
  activeTaskId: string | null;
  handlers: TaskItemHandlers;
  emptyHint?: string;
}

function Group({
  title,
  tasks,
  activeTaskId,
  handlers,
  emptyHint,
}: GroupProps) {
  return (
    <section>
      <h3 className="mb-2 px-1 text-xs font-medium tracking-wide text-muted-foreground">
        {title}
      </h3>
      {tasks.length === 0 && emptyHint ? (
        <p className="px-1 py-2 text-xs text-muted-foreground/70">{emptyHint}</p>
      ) : (
        <div className="space-y-1.5">
          {tasks.map((t) => (
            <TaskItem
              key={t.id}
              task={t}
              active={t.id === activeTaskId}
              handlers={handlers}
            />
          ))}
        </div>
      )}
    </section>
  );
}
