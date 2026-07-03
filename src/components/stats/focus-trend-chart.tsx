"use client";

import {
  Bar,
  BarChart,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { GlassCard } from "@/components/ui/glass-card";
import { Skeleton } from "@/components/ui/skeleton";
import type { DailyFocusStat } from "@/lib/stats-types";

/**
 * 学习统计 —— 近 7 天专注趋势柱状图。
 *
 * - recharts BarChart，X 轴 周一~周日，Y 轴 focusMinutes
 * - 普通柱 leaf #7aa881，今日柱 深 leaf #5f9a6c
 * - 自定义 Tooltip："周X · 专注 N 分钟 · X 个番茄"
 * - 全 0 时显示陪伴向空态"这周还没开始专注，不急"
 * - 加载态 Skeleton；固定 240px 高度容器避免 0 高度
 */

interface FocusTrendChartProps {
  dailyFocus: DailyFocusStat[];
  loading: boolean;
}

const LEAF = "#7aa881";
const LEAF_DEEP = "#5f9a6c";

/** 今日 "YYYY-MM-DD"（本地时区） */
function todayStr(): string {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

interface TooltipProps {
  active?: boolean;
  payload?: Array<{ payload: DailyFocusStat }>;
}

function FocusTooltip({ active, payload }: TooltipProps) {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  if (!d) return null;
  return (
    <div className="rounded-xl border border-leaf/20 bg-card/95 px-3 py-2 text-xs shadow-md backdrop-blur">
      <div className="font-medium text-foreground">{d.label}</div>
      <div className="mt-1 text-muted-foreground">
        专注{" "}
        <span className="font-num tabular-nums text-foreground">
          {d.focusMinutes}
        </span>{" "}
        分钟
      </div>
      {d.pomodoroCount > 0 && (
        <div className="text-muted-foreground">
          <span className="font-num tabular-nums text-foreground">
            {d.pomodoroCount}
          </span>{" "}
          个番茄
        </div>
      )}
    </div>
  );
}

export function FocusTrendChart({ dailyFocus, loading }: FocusTrendChartProps) {
  const today = todayStr();
  const allZero =
    dailyFocus.length === 0 || dailyFocus.every((d) => d.focusMinutes === 0);

  return (
    <GlassCard pad="md" className="space-y-4">
      <div>
        <h3 className="text-base font-semibold text-foreground">近 7 天专注</h3>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
          每根柱子都是一段坚持
        </p>
      </div>

      {loading ? (
        <Skeleton className="h-[240px] w-full rounded-xl" />
      ) : allZero ? (
        <div className="flex h-[240px] flex-col items-center justify-center gap-3 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-leaf-soft/60 text-2xl">
            🌱
          </span>
          <p className="max-w-xs text-sm leading-relaxed text-muted-foreground">
            这周还没开始专注，不急。
          </p>
        </div>
      ) : (
        <div
          className="h-[240px] w-full [&_.recharts-cartesian-axis-tick_text]:fill-muted-foreground"
          role="img"
          aria-label="近 7 天每日专注分钟柱状图"
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={dailyFocus}
              margin={{ top: 8, right: 8, left: -12, bottom: 0 }}
            >
              <XAxis
                dataKey="label"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12 }}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12 }}
                width={36}
                allowDecimals={false}
              />
              <Tooltip
                cursor={{ fill: "rgba(122,168,129,0.10)" }}
                content={<FocusTooltip />}
              />
              <Bar dataKey="focusMinutes" radius={[6, 6, 0, 0]} maxBarSize={36}>
                {dailyFocus.map((d) => (
                  <Cell
                    key={d.date}
                    fill={d.date === today ? LEAF_DEEP : LEAF}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </GlassCard>
  );
}
