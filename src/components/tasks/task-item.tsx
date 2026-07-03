"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Trash2, Target, Loader2 } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import type { Task, TaskItemHandlers } from "./task-section.types";

/**
 * 单条任务项。
 *
 * 布局：[checkbox] [任务名 + 科目Badge + 专注中Badge] [番茄进度 + 创建者] [设为专注] [删除]
 *
 * - 当前专注任务：leaf 边框 + 浅绿底 + "专注中" Badge
 * - 已完成：删除线 + 灰化，隐藏"设为专注"按钮
 * - 删除走 AlertDialog 二次确认
 * - 番茄进度：🍅 completedPomodoros/estimatedPomodoros，数字用 .font-num
 */

interface TaskItemProps {
  task: Task;
  active: boolean;
  handlers: TaskItemHandlers;
}

export function TaskItem({ task, active, handlers }: TaskItemProps) {
  const [toggling, setToggling] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleToggle(checked: boolean | "indeterminate") {
    setToggling(true);
    try {
      await handlers.onToggle(task.id, checked === true);
    } finally {
      setToggling(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      await handlers.onDelete(task.id);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className={cn(
        "flex items-start gap-3 rounded-xl border p-3 transition-colors",
        active
          ? "border-leaf/50 bg-leaf-soft/40"
          : "border-transparent hover:bg-muted/30",
        task.done && "opacity-60",
      )}
    >
      <Checkbox
        checked={task.done}
        onCheckedChange={(v) => void handleToggle(v)}
        disabled={toggling}
        className="mt-0.5 data-[state=checked]:bg-leaf data-[state=checked]:border-leaf"
        aria-label={task.done ? "标记为未完成" : "标记为完成"}
      />

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p
            className={cn(
              "text-sm leading-relaxed text-foreground break-words",
              task.done && "line-through text-muted-foreground",
            )}
          >
            {task.title}
          </p>
          {task.subject && (
            <Badge
              variant="outline"
              className="bg-leaf-soft/40 border-leaf/30 text-foreground"
            >
              {task.subject}
            </Badge>
          )}
          {active && (
            <Badge className="bg-leaf text-primary-foreground border-transparent">
              专注中
            </Badge>
          )}
        </div>

        <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <span aria-hidden className="text-sm leading-none">
              🍅
            </span>
            <span className="font-num">{task.completedPomodoros}</span>
            <span className="text-muted-foreground/60">/</span>
            <span className="font-num">{task.estimatedPomodoros}</span>
          </span>
          <span className="text-muted-foreground/50" aria-hidden>
            ·
          </span>
          <span>{task.createdBy === "younger" ? "妹妹 列" : "姐姐 列"}</span>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-1">
        {!task.done && (
          <Button
            type="button"
            size="sm"
            variant={active ? "default" : "ghost"}
            onClick={() => handlers.onPickActive(task.id)}
            disabled={active}
            className={cn(
              "h-8 gap-1",
              active
                ? "bg-leaf text-primary-foreground hover:bg-leaf/90"
                : "text-leaf hover:bg-leaf-soft/50 hover:text-leaf",
            )}
            aria-label={active ? "正在专注此任务" : "设为当前专注任务"}
          >
            <Target className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">
              {active ? "专注中" : "设为专注"}
            </span>
          </Button>
        )}

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              type="button"
              size="icon"
              variant="ghost"
              disabled={deleting}
              className="h-8 w-8 text-muted-foreground hover:text-destructive"
              aria-label="删除任务"
            >
              {deleting ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Trash2 className="h-3.5 w-3.5" />
              )}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>删掉这条任务吗？</AlertDialogTitle>
              <AlertDialogDescription>
                今天做不完也没关系，删掉就是不想做了，以后还能再加。
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>再想想</AlertDialogCancel>
              <AlertDialogAction
                onClick={(e) => {
                  e.preventDefault();
                  void handleDelete();
                }}
                className="bg-destructive text-white hover:bg-destructive/90"
              >
                删掉
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </motion.div>
  );
}
