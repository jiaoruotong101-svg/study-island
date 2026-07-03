"use client";

import { motion } from "framer-motion";
import { Users } from "lucide-react";
import { useUserStore } from "@/store/user-store";
import type { Role } from "@/lib/types";
import { cn } from "@/lib/utils";
import { GlassCard } from "@/components/ui/glass-card";

/**
 * 身份切换器。
 *
 * 仅两人使用：姐姐 / 妹妹。
 * 切换后整个产品视角会随之变化（后续 Sprint 体现）。
 * Sprint 1 先做切换交互本身。
 */
const ROLES: { value: Role; label: string; hint: string }[] = [
  { value: "younger", label: "妹妹", hint: "高三在读" },
  { value: "sister", label: "姐姐", hint: "陪伴者" },
];

export function RoleSwitcher() {
  const currentUser = useUserStore((s) => s.currentUser);
  const switchRole = useUserStore((s) => s.switchRole);

  return (
    <section aria-label="身份切换">
     <GlassCard pad="md">
      <div className="mb-4 flex items-center gap-2 text-sm text-muted-foreground">
        <Users className="h-4 w-4" />
        <span>现在是</span>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {ROLES.map((role) => {
          const active = currentUser.role === role.value;
          return (
            <button
              key={role.value}
              type="button"
              onClick={() => switchRole(role.value)}
              aria-pressed={active}
              className={cn(
                "relative overflow-hidden rounded-xl border px-4 py-4 text-left transition-colors",
                active
                  ? "border-leaf bg-leaf-soft"
                  : "border-border bg-background hover:border-leaf/50 hover:bg-muted/40",
              )}
            >
              <div className="flex items-center justify-between">
                <div>
                  <div
                    className={cn(
                      "text-base font-semibold",
                      active ? "text-leaf" : "text-foreground",
                    )}
                  >
                    {role.label}
                  </div>
                  <div className="mt-0.5 text-xs text-muted-foreground">
                    {role.hint}
                  </div>
                </div>
                {active && (
                  <motion.span
                    layoutId="role-active-dot"
                    className="h-2.5 w-2.5 rounded-full bg-leaf"
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                )}
              </div>
            </button>
          );
        })}
      </div>
      <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
        · 这是一个只属于你们两个人的小岛，可以随时切换视角看看彼此
      </p>
     </GlassCard>
    </section>
  );
}
