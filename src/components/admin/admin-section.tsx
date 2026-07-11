"use client";

import { useCallback, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Heart, RefreshCw, Repeat } from "lucide-react";
import { GlassCard } from "@/components/ui/glass-card";
import { Button } from "@/components/ui/button";
import { useUserStore } from "@/store/user-store";
import { AdminOverview } from "./admin-overview";
import { AdminTodayDetail } from "./admin-today-detail";
import { AdminRecentActivity } from "./admin-recent-activity";
import { AiSummaryCard } from "./ai-summary-card";

/**
 * 姐姐后台（陪伴仪表盘）—— section 容器。
 *
 * 设计哲学（最重要）：
 *   - 这是"陪伴仪表盘"，不是监控面板
 *   - 姐姐一眼看到妹妹今天的状态，是为了更好地陪伴
 *   - 文案全程陪伴向："妹妹今天的状态""陪她走过的路"
 *   - 禁用"监控/检查/绩效/达标率/落后"等词
 *   - 空数据给温暖向（"也许她想先歇会儿"），不用"暂无数据"
 *   - 不做排名、对比、警告、红黄绿信号灯
 *
 * 权限：
 *   - 仅姐姐视角可进入；妹妹视角显示温柔提示 + 引导切回姐姐
 *
 * 编排：
 *   - header（GlassCard 外）：标题 + 心形图标 + 副标题 + 刷新按钮
 *   - AdminOverview：4 张今日状态概览卡
 *   - AdminTodayDetail：今日任务 | 今日心情（双列）
 *   - AdminRecentActivity：最近错题 | 今日留言（双列）
 *
 * 状态：
 *   - refreshKey：刷新按钮 → +1 → 3 个子组件并行重拉
 *   - refreshing：3 个子组件各报 onLoaded 一次，计数归零时关闭
 *   - 用 ref 计数器避免 effect 内同步 setState 报错
 */

export function AdminSection() {
  const role = useUserStore((s) => s.currentUser.role);
  const switchRole = useUserStore((s) => s.switchRole);

  const [refreshKey, setRefreshKey] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  /** 待完成的子组件加载回调计数（每次刷新 = 3） */
  const pendingLoadsRef = useRef(0);

  const handleChildLoaded = useCallback(() => {
    pendingLoadsRef.current = Math.max(0, pendingLoadsRef.current - 1);
    if (pendingLoadsRef.current === 0) {
      setRefreshing(false);
    }
  }, []);

  const handleRefresh = useCallback(() => {
    pendingLoadsRef.current = 3; // AdminOverview + AdminTodayDetail + AdminRecentActivity
    setRefreshing(true);
    setRefreshKey((k) => k + 1);
  }, []);

  // 权限守卫：妹妹视角温柔提示
  if (role !== "sister") {
    return (
      <section
        aria-label="姐姐的后台"
        className="flex min-h-[60vh] items-center justify-center px-4 py-10"
      >
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-md"
        >
          <GlassCard pad="lg" variant="strong" sheen className="text-center">
            <div className="flex flex-col items-center gap-4 py-6">
              <span
                className="flex h-16 w-16 items-center justify-center rounded-full bg-leaf-soft/60 text-3xl"
                aria-hidden
              >
                🌿
              </span>
              <div className="space-y-1.5">
                <h2 className="text-xl font-semibold text-foreground">
                  这是姐姐的角落～
                </h2>
                <p className="mx-auto max-w-xs text-sm leading-relaxed text-muted-foreground">
                  想看看妹妹的状态？切到姐姐视角就能看到啦。
                </p>
              </div>
              <Button
                onClick={() => switchRole("sister")}
                className="mt-2 gap-1.5 bg-leaf text-primary-foreground hover:bg-leaf/90"
              >
                <Repeat className="h-4 w-4" />
                切到姐姐看看
              </Button>
            </div>
          </GlassCard>
        </motion.div>
      </section>
    );
  }

  return (
    <section aria-label="姐姐的后台" className="space-y-5 sm:space-y-6">
      {/* 标题区 —— GlassCard 外 */}
      <header className="flex items-end justify-between gap-3 px-1">
        <div className="min-w-0">
          <h2 className="flex items-center gap-2 text-2xl font-semibold tracking-tight text-foreground">
            <Heart className="h-6 w-6 text-leaf" aria-hidden />
            姐姐的后台
          </h2>
          <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
            看看妹妹今天的状态~
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleRefresh}
          disabled={refreshing}
          className="shrink-0 text-muted-foreground"
          aria-label="刷新姐姐的后台"
        >
          <RefreshCw
            className={refreshing ? "h-3.5 w-3.5 animate-spin" : "h-3.5 w-3.5"}
          />
          刷新
        </Button>
      </header>

      {/* 概览 4 卡 */}
      <AdminOverview refreshKey={refreshKey} onLoaded={handleChildLoaded} />

      {/* 今日详情：任务 | 心情 */}
      <AdminTodayDetail
        refreshKey={refreshKey}
        onLoaded={handleChildLoaded}
      />

      {/* 最近活动：错题 | 留言 */}
      <AdminRecentActivity
        refreshKey={refreshKey}
        onLoaded={handleChildLoaded}
      />

      {/* AI 陪伴总结（仅姐姐视角渲染） */}
      <AiSummaryCard isSister={role === "sister"} />

      {/* 底部陪伴向结语 */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="px-1 pt-2 text-center text-sm italic leading-relaxed text-muted-foreground"
      >
        她今天也在努力着。
      </motion.p>
    </section>
  );
}
