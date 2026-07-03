"use client";

import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { RoleSwitcher } from "@/components/home/role-switcher";
import { TodayOverview } from "@/components/home/today-overview";
import { CompanionQuote } from "@/components/home/companion-quote";
import { QuickEntryGrid } from "@/components/home/quick-entry-grid";
import { GreetingEditor } from "@/components/home/greeting-editor";
import { useUserStore } from "@/store/user-store";
import { getChatSocket } from "@/lib/chat-socket";
import type { HomeGreeting } from "@/lib/greeting-types";

/**
 * 首页 section。
 *
 * 顶部问候（大标题 + 副标题）：
 *   - 姐姐视角下可自由编辑（GreetingEditor 仅姐姐渲染）
 *   - 两人共享同一条问候，无问候时回退到角色默认文案
 *   - 通过 socket greeting:updated 实时同步
 */
const DEFAULT_GREETING: Record<"sister" | "younger", { heading: string; subtitle: string }> = {
  sister: {
    heading: "姐姐，来看看妹妹今天",
    subtitle: "不用催促，慢慢看就好 —— 她今天也在努力着。",
  },
  younger: {
    heading: "欢迎回到小岛",
    subtitle: "今天不用赶，把想做的事一件件做完就好。",
  },
};

export function HomeSection() {
  const role = useUserStore((s) => s.currentUser.role);
  const [greeting, setGreeting] = useState<HomeGreeting | null>(null);

  // 拉取当前问候（挂载时一次；cancelled flag 避免 unmount 后 setState）
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/greeting", { cache: "no-store" });
        const data = (await res.json()) as { greeting: HomeGreeting | null };
        if (!cancelled) setGreeting(data.greeting ?? null);
      } catch {
        /* 静默回退默认 */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // 监听 socket 实时同步
  useEffect(() => {
    const socket = getChatSocket();
    const handler = (payload: unknown) => {
      if (payload && typeof payload === "object" && "id" in payload) {
        setGreeting(payload as HomeGreeting);
      }
    };
    socket.on("greeting:updated", handler);
    return () => {
      socket.off("greeting:updated", handler);
    };
  }, []);

  const handleGreetingSaved = useCallback((g: HomeGreeting) => {
    setGreeting(g);
    // 广播给其他端（自己幂等）
    getChatSocket().emit("greeting:update", g);
  }, []);

  // 显示文案：有自定义问候用自定义，否则用角色默认
  const fallback = DEFAULT_GREETING[role];
  const heading = greeting?.heading ?? fallback.heading;
  const subtitle = greeting?.subtitle ?? fallback.subtitle;

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* 顶部问候区 —— 姐姐视角可编辑 */}
      <motion.section
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="px-1"
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
              {heading}
            </h1>
            {subtitle && (
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {subtitle}
              </p>
            )}
            {/* 自定义问候标注作者视角 */}
            {greeting && (
              <div className="mt-2 flex items-center gap-2">
                <span className="rounded-full bg-background/60 px-2.5 py-0.5 text-xs font-medium text-leaf">
                  {greeting.authorRole === "sister" ? "姐姐" : "妹妹"} 留
                </span>
              </div>
            )}
          </div>
          {/* 编辑入口：仅姐姐视角渲染（组件内部判断 role） */}
          <GreetingEditor current={greeting} onSaved={handleGreetingSaved} />
        </div>
      </motion.section>

      <CompanionQuote />

      <TodayOverview />

      <RoleSwitcher />

      <QuickEntryGrid />

      <div className="h-2" aria-hidden />
    </div>
  );
}
