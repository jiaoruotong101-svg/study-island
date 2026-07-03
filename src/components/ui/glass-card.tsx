"use client";

import { cn } from "@/lib/utils";

/**
 * 玻璃质感卡片。
 *
 * 参考 rdev/liquid-glass-react 的视觉语言：
 * - 半透明 + backdrop-blur 形成磨砂玻璃
 * - 顶部高光边（inset shadow）模拟玻璃折射
 * - 可选 glass-sheen 斜向高光，增强"液态"感
 *
 * 色系仍为奶白/浅绿，仅靠透明度与高光营造质地，
 * 不引入任何蓝/紫/渐变色块。
 */
type GlassVariant = "default" | "strong";

interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: GlassVariant;
  /** 是否叠加液态高光斜线 */
  sheen?: boolean;
  /** 内边距档位 */
  pad?: "sm" | "md" | "lg" | "none";
}

const PAD_MAP: Record<NonNullable<GlassCardProps["pad"]>, string> = {
  none: "",
  sm: "p-4",
  md: "p-5 sm:p-6",
  lg: "p-6 sm:p-8",
};

export function GlassCard({
  variant = "default",
  sheen = false,
  pad = "md",
  className,
  children,
  ...rest
}: GlassCardProps) {
  return (
    <div
      className={cn(
        "relative rounded-2xl",
        variant === "strong" ? "glass-strong" : "glass",
        sheen && "glass-sheen",
        PAD_MAP[pad],
        className,
      )}
      {...rest}
    >
      {sheen && <span className="relative z-[2] h-full">{children}</span>}
      {!sheen && children}
    </div>
  );
}
