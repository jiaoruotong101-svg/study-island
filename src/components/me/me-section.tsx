"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { motion } from "framer-motion";
import {
  Sun,
  Moon,
  Monitor,
  Timer,
  BookX,
  CalendarCheck,
  Flame,
  ChevronRight,
  Heart,
  LogOut,
  Repeat,
  Copy,
  Check,
} from "lucide-react";
import { useTheme } from "next-themes";
import { GlassCard } from "@/components/ui/glass-card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useAuthStore } from "@/store/auth-store";
import { useUserStore } from "@/store/user-store";
import { useNavStore } from "@/store/nav-store";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import type { StatsData } from "@/lib/stats-types";

/**
 * 「我的」板块 —— 个人中心。
 *
 * 身份切换已改为账号体系：
 *   - 退出登录 → 回到登录页
 *   - 切换账号 = 退出当前 + 用另一账号登录（在登录页操作）
 *   - 配对码展示（姐姐视角，方便告诉妹妹）
 */
export function MeSection() {
  const account = useAuthStore((s) => s.account);
  const pair = useAuthStore((s) => s.pair);
  const logout = useAuthStore((s) => s.logout);
  const setTab = useNavStore((s) => s.setTab);
  const { toast } = useToast();

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

  if (!account) return null;

  const isSister = account.role === "sister";

  async function handleLogout() {
    await logout();
    toast({ description: "已退出小岛" });
  }

  async function handleSwitchAccount() {
    await logout();
    toast({ description: "已退出，请用另一个账号登录" });
  }

  return (
    <section aria-label="我的" className="space-y-5 sm:space-y-6">
      {/* 标题区 */}
      <header className="px-1">
        <h2 className="flex items-center gap-2 text-2xl font-semibold tracking-tight text-foreground">
          <span className="text-leaf" aria-hidden>
            {isSister ? "🌷" : "🌱"}
          </span>
          我的
        </h2>
        <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
          {isSister
            ? "姐姐的小角落，慢慢看看自己。"
            : "妹妹的小角落，今天也辛苦啦。"}
        </p>
      </header>

      {/* 身份卡 + 配对信息 */}
      <IdentityCard
        displayName={account.displayName}
        username={account.username}
        role={account.role}
        pairCode={pair?.code ?? null}
        partnerName={pair?.partner?.displayName ?? null}
        onSwitch={handleSwitchAccount}
        onLogout={handleLogout}
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
  displayName,
  username,
  role,
  pairCode,
  partnerName,
  onSwitch,
  onLogout,
}: {
  displayName: string;
  username: string;
  role: "sister" | "younger";
  pairCode: string | null;
  partnerName: string | null;
  onSwitch: () => void;
  onLogout: () => void;
}) {
  const isSister = role === "sister";
  const [copied, setCopied] = useState(false);

  async function copyCode() {
    if (!pairCode) return;
    try {
      await navigator.clipboard.writeText(pairCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  }

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
            {isSister ? "🌷" : "🌱"}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h3 className="text-xl font-semibold text-foreground">
                {displayName}
              </h3>
              <span className="rounded-full bg-leaf-soft/70 px-2.5 py-0.5 text-xs font-medium text-leaf">
                {isSister ? "陪伴者" : "高三在读"}
              </span>
            </div>
            <p className="mt-1 font-num text-xs text-muted-foreground">
              @{username}
            </p>
            {partnerName && (
              <p className="mt-0.5 text-xs text-muted-foreground">
                与「{partnerName}」同在一个小岛
              </p>
            )}
          </div>
        </div>

        {/* 配对码（姐姐视角展示，方便告诉妹妹） */}
        {isSister && pairCode && (
          <div className="mt-4 rounded-xl bg-leaf-soft/30 px-4 py-3">
            <p className="text-xs text-muted-foreground">小岛配对码</p>
            <div className="mt-1 flex items-center justify-between gap-2">
              <span className="font-num text-lg font-bold tracking-[0.2em] text-leaf">
                {pairCode}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={copyCode}
                className="h-7 gap-1 text-muted-foreground"
              >
                {copied ? (
                  <>
                    <Check className="h-3 w-3" /> 已复制
                  </>
                ) : (
                  <>
                    <Copy className="h-3 w-3" /> 复制
                  </>
                )}
              </Button>
            </div>
            <p className="mt-1 text-[11px] text-muted-foreground/80">
              把这个码告诉妹妹，她注册时填入就能加入你的小岛
            </p>
          </div>
        )}

        {/* 操作按钮 */}
        <div className="mt-4 flex gap-2">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="flex-1 text-muted-foreground hover:text-foreground"
              >
                <Repeat className="mr-1.5 h-3.5 w-3.5" />
                切换账号
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>切换到另一个账号？</AlertDialogTitle>
                <AlertDialogDescription>
                  将退出当前账号，回到登录页。请用另一个账号（姐姐或妹妹）的用户名和密钥登录。
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>再想想</AlertDialogCancel>
                <AlertDialogAction
                  onClick={(e) => {
                    e.preventDefault();
                    onSwitch();
                  }}
                  className="bg-leaf text-primary-foreground hover:bg-leaf/90"
                >
                  退出并切换
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="flex-1 text-muted-foreground hover:text-destructive"
              >
                <LogOut className="mr-1.5 h-3.5 w-3.5" />
                退出登录
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>退出小岛？</AlertDialogTitle>
                <AlertDialogDescription>
                  退出后需要重新登录才能回到小岛。你的数据都还在，不用担心。
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>留在小岛</AlertDialogCancel>
                <AlertDialogAction
                  onClick={(e) => {
                    e.preventDefault();
                    onLogout();
                  }}
                  className="bg-destructive text-white hover:bg-destructive/90"
                >
                  退出
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
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
      <h3 className="px-1 text-sm font-medium text-muted-foreground">外观</h3>
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
              className={cn(
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
          一个只属于姐姐和妹妹的小岛。不是监督，而是陪伴 ——
          姐姐一直陪着妹妹高三。慢慢来，每一分钟都算数。
        </p>
      </div>
      <div className="flex items-center justify-between px-1 text-xs text-muted-foreground">
        <span>版本</span>
        <span className="font-num">1.0.0</span>
      </div>
    </GlassCard>
  );
}
