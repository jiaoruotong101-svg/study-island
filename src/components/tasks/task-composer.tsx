"use client";

import { useState } from "react";
import { Plus, Loader2 } from "lucide-react";
import { GlassCard } from "@/components/ui/glass-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  SUBJECTS,
  POMODORO_OPTIONS,
  type CreatorRole,
  type TaskComposerPayload,
  type SubjectName,
} from "./task-section.types";

/**
 * 任务录入器。
 *
 * - 标题输入框（回车提交，输入法合成中不触发）
 * - 科目下拉（可选，"none" 表示不选）
 * - 预计番茄数下拉（1-6，默认 1）
 * - 添加按钮
 *
 * 提交后由父组件 onCreate 负责持久化；本组件只负责表单状态与校验。
 */

interface TaskComposerProps {
  createdBy: CreatorRole;
  disabled?: boolean;
  onCreate: (payload: TaskComposerPayload) => Promise<void>;
}

export function TaskComposer({ createdBy, disabled, onCreate }: TaskComposerProps) {
  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState<SubjectName | "none">("none");
  const [est, setEst] = useState<number>(1);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const placeholder =
    createdBy === "younger"
      ? "今天想做哪件事，慢慢写就好…"
      : "想陪她做点什么，写下来吧…";

  async function submit() {
    const t = title.trim();
    if (!t) {
      setErr("给任务起个名字吧");
      return;
    }
    if (t.length > 100) {
      setErr("任务名有点长，100 字以内就好");
      return;
    }
    setBusy(true);
    setErr(null);
    try {
      await onCreate({
        title: t,
        subject,
        estimatedPomodoros: est,
      });
      // 提交成功后清空表单，方便连加
      setTitle("");
      setSubject("none");
      setEst(1);
    } catch {
      setErr("没能加进来，再试一次看看");
    } finally {
      setBusy(false);
    }
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && !e.nativeEvent.isComposing) {
      e.preventDefault();
      void submit();
    }
  }

  return (
    <GlassCard pad="md" className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          maxLength={100}
          disabled={busy || disabled}
          aria-label="任务名"
          className="flex-1"
        />
        <div className="flex items-center gap-2">
          <Select
            value={subject}
            onValueChange={(v) => setSubject(v as SubjectName | "none")}
            disabled={busy || disabled}
          >
            <SelectTrigger
              size="sm"
              className="h-9 w-[5.5rem] sm:w-24"
              aria-label="科目"
            >
              <SelectValue placeholder="科目" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">不选科目</SelectItem>
              {SUBJECTS.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={String(est)}
            onValueChange={(v) => setEst(Number(v))}
            disabled={busy || disabled}
          >
            <SelectTrigger
              size="sm"
              className="h-9 w-[5.5rem] sm:w-24"
              aria-label="预计番茄数"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {POMODORO_OPTIONS.map((n) => (
                <SelectItem key={n} value={String(n)}>
                  <span className="font-num">{n}</span>
                  <span className="ml-1">个 🍅</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            type="button"
            size="default"
            onClick={() => void submit()}
            disabled={busy || disabled}
            className="h-9 shrink-0"
          >
            {busy ? (
              <Loader2 className="mr-1 h-4 w-4 animate-spin" />
            ) : (
              <Plus className="mr-1 h-4 w-4" />
            )}
            添加
          </Button>
        </div>
      </div>
      {err && (
        <p className="text-xs leading-relaxed text-muted-foreground">{err}</p>
      )}
    </GlassCard>
  );
}
