"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Sparkles, Loader2 } from "lucide-react";
import { GlassCard } from "@/components/ui/glass-card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import {
  MOOD_OPTIONS,
  type CreatorRole,
  type MoodEntry,
} from "@/lib/mood-types";

/**
 * 心情选择器。
 *
 * - 5 个心情选项网格排列（移动端 5 列窄、桌面 5 列宽），emoji + label
 * - 选中后高亮（softBg + textColor），下方出现 whisper 陪伴语
 * - 选中后展开备注 Textarea（可选，视角化 placeholder，200 字限）
 * - "记下来"按钮：POST /api/moods，成功后清空 + onRecorded + toast"记下来啦"
 * - 提交中禁用按钮
 * - 姐姐视角同样能记录自己的心情
 */

interface MoodPickerProps {
  role: CreatorRole;
  /** 提交成功后回调（用于刷新时间线） */
  onRecorded: () => void;
}

export function MoodPicker({ role, onRecorded }: MoodPickerProps) {
  const { toast } = useToast();
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const selected =
    MOOD_OPTIONS.find((m) => m.key === selectedKey) ?? null;

  const headingText =
    role === "sister" ? "你也记一笔吧" : "选一个今天的心情";

  const notePlaceholder =
    role === "sister"
      ? "想给妹妹留句话也可以…"
      : "想说点什么就写下来…";

  const handleSelect = (key: string) => {
    if (submitting) return;
    setSelectedKey((prev) => (prev === key ? null : key));
  };

  const handleSubmit = async () => {
    if (!selected || submitting) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/moods", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role,
          mood: selected.key,
          note: note.trim() ? note.trim() : undefined,
        }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as
          | { error?: string }
          | null;
        throw new Error(data?.error ?? `记录失败（${res.status}）`);
      }
      await res.json() as { ok: boolean; entry: MoodEntry };
      toast({ description: "记下来啦" });
      setSelectedKey(null);
      setNote("");
      onRecorded();
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

  return (
    <GlassCard pad="lg" sheen variant="strong">
      <div className="relative z-[2] space-y-4">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-leaf" aria-hidden />
          <h3 className="text-sm font-medium text-foreground">
            {headingText}
          </h3>
        </div>

        {/* 心情选项 —— 5 列 */}
        <div
          role="radiogroup"
          aria-label="选择心情"
          className="grid grid-cols-5 gap-2 sm:gap-3"
        >
          {MOOD_OPTIONS.map((opt) => {
            const active = opt.key === selectedKey;
            return (
              <button
                key={opt.key}
                type="button"
                role="radio"
                aria-checked={active}
                disabled={submitting}
                onClick={() => handleSelect(opt.key)}
                className={cn(
                  "flex flex-col items-center gap-1.5 rounded-xl border px-1 py-3 transition-all duration-200 sm:px-2 sm:py-4",
                  "border-border/60 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
                  active
                    ? cn(
                        opt.softBg,
                        opt.textColor,
                        "border-transparent shadow-sm",
                      )
                    : "bg-background/40 text-muted-foreground hover:bg-background/70",
                )}
              >
                <span
                  className="text-2xl leading-none sm:text-3xl"
                  aria-hidden
                >
                  {opt.emoji}
                </span>
                <span className="text-xs font-medium sm:text-sm">
                  {opt.label}
                </span>
              </button>
            );
          })}
        </div>

        {/* whisper + 备注 + 提交 —— 选中后展开 */}
        <AnimatePresence initial={false}>
          {selected && (
            <motion.div
              key="mood-detail"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              className="overflow-hidden"
            >
              <div className="space-y-3">
                <p
                  className={cn(
                    "rounded-lg px-3 py-2 text-sm leading-relaxed",
                    selected.softBg,
                    selected.textColor,
                  )}
                >
                  {selected.whisper}
                </p>

                <Textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder={notePlaceholder}
                  maxLength={200}
                  rows={2}
                  disabled={submitting}
                  className="resize-none bg-background/60"
                  aria-label="心情备注"
                />

                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">
                    <span className="font-num tabular-nums">
                      {note.length}
                    </span>
                    /200
                  </span>
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleSubmit}
                    disabled={submitting}
                    className="gap-1.5"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        记着呢…
                      </>
                    ) : (
                      "记下来"
                    )}
                  </Button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </GlassCard>
  );
}
