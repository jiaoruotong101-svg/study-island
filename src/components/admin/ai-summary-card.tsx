"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Sparkles, Loader2, RefreshCw } from "lucide-react";
import { GlassCard } from "@/components/ui/glass-card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

/**
 * AI 总结卡片（姐姐视角，嵌入姐姐后台底部）。
 *
 * - 点击"生成总结" → POST /api/ai-summary → 展示温暖总结
 * - 加载中显示骨架光标
 * - 失败给陪伴向提示
 * - 可重新生成
 */
interface AiSummaryCardProps {
  /** 是否为姐姐视角（仅姐姐可生成） */
  isSister: boolean;
}

interface SummaryResult {
  ok: boolean;
  summary?: string;
  meta?: {
    days: number;
    totalFocusMinutes: number;
    pomodoroCount: number;
    completedTasks: number;
    pendingTasks: number;
    mistakeCount: number;
    activeDays: number;
  };
  error?: string;
}

export function AiSummaryCard({ isSister }: AiSummaryCardProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState<string | null>(null);
  const [meta, setMeta] = useState<SummaryResult["meta"] | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!isSister) return null;

  async function generate() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/ai-summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ days: 7 }),
      });
      const data = (await res.json()) as SummaryResult;
      if (!res.ok || !data.ok || !data.summary) {
        setError(data.error ?? "AI 暂时不在，稍等再试");
        return;
      }
      setSummary(data.summary);
      setMeta(data.meta ?? null);
      toast({ description: "AI 总结已经写好啦" });
    } catch {
      setError("网络似乎抖了一下，再试一次");
    } finally {
      setLoading(false);
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <GlassCard variant="strong" sheen pad="lg" className="space-y-4">
        {/* 标题 */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-leaf-soft/60 text-leaf">
              <Sparkles className="h-4 w-4" />
            </span>
            <div>
              <h3 className="text-base font-semibold text-foreground">
                AI 陪伴总结
              </h3>
              <p className="text-xs text-muted-foreground">
                让 AI 帮姐姐写一段关于妹妹近期的话
              </p>
            </div>
          </div>
          {summary && !loading && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={generate}
              className="shrink-0 text-muted-foreground"
              aria-label="重新生成总结"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">重新写</span>
            </Button>
          )}
        </div>

        {/* 内容区 */}
        {error && (
          <p className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
            {error}
          </p>
        )}

        {!summary && !loading && !error && (
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <span className="text-sm text-muted-foreground">
              点一下，让 AI 看看妹妹近 7 天的状态，给姐姐写几句温暖的话。
            </span>
            <Button
              type="button"
              onClick={generate}
              className="bg-leaf text-primary-foreground hover:bg-leaf/90"
            >
              <Sparkles className="mr-1 h-4 w-4" />
              生成 AI 总结
            </Button>
          </div>
        )}

        {loading && (
          <div className="flex flex-col items-center gap-3 py-8 text-center">
            <Loader2 className="h-6 w-6 animate-spin text-leaf" />
            <span className="text-sm text-muted-foreground">
              AI 正在认真看妹妹这段时间的坚持…
            </span>
          </div>
        )}

        {summary && !loading && (
          <div className="space-y-3">
            {/* 元数据小标签 */}
            {meta && (
              <div className="flex flex-wrap gap-2">
                <Tag>近 {meta.days} 天</Tag>
                <Tag>坚持 {meta.activeDays} 天</Tag>
                <Tag>专注 {meta.totalFocusMinutes} 分钟</Tag>
                <Tag>番茄 {meta.pomodoroCount} 个</Tag>
              </div>
            )}
            {/* 总结正文 */}
            <div className="whitespace-pre-line rounded-xl bg-leaf-soft/30 px-4 py-4 text-sm leading-relaxed text-foreground">
              {summary}
            </div>
          </div>
        )}
      </GlassCard>
    </motion.div>
  );
}

function Tag({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full bg-background/60 px-2.5 py-0.5 text-xs text-muted-foreground">
      <span className="font-num">{children}</span>
    </span>
  );
}
