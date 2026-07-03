"use client";

import { motion } from "framer-motion";
import { ListChecks, Timer, Smile } from "lucide-react";
import type { TodayOverview } from "@/lib/types";
import { useUserStore } from "@/store/user-store";
import { GlassCard } from "@/components/ui/glass-card";

/**
 * 今日概览。
 *
 * Sprint 1 先用初始化演示数据（产品定位允许的"初始化演示数据"例外），
 * 后续 Sprint 接入真实数据库后替换为接口数据，组件结构不变。
 */
const DEMO_OVERVIEW: TodayOverview = {
  pendingTaskCount: 4,
  completedTaskCount: 2,
  focusMinutes: 75,
  mood: "平静",
};

export function TodayOverview() {
  const role = useUserStore((s) => s.currentUser.role);
  const data = DEMO_OVERVIEW;

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
      value: data.mood ?? "—",
      hint: "今天感觉怎么样",
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
