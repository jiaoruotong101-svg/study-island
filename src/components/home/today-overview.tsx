"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { ListChecks, Timer, Smile } from "lucide-react";
import { useUserStore } from "@/store/user-store";
import { GlassCard } from "@/components/ui/glass-card";
import type { TodayOverviewData } from "@/lib/task-types";

/**
 * 今日概览。
 *
 * 数据来自 /api/today-overview（真实聚合）。
 * 心情卡片暂用占位（心情记录为后续 Sprint）。
 */
const FALLBACK: TodayOverviewData = {
  pendingTaskCount: 0,
  completedTaskCount: 0,
  focusMinutes: 0,
};

export function TodayOverview() {
  const role = useUserStore((s) => s.currentUser.role);
  const [data, setData] = useState<TodayOverviewData>(FALLBACK);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/today-overview", { cache: "no-store" })
      .then((r) => r.json())
      .then((d: TodayOverviewData) => {
        if (!cancelled) setData(d);
      })
      .catch(() => {
        /* 静默回退 */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const cards = [
    {
      key: "completed",
      icon: ListChecks,
      label: "今日已完成",
      value: `${data.completedTaskCount} / ${data.completedTaskCount + data.pendingTaskCount}`,
      hint: role === "sister" ? "妹妹今天很稳" : "已经完成不少啦",
    },
    {
      key: "pending",
      icon: ListChecks,
      label: "待完成",
      value: `${data.pendingTaskCount}`,
      hint: role === "sister" ? "慢慢来就好" : "一件一件来，不急",
    },
    {
      key: "focus",
      icon: Timer,
      label: "专注分钟",
      value: `${data.focusMinutes}`,
      hint: "每一分钟都算数",
    },
    {
      key: "mood",
      icon: Smile,
      label: "当前心情",
      value: "—",
      hint: "即将上线",
    },
  ];

  return (
    <section aria-label="今日概览" className="space-y-3">
      <h2 className="px-1 text-sm font-medium text-muted-foreground">
        今日概览
      </h2>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
        {cards.map((card, i) => (
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
                <card.icon className="h-4 w-4 text-leaf" />
              </div>
              <div className="font-num mt-2 text-2xl font-semibold text-foreground">
                {card.value}
              </div>
              <div className="mt-1 text-xs text-muted-foreground">{card.hint}</div>
            </GlassCard>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
