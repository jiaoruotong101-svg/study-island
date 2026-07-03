"use client";

import { useCallback, useState } from "react";
import { Heart, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useUserStore } from "@/store/user-store";
import { MoodPicker } from "./mood-picker";
import { MoodTimeline } from "./mood-timeline";
import type { CreatorRole } from "@/lib/mood-types";

/**
 * 心情记录板块 —— section 容器。
 *
 * 职责：
 *   - 顶部 header（GlassCard 外）：标题 + 心形图标 + 视角化副标题 + 刷新按钮
 *   - MoodPicker（GlassCard）：心情选择 + 备注 + 提交
 *   - MoodTimeline（GlassCard）：今日心情时间线
 *   - 维护 refreshKey state：picker 提交成功 / 点刷新 → +1 → timeline 重新拉取
 *
 * 设计：
 *   - 治愈配色奶白/浅绿/浅灰，文案陪伴鼓励向，不催促
 *   - framer-motion 轻柔动画（picker 展开、timeline 入场）
 *   - 响应式：手机/桌面
 */

export function MoodSection() {
  const role = useUserStore((s) => s.currentUser.role) as CreatorRole;
  const [refreshKey, setRefreshKey] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  const handleRecorded = useCallback(() => {
    setRefreshKey((k) => k + 1);
  }, []);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    setRefreshKey((k) => k + 1);
  }, []);

  const handleLoaded = useCallback(() => {
    setRefreshing(false);
  }, []);

  const subtitle =
    role === "sister"
      ? "看看妹妹今天的心情，不强求，她愿意说就说。"
      : "今天感觉怎么样？记下来，慢慢懂自己。";

  return (
    <section aria-label="心情记录" className="space-y-6">
      {/* 标题区 —— GlassCard 外 */}
      <header className="flex items-end justify-between gap-3 px-1">
        <div className="min-w-0">
          <h2 className="flex items-center gap-2 text-2xl font-semibold tracking-tight text-foreground">
            <Heart className="h-6 w-6 text-leaf" aria-hidden />
            心情记录
          </h2>
          <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
            {subtitle}
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleRefresh}
          disabled={refreshing}
          className="shrink-0 text-muted-foreground"
          aria-label="刷新今日心情"
        >
          <RefreshCw
            className={refreshing ? "h-3.5 w-3.5 animate-spin" : "h-3.5 w-3.5"}
          />
          刷新
        </Button>
      </header>

      {/* 心情选择器 */}
      <MoodPicker role={role} onRecorded={handleRecorded} />

      {/* 今日时间线 */}
      <MoodTimeline
        role={role}
        refreshKey={refreshKey}
        onLoaded={handleLoaded}
      />
    </section>
  );
}
