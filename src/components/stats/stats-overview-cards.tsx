"use client";

import { motion } from "framer-motion";
import { Timer, Apple, CalendarCheck, BookX } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { GlassCard } from "@/components/ui/glass-card";
import { Skeleton } from "@/components/ui/skeleton";
import type { StatsData } from "@/lib/stats-types";

/**
 * 学习统计 —— 概览数字卡（4 张）。
 *
 * 设计哲学：
 *   - 看"坚持的轨迹"，不看排名/对比
 *   - 文案陪伴鼓励向，不催促
 *
 * 数据来自父级 StatsSection 拉取的 /api/stats 聚合对象，
 * 这里只负责展示 4 个核心累计数字 + 陪伴向小语。
 */

interface StatsOverviewCardsProps {
  data: StatsData | null;
  loading: boolean;
}

interface CardDef {
  key: string;
  icon: LucideIcon;
  label: string;
  value: number;
  unit: string;
  hint: string;
}

function buildCards(d: StatsData | null): CardDef[] {
  return [
    {
      key: "focus",
      icon: Timer,
      label: "累计专注",
      value: d?.totalFocusMinutes ?? 0,
      unit: "分钟",
      hint: "每一分钟都算数",
    },
    {
      key: "pomodoro",
      icon: Apple,
      label: "完成番茄",
      value: d?.totalPomodoros ?? 0,
      unit: "个",
      hint: "一个个，慢慢来",
    },
    {
      key: "days",
      icon: CalendarCheck,
      label: "坚持天数",
      value: d?.activeDays ?? 0,
      unit: "天",
      hint: "已经走了这么远",
    },
    {
      key: "mistakes",
      icon: BookX,
      label: "错题积累",
      value: d?.totalMistakes ?? 0,
      unit: "道",
      hint: "记下就是成长",
    },
  ];
}

export function StatsOverviewCards({ data, loading }: StatsOverviewCardsProps) {
  const cards = buildCards(data);

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
      {cards.map((card, i) => {
        const Icon = card.icon;
        return (
          <motion.div
            key={card.key}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06, duration: 0.35 }}
          >
            <GlassCard pad="sm" className="h-full">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">{card.label}</span>
                <Icon className="h-4 w-4 text-leaf" aria-hidden />
              </div>
              {loading ? (
                <Skeleton className="mt-2 h-8 w-24 rounded-md" />
              ) : (
                <div className="font-num mt-2 text-2xl font-semibold tabular-nums text-foreground sm:text-3xl">
                  {card.value}
                  <span className="ml-1 text-sm font-normal text-muted-foreground">
                    {card.unit}
                  </span>
                </div>
              )}
              <div className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
                {card.hint}
              </div>
            </GlassCard>
          </motion.div>
        );
      })}
    </div>
  );
}
