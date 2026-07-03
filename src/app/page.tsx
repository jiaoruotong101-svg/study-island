"use client";

import { motion } from "framer-motion";
import { RoleSwitcher } from "@/components/home/role-switcher";
import { TodayOverview } from "@/components/home/today-overview";
import { CompanionQuote } from "@/components/home/companion-quote";
import { QuickEntryGrid } from "@/components/home/quick-entry-grid";
import { useUserStore } from "@/store/user-store";

export default function HomePage() {
  const role = useUserStore((s) => s.currentUser.role);

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* 顶部欢迎语 —— 根据当前身份微调文案 */}
      <motion.section
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="px-1"
      >
        <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
          {role === "sister" ? "姐姐，来看看妹妹今天" : "欢迎回到小岛"}
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          {role === "sister"
            ? "不用催促，慢慢看就好 —— 她今天也在努力着。"
            : "今天不用赶，把想做的事一件件做完就好。"}
        </p>
      </motion.section>

      <CompanionQuote />

      <TodayOverview />

      <RoleSwitcher />

      <QuickEntryGrid />

      {/* 页脚留白，避免被底部 nav 遮挡 */}
      <div className="h-2" aria-hidden />
    </div>
  );
}
