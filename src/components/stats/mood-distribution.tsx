"use client";

import { motion } from "framer-motion";
import { GlassCard } from "@/components/ui/glass-card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { MoodStatItem } from "@/lib/stats-types";

/**
 * 学习统计 —— 近 7 天心情分布。
 *
 * - 不用 PieChart（避免色块太多显乱），改用横向列表 + 占比条
 * - 每项：emoji + label + 次数（.font-num）+ 治愈浅色占比条
 * - 占比条宽度 = 当前心情次数 / 近 7 天心情总次数
 * - 空数据（数组为空）显示陪伴向"这周还没记心情"
 * - 加载态 Skeleton；色彩沿用 MOOD_OPTIONS 浅色系（leaf/amber/stone/slate/sky）
 */

interface MoodDistributionProps {
  moodDistribution: MoodStatItem[];
  loading: boolean;
}

/** 各心情的占比条填充色（治愈浅色，与 MOOD_OPTIONS 一致） */
const MOOD_BAR: Record<string, string> = {
  calm: "bg-leaf",
  happy: "bg-amber-300",
  tired: "bg-stone-300",
  anxious: "bg-slate-300",
  sad: "bg-sky-200",
};

const FALLBACK_BAR = "bg-leaf-soft";

export function MoodDistribution({
  moodDistribution,
  loading,
}: MoodDistributionProps) {
  const total = moodDistribution.reduce((s, x) => s + x.count, 0);

  return (
    <GlassCard pad="md" className="space-y-4">
      <div>
        <h3 className="text-base font-semibold text-foreground">心情分布</h3>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
          慢慢懂自己
        </p>
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full rounded-xl" />
          ))}
        </div>
      ) : moodDistribution.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-8 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-leaf-soft/60 text-2xl">
            🌿
          </span>
          <p className="max-w-xs text-sm leading-relaxed text-muted-foreground">
            这周还没记心情，慢慢来。
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {moodDistribution.map((item, idx) => {
            const ratio = total > 0 ? (item.count / total) * 100 : 0;
            const barColor = MOOD_BAR[item.mood] ?? FALLBACK_BAR;
            return (
              <motion.li
                key={item.mood}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  duration: 0.25,
                  delay: Math.min(idx * 0.04, 0.2),
                }}
              >
                <div className="flex items-center gap-3">
                  <span
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-background/70 text-lg"
                    aria-hidden
                  >
                    {item.emoji}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="truncate text-sm text-foreground/90">
                        {item.label}
                      </span>
                      <span className="font-num shrink-0 text-sm tabular-nums text-muted-foreground">
                        {item.count}
                        <span className="ml-0.5 text-xs">次</span>
                      </span>
                    </div>
                    <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                      <div
                        className={cn("h-full rounded-full", barColor)}
                        style={{ width: `${ratio}%` }}
                      />
                    </div>
                  </div>
                </div>
              </motion.li>
            );
          })}
        </ul>
      )}
    </GlassCard>
  );
}
