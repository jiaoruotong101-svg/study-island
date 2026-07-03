"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ListChecks, Timer, Smile, Clock } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { GlassCard } from "@/components/ui/glass-card";
import { Skeleton } from "@/components/ui/skeleton";
import type { TodayOverviewData } from "@/lib/task-types";

/**
 * 姐姐后台 —— 今日状态概览卡（4 张）。
 *
 * 数据来自 /api/today-overview（真实聚合）。
 *
 * 设计哲学：
 *   - 这是"陪伴仪表盘"，不是监控面板
 *   - 一眼看见妹妹今天的状态，是为了更好地陪伴
 *   - 文案陪伴向，禁用"监控/检查/绩效/达标"等词
 *   - 空数据时给温暖向，不用"暂无数据"
 */

interface AdminOverviewProps {
  /** 改变时重新拉取（父级刷新按钮触发） */
  refreshKey: number;
  /** 每次拉取完成（成功/失败）后回调，供父级关闭刷新按钮态 */
  onLoaded?: () => void;
}

const FALLBACK: TodayOverviewData = {
  pendingTaskCount: 0,
  completedTaskCount: 0,
  focusMinutes: 0,
  mood: null,
};

interface CardDef {
  key: string;
  icon: LucideIcon;
  label: string;
  /** 主数值（任务/心情混排，故为 string） */
  value: string;
  /** 是否纯数字（决定是否上 .font-num） */
  numeric: boolean;
  hint: string;
}

function buildCards(d: TodayOverviewData): CardDef[] {
  const total = d.completedTaskCount + d.pendingTaskCount;
  return [
    {
      key: "tasks",
      icon: ListChecks,
      label: "今日任务",
      value: `${d.completedTaskCount} / ${total}`,
      numeric: true,
      hint: "一件件来",
    },
    {
      key: "focus",
      icon: Timer,
      label: "专注分钟",
      value: `${d.focusMinutes}`,
      numeric: true,
      hint: "每一分钟都算数",
    },
    {
      key: "mood",
      icon: Smile,
      label: "今日心情",
      value: d.mood ? `${d.mood.emoji} ${d.mood.label}` : "—",
      numeric: false,
      hint: "她的感受很重要",
    },
    {
      key: "pending",
      icon: Clock,
      label: "待完成任务",
      value: `${d.pendingTaskCount}`,
      numeric: true,
      hint: "不急，慢慢来",
    },
  ];
}

export function AdminOverview({ refreshKey, onLoaded }: AdminOverviewProps) {
  const [data, setData] = useState<TodayOverviewData>(FALLBACK);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void (async () => {
      try {
        const res = await fetch("/api/today-overview", { cache: "no-store" });
        if (!res.ok) throw new Error(`加载失败（${res.status}）`);
        const json = (await res.json()) as TodayOverviewData;
        if (!cancelled) setData(json);
      } catch (err) {
        console.error("[admin-overview] load", err);
        if (!cancelled) setData(FALLBACK);
      } finally {
        if (!cancelled) setLoading(false);
        if (!cancelled) onLoaded?.();
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [refreshKey, onLoaded]);

  const cards = buildCards(data);

  return (
    <div
      className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4"
      aria-label="今日状态概览"
    >
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
                <span className="text-xs text-muted-foreground">
                  {card.label}
                </span>
                <Icon className="h-4 w-4 text-leaf" aria-hidden />
              </div>
              {loading ? (
                <Skeleton className="mt-2 h-8 w-24 rounded-md" />
              ) : (
                <div
                  className={
                    card.numeric
                      ? "font-num mt-2 text-2xl font-semibold tabular-nums text-foreground sm:text-3xl"
                      : "mt-2 text-xl font-semibold text-foreground sm:text-2xl"
                  }
                >
                  {card.value}
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
