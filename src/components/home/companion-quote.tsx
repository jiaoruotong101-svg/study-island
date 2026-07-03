"use client";

import { useCallback, useEffect, useState } from "react";
import { Quote as QuoteIcon } from "lucide-react";
import { getQuoteOfTheDay } from "@/lib/quotes";
import { GlassCard } from "@/components/ui/glass-card";
import { QuoteEditor } from "@/components/home/quote-editor";
import { getChatSocket } from "@/lib/chat-socket";
import { useToast } from "@/hooks/use-toast";
import type { HomeQuote } from "@/lib/quote-types";

/**
 * 首页小岛留言（原"每日陪伴语录"）。
 *
 * - 姐姐和妹妹可自由编辑，标注作者视角
 * - 两人共享同一条最新内容（小岛牌）
 * - 无留言时回退到默认语录库（getQuoteOfTheDay）
 * - 通过 socket quote:updated 实时同步
 */
export function CompanionQuote() {
  const [quote, setQuote] = useState<HomeQuote | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  // 拉取当前留言
  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/quote", { cache: "no-store" });
      const data = (await res.json()) as { quote: HomeQuote | null };
      setQuote(data.quote ?? null);
    } catch {
      // 静默失败，回退默认语录
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // 监听 socket 实时同步
  useEffect(() => {
    const socket = getChatSocket();
    const handler = (payload: unknown) => {
      if (payload && typeof payload === "object" && "id" in payload) {
        setQuote(payload as HomeQuote);
      }
    };
    socket.on("quote:updated", handler);
    return () => {
      socket.off("quote:updated", handler);
    };
  }, []);

  const handleSaved = useCallback(
    (q: HomeQuote) => {
      setQuote(q);
      // 广播给其他端（自己也会收到，setQuote 幂等）
      getChatSocket().emit("quote:update", q);
      toast({
        description: "已经留在小岛上啦",
      });
    },
    [toast],
  );

  // 无留言时回退默认语录库
  const fallback = getQuoteOfTheDay();
  const display = quote ?? null;

  return (
    <section aria-label="小岛留言">
      <GlassCard variant="strong" sheen pad="lg" className="bg-leaf-soft/50">
        <QuoteIcon className="absolute right-5 top-5 h-10 w-10 text-leaf/15" />
        <p className="relative z-[2] max-w-xl text-lg font-medium leading-relaxed text-foreground sm:text-xl">
          {loading ? "…" : (display?.content ?? fallback.text)}
        </p>
        <div className="relative z-[2] mt-3 flex items-center gap-2">
          {display ? (
            <>
              <span className="rounded-full bg-background/60 px-2.5 py-0.5 text-xs font-medium text-leaf">
                {display.authorRole === "sister" ? "姐姐" : "妹妹"} 留
              </span>
              <span className="font-num text-xs text-muted-foreground">
                {formatRelative(display.updatedAt)}
              </span>
            </>
          ) : (
            <span className="text-sm text-muted-foreground">
              —— {fallback.author}
            </span>
          )}
        </div>
        {/* 编辑入口：姐姐和妹妹都能改 */}
        <QuoteEditor current={display} onSaved={handleSaved} />
      </GlassCard>
    </section>
  );
}

/** 中文相对时间 */
function formatRelative(iso: string): string {
  const now = Date.now();
  const t = new Date(iso).getTime();
  const diff = Math.max(0, now - t);
  if (diff < 60_000) return "刚刚";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)} 分钟前`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)} 小时前`;
  if (diff < 7 * 86_400_000) return `${Math.floor(diff / 86_400_000)} 天前`;
  const d = new Date(iso);
  return `${d.getMonth() + 1}月${d.getDate()}日`;
}
