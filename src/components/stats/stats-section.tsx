"use client";

import { useCallback, useEffect, useState } from "react";
import { BarChart3, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useUserStore } from "@/store/user-store";
import type { StatsData } from "@/lib/stats-types";
import { StatsOverviewCards } from "./stats-overview-cards";
import { FocusTrendChart } from "./focus-trend-chart";
import { MoodDistribution } from "./mood-distribution";
import { SubjectDistribution } from "./subject-distribution";

/**
 * 学习统计板块 —— section 容器。
 *
 * 编排：
 *   - header（GlassCard 外）：BarChart3 图标 + "学习统计"标题 + 视角化副标题 + 刷新按钮
 *   - StatsOverviewCards：4 张累计数字卡（专注分钟 / 番茄 / 坚持天数 / 错题）
 *   - FocusTrendChart：近 7 天专注柱状图（全宽）
 *   - 两列网格：MoodDistribution | SubjectDistribution（移动端单列堆叠）
 *
 * 状态：
 *   - 一次 fetch /api/stats，持有完整 StatsData，按 slice 传给子组件
 *   - refreshKey：刷新按钮 → +1 → 重新 fetch
 *   - loading：传给子组件展示各自 Skeleton
 *   - error：顶部条带提示
 *
 * 设计哲学：看"坚持的轨迹"，不排名不催促，文案陪伴鼓励向。
 */

export function StatsSection() {
  const role = useUserStore((s) => s.currentUser.role);
  const [data, setData] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void (async () => {
      try {
        const res = await fetch("/api/stats", { cache: "no-store" });
        if (!res.ok) throw new Error(`加载失败（${res.status}）`);
        const json = (await res.json()) as StatsData;
        if (!cancelled) {
          setData(json);
          setError(null);
        }
      } catch (err) {
        console.error("[stats] load", err);
        if (!cancelled) setError("统计暂时打不开，稍等一下再试");
      } finally {
        if (!cancelled) setLoading(false);
        if (!cancelled) setRefreshing(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    setRefreshKey((k) => k + 1);
  }, []);

  const subtitle =
    role === "sister"
      ? "陪她走过的这段路"
      : "看看这段时间的坚持，每一分钟都算数";

  return (
    <section aria-label="学习统计" className="space-y-5 sm:space-y-6">
      {/* 标题区 —— GlassCard 外 */}
      <header className="flex items-end justify-between gap-3 px-1">
        <div className="min-w-0">
          <h2 className="flex items-center gap-2 text-2xl font-semibold tracking-tight text-foreground">
            <BarChart3 className="h-6 w-6 text-leaf" aria-hidden />
            学习统计
          </h2>
          <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
            {subtitle}
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleRefresh}
          disabled={refreshing || loading}
          className="shrink-0 text-muted-foreground"
          aria-label="刷新学习统计"
        >
          <RefreshCw
            className={refreshing ? "h-3.5 w-3.5 animate-spin" : "h-3.5 w-3.5"}
          />
          刷新
        </Button>
      </header>

      {/* 错误条 */}
      {error && (
        <div
          role="alert"
          className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive"
        >
          {error}
        </div>
      )}

      {/* 概览数字卡 */}
      <StatsOverviewCards data={data} loading={loading} />

      {/* 近 7 天专注趋势（全宽） */}
      <FocusTrendChart
        dailyFocus={data?.dailyFocus ?? []}
        loading={loading}
      />

      {/* 两列：心情分布 | 科目分布（移动端单列堆叠） */}
      <div className="grid grid-cols-1 gap-5 sm:gap-6 lg:grid-cols-2">
        <MoodDistribution
          moodDistribution={data?.moodDistribution ?? []}
          loading={loading}
        />
        <SubjectDistribution
          subjectDistribution={data?.subjectDistribution ?? []}
          loading={loading}
        />
      </div>
    </section>
  );
}
