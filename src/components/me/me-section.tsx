"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { motion } from "framer-motion";
import {
  User,
  Repeat,
  Sun,
  Moon,
  Monitor,
  Timer,
  BookX,
  CalendarCheck,
  Flame,
  ChevronRight,
  Heart,
} from "lucide-react";
import { useTheme } from "next-themes";
import { GlassCard } from "@/components/ui/glass-card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useUserStore } from "@/store/user-store";
import { useNavStore } from "@/store/nav-store";
import type { StatsData } from "@/lib/stats-types";

/**
 * 「我的」板块 —— 个人中心。
 *
 * 区别于姐姐后台（姐姐看妹妹），「我的」是自己看自己：
 *   - 身份卡：当前身份 + 一键切换
 *   - 我的概况：累计专注/番茄/坚持天数/错题（复用 /api/stats）
 *   - 外观设置：浅色/深色/跟随系统
 *   - 小岛设置：番茄钟时长快捷入口（跳转任务 section）
 *   - 关于小岛：产品理念 + 版本
 */
export function MeSection() {
  const currentUser = useUserStore((s) => s.currentUser);
  const switchRole = useUserStore((s) => s.switchRole);
  const setTab = useNavStore((s) => s.setTab);

  const [stats, setStats] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const cancelledRef = useRef(false);

  useEffect(() => {
    cancelledRef.current = false;
    void (async () => {
      try {
        const res = await fetch("/api/stats", { cache: "no-store" });
        if (!res.ok) return;
        const data = (await res.json()) as StatsData;
        if (!cancelledRef.current) setStats(data);
      } catch {
        /* 静默 */
      } finally {
        if (!cancelledRef.current) setLoading(false);
      }
    })();
    return () => {
      cancelledRef.current = true;
    };
  }, []);

  const isSister = currentUser.role === "sister";
  const otherRole = isSister ? "younger" : "sister";

  return (
    <section aria-label="我的" className="space-y-5 sm:space-y-6">
      {/* 标题区 */}
      <header className="px-1">
        <h2 className="flex items-center gap-2 text-2xl font-semibold tracking-tight text-foreground">
          <User className="h-6 w-6 text-leaf" aria-hidden />
          我的
        </h2>
        <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
          {isSister
            ? "姐姐的小角落，慢慢看看自己。"
            : "妹妹的小角落，今天也辛苦啦。"}
        </p>
      </header>

      {/* 身份卡 */}
      <IdentityCard
        name={currentUser.name}
        role={currentUser.role}
        onSwitch={() => switchRole(otherRole)}
      />

      {/* 我的概况 */}
      <MyOverview stats={stats} loading={loading} />

      {/* 外观设置 */}
      <AppearanceCard />

      {/* 小岛设置（快捷入口） */}
      <GlassCard pad="md" className="space-y-1">
        <h3 className="px-1 text-sm font-medium text-muted-foreground">
          小岛设置
        </h3>
        <button
          type="button"
          onClick={() => setTab("tasks")}
          className="flex w-full items-center justify-between rounded-xl px-3 py-3 text-left transition-colors hover:bg-muted/40"
        >
          <span className="flex items-center gap-3">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-leaf-soft/60 text-leaf">
              <Timer className="h-4 w-4" />
            </span>
            <span>
              <span className="block text-sm font-medium text-foreground">
                番茄钟时长
              </span>
              <span className="block text-xs text-muted-foreground">
                在任务板块里调整专注和休息的节奏
              </span>
            </span>
          </span>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </button>
      </GlassCard>

      {/* 关于小岛 */}
      <AboutCard />

      <div className="h-2" aria-hidden />
    </section>
  );
}

/* ---------------------------- 身份卡 ---------------------------- */

function IdentityCard({
  name,
  role,
  onSwitch,
}: {
  name: string;
  role: "sister" | "younger";
  onSwitch: () => void;
}) {
  const isSister = role === "sister";
  const emoji = isSister ? "🌷" : "🌱";
  const desc = isSister ? "陪妹妹走过高三这一年" : "高三在读，慢慢来";

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
    >
      <GlassCard variant="strong" sheen pad="lg">
        <div className="flex items-center gap-4">
          <span
            className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-leaf-soft/60 text-3xl"
            aria-hidden
          >
            {emoji}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h3 className="text-xl font-semibold text-foreground">{name}</h3>
              <span className="rounded-full bg-leaf-soft/70 px-2.5 py-0.5 text-xs font-medium text-leaf">
                {isSister ? "陪伴者" : "高三在读"}
              </span>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">{desc}</p>
          </div>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onSwitch}
          className="mt-4 w-full text-muted-foreground hover:text-foreground"
        >
          <Repeat className="mr-1.5 h-3.5 w-3.5" />
          切到{isSister ? "妹妹" : "姐姐"}视角
        </Button>
      </GlassCard>
    </motion.div>
  );
}

