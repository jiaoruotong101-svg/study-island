"use client";

import { useMemo } from "react";
import { Quote as QuoteIcon } from "lucide-react";
import { getQuoteOfTheDay } from "@/lib/quotes";

/**
 * 每日陪伴语录。
 *
 * - 同一天显示同一条，避免分心
 * - 文案均来自陪伴语录库，体现"陪伴而非监督"
 */
export function CompanionQuote() {
  const quote = useMemo(() => getQuoteOfTheDay(), []);

  return (
    <section
      aria-label="今日陪伴语录"
      className="
        relative overflow-hidden rounded-2xl
        border border-leaf/20 bg-leaf-soft/60
        p-6 sm:p-8
      "
    >
      <QuoteIcon className="absolute right-5 top-5 h-10 w-10 text-leaf/15" />
      <p className="relative max-w-xl text-lg font-medium leading-relaxed text-foreground sm:text-xl">
        {quote.text}
      </p>
      {quote.author && (
        <p className="relative mt-3 text-sm text-muted-foreground">
          —— {quote.author}
        </p>
      )}
    </section>
  );
}
