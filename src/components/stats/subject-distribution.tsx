"use client";

import { motion } from "framer-motion";
import { ListChecks, BookX } from "lucide-react";
import { GlassCard } from "@/components/ui/glass-card";
import { Skeleton } from "@/components/ui/skeleton";
import type { SubjectStatItem } from "@/lib/stats-types";

/**
 * 学习统计 —— 近 7 天科目分布。
 *
 * - 每行：科目名 + 任务数 + 错题数（.font-num）
 * - 任务/错题用 ListChecks / BookX 图标 + 数字，柔和 pill
 * - 空数据（数组为空）显示陪伴向"这周还没记任务或错题"
 * - 加载态 Skeleton；长列表 max-h-[50vh] overflow-y-auto
 *
 * 设计：不排名、不强调谁多谁少，只展示"各科的坚持"。
 */

interface SubjectDistributionProps {
  subjectDistribution: SubjectStatItem[];
  loading: boolean;
}

export function SubjectDistribution({
  subjectDistribution,
  loading,
}: SubjectDistributionProps) {
  return (
    <GlassCard pad="md" className="space-y-4">
      <div>
        <h3 className="text-base font-semibold text-foreground">科目分布</h3>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
          各科的坚持
        </p>
      </div>

      {loading ? (
        <div className="space-y-2.5">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full rounded-xl" />
          ))}
        </div>
      ) : subjectDistribution.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-8 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-leaf-soft/60 text-2xl">
            📒
          </span>
          <p className="max-w-xs text-sm leading-relaxed text-muted-foreground">
            这周还没记任务或错题，慢慢来。
          </p>
        </div>
      ) : (
        <ul
          className="max-h-[50vh] divide-y divide-border/40 overflow-y-auto"
          aria-label="近 7 天科目分布"
        >
          {subjectDistribution.map((item, idx) => (
              <motion.li
                key={item.subject}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  duration: 0.25,
                  delay: Math.min(idx * 0.04, 0.2),
                }}
                className="flex items-center gap-3 px-1 py-3"
              >
                <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground/90">
                  {item.subject}
                </span>
                <span
                  className="inline-flex items-center gap-1 rounded-full bg-leaf-soft/40 px-2.5 py-1 text-xs text-leaf"
                  aria-label={`${item.subject} 任务 ${item.taskCount} 个`}
                >
                  <ListChecks className="h-3 w-3" aria-hidden />
                  <span className="font-num tabular-nums">{item.taskCount}</span>
                </span>
                <span
                  className="inline-flex items-center gap-1 rounded-full bg-cream/60 px-2.5 py-1 text-xs text-foreground/70 dark:bg-cream/20"
                  aria-label={`${item.subject} 错题 ${item.mistakeCount} 道`}
                >
                  <BookX className="h-3 w-3" aria-hidden />
                  <span className="font-num tabular-nums">
                    {item.mistakeCount}
                  </span>
                </span>
              </motion.li>
            ))}
        </ul>
      )}
    </GlassCard>
  );
}