/* ---------------------------- 我的概况 ---------------------------- */

function MyOverview({
  stats,
  loading,
}: {
  stats: StatsData | null;
  loading: boolean;
}) {
  const cards = [
    {
      key: "focus",
      icon: Timer,
      label: "累计专注",
      value: stats ? `${stats.totalFocusMinutes}` : "—",
      unit: "分钟",
      hint: "每一分钟都算数",
    },
    {
      key: "pomodoro",
      icon: Flame,
      label: "完成番茄",
      value: stats ? `${stats.totalPomodoros}` : "—",
      unit: "个",
      hint: "一个个，慢慢来",
    },
    {
      key: "days",
      icon: CalendarCheck,
      label: "坚持天数",
      value: stats ? `${stats.activeDays}` : "—",
      unit: "天",
      hint: "已经走了这么远",
    },
    {
      key: "mistakes",
      icon: BookX,
      label: "错题积累",
      value: stats ? `${stats.totalMistakes}` : "—",
      unit: "道",
      hint: "记下就是成长",
    },
  ];

  return (
    <section aria-label="我的概况" className="space-y-3">
      <h3 className="px-1 text-sm font-medium text-muted-foreground">
        我的概况
      </h3>
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
              {loading ? (
                <Skeleton className="mt-2 h-8 w-16" />
              ) : (
                <div className="mt-2 flex items-baseline gap-1">
                  <span className="font-num text-2xl font-semibold text-foreground">
                    {card.value}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {card.unit}
                  </span>
                </div>
              )}
              <div className="mt-1 text-xs text-muted-foreground">
                {card.hint}
              </div>
            </GlassCard>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

/* ---------------------------- 外观设置 ---------------------------- */

function AppearanceCard() {
  const { theme, setTheme } = useTheme();
  // next-themes 在客户端挂载后才有 theme；用 useSyncExternalStore 做"已挂载"检测，
  // 避免 effect 内同步 setState 的 lint 报错与 hydration mismatch。
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  const options: {
    key: string;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    value: string;
  }[] = [
    { key: "light", label: "浅色", icon: Sun, value: "light" },
    { key: "dark", label: "深色", icon: Moon, value: "dark" },
    { key: "system", label: "跟随系统", icon: Monitor, value: "system" },
  ];

  return (
    <GlassCard pad="md" className="space-y-3">
      <h3 className="px-1 text-sm font-medium text-muted-foreground">
        外观
      </h3>
      <div className="grid grid-cols-3 gap-2">
        {options.map((opt) => {
          const active = mounted && theme === opt.value;
          const Icon = opt.icon;
          return (
            <button
              key={opt.key}
              type="button"
              onClick={() => setTheme(opt.value)}
              aria-pressed={active}
              disabled={!mounted}
              className={cnTheme(
                "flex flex-col items-center gap-1.5 rounded-xl border px-2 py-3 text-xs transition-colors",
                active
                  ? "border-leaf bg-leaf-soft text-leaf"
                  : "border-border bg-background/40 text-muted-foreground hover:border-leaf/40",
              )}
            >
              <Icon className="h-4 w-4" />
              <span>{opt.label}</span>
            </button>
          );
        })}
      </div>
    </GlassCard>
  );
}

// 轻量 cn（避免重复 import；与 utils.tsx 的 cn 等价）
function cnTheme(...inputs: (string | false | undefined)[]): string {
  return inputs.filter(Boolean).join(" ");
}

/* ---------------------------- 关于小岛 ---------------------------- */

function AboutCard() {
  return (
    <GlassCard pad="md" className="space-y-3">
      <h3 className="px-1 text-sm font-medium text-muted-foreground">
        关于小岛
      </h3>
      <div className="rounded-xl bg-leaf-soft/30 px-4 py-4">
        <p className="flex items-center gap-2 text-sm font-medium text-foreground">
          <Heart className="h-4 w-4 text-leaf" aria-hidden />
          学习小岛
        </p>
        <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
          一个只属于姐姐和妹妹的小岛。
          不是监督，而是陪伴 —— 姐姐一直陪着妹妹高三。
          慢慢来，每一分钟都算数。
        </p>
      </div>
      <div className="flex items-center justify-between px-1 text-xs text-muted-foreground">
        <span>版本</span>
        <span className="font-num">1.0.0</span>
      </div>
    </GlassCard>
  );
}
