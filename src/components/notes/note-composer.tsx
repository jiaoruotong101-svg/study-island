"use client";

import { useState } from "react";
import { Loader2, Send } from "lucide-react";
import { GlassCard } from "@/components/ui/glass-card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import type { CreatorRole, DailyNote } from "@/lib/note-types";

/**
 * 每日留言 —— 录入区（小纸条书写）。
 *
 * - 仅在查看"今天"时由父级渲染（往日只读）
 * - Textarea 自适应高度，500 字限
 * - 字数计数（.font-num）
 * - "留下"按钮：POST /api/notes，成功后清空 + onSubmitted + toast"小纸条已经留下啦"
 * - 空内容/提交中按钮禁用
 * - 视角化 placeholder
 */

interface NoteComposerProps {
  role: CreatorRole;
  /** 提交成功后回调（供父级 refreshKey+1 重新拉取列表） */
  onSubmitted: () => void;
}

const MAX_LEN = 500;

export function NoteComposer({ role, onSubmitted }: NoteComposerProps) {
  const { toast } = useToast();
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const placeholder =
    role === "sister"
      ? "想给妹妹留句话…"
      : "想对姐姐说什么，写下来…";

  const trimmed = content.trim();
  const canSubmit = trimmed.length > 0 && !submitting && content.length <= MAX_LEN;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ authorRole: role, content: trimmed }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as
          | { error?: string }
          | null;
        throw new Error(data?.error ?? `留下失败（${res.status}）`);
      }
      await res.json() as { ok: boolean; note: DailyNote };
      toast({ description: "小纸条已经留下啦" });
      setContent("");
      onSubmitted();
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : "网络似乎抖了一下，再试一次看看";
      toast({ description: msg });
    } finally {
      setSubmitting(false);
    }
  };

  const overLimit = content.length > MAX_LEN;

  return (
    <GlassCard pad="lg" sheen variant="strong">
      <div className="relative z-[2] space-y-3">
        <Textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder={placeholder}
          maxLength={MAX_LEN}
          rows={3}
          disabled={submitting}
          aria-label="留言内容"
          className={cn(
            "min-h-[96px] resize-y bg-background/60 leading-relaxed",
            "focus-visible:ring-leaf/40",
          )}
        />

        <div className="flex items-center justify-between gap-3">
          <span
            className={cn(
              "text-xs",
              overLimit
                ? "text-destructive"
                : "text-muted-foreground",
            )}
          >
            <span className="font-num tabular-nums">{content.length}</span>
            <span className="text-muted-foreground/70">/{MAX_LEN}</span>
          </span>

          <Button
            type="button"
            size="sm"
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="gap-1.5"
            aria-label="留下这条小纸条"
          >
            {submitting ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                留着呢…
              </>
            ) : (
              <>
                <Send className="h-3.5 w-3.5" />
                留下
              </>
            )}
          </Button>
        </div>
      </div>
    </GlassCard>
  );
}
