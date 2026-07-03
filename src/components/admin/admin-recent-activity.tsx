"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Sparkles, MessageSquare, Mic2, ImageIcon, Clock } from "lucide-react";
import { GlassCard } from "@/components/ui/glass-card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type {
  CreatorRole,
  MistakeRecord,
  MistakeType,
} from "@/components/mistakes/mistake-card";
import type { DailyNote } from "@/lib/note-types";

/**
 * 姐姐后台 —— 最近活动（错题 + 留言）。
 *
 * 编排：
 *   - 两子区块（移动端堆叠，桌面端双列）
 *   - 最近错题：GET /api/mistakes（全部，按 createdAt desc），取前 3 条
 *     每条：缩略图（image 用 img / voice 用 🎤 图标）+ 科目 Badge + 备注（截断）+ 相对时间
 *     只读，姐姐只看不改
 *     空态："还没有错题记录"
 *   - 今日留言：GET /api/notes?date=today（全部）
 *     每条：作者标签（姐姐/妹妹）+ 内容（截断 60 字）+ 时间
 *     空态："今天还没有留言"
 *
 * 状态：
 *   - Promise.allSettled 并行两请求，统一 loading + 单次 onLoaded
 *   - cancelled-flag 模式满足 lint + 卸载安全
 *
 * 设计哲学：了解而非监督，文案陪伴不催促。
 */

interface AdminRecentActivityProps {
  refreshKey: number;
  onLoaded?: () => void;
}

/** 今日日期串 YYYY-MM-DD（本地时区） */
function todayStr(): string {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

/** 相对时间 —— 中文，不依赖外部库 */
function relativeTime(iso: string): string {
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return "";
  const diff = Math.max(0, Date.now() - t);
  const min = Math.floor(diff / 60000);
  if (min < 1) return "刚刚";
  if (min < 60) return `${min} 分钟前`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} 小时前`;
  const day = Math.floor(hr / 24);
  if (day === 1) {
    const dt = new Date(iso);
    return `昨天 ${dt.getMonth() + 1}月${dt.getDate()}日`;
  }
  return `${day} 天前`;
}

/** 留言时间显示（今天相对，否则 HH:mm） */
function noteTime(iso: string): string {
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return "";
  const diff = Math.max(0, Date.now() - t);
  const min = Math.floor(diff / 60000);
  if (min < 1) return "刚刚";
  if (min < 60) return `${min} 分钟前`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} 小时前`;
  const dt = new Date(iso);
  return `${dt.getHours()}:${String(dt.getMinutes()).padStart(2, "0")}`;
}

/** 截断留言内容（按字符数，中文按 code point） */
function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max)}…`;
}

const CREATOR_LABEL: Record<CreatorRole, string> = {
  sister: "姐姐",
  younger: "妹妹",
};

/** 作者标签色：姐姐浅绿、妹妹奶白（与 note-list 一致） */
const AUTHOR_BADGE_BG: Record<CreatorRole, string> = {
  sister: "bg-leaf-soft/60 text-leaf",
  younger: "bg-cream/70 text-foreground/70",
};

const MAX_MISTAKES = 3;
const NOTE_TRUNCATE = 60;

export function AdminRecentActivity({
  refreshKey,
  onLoaded,
}: AdminRecentActivityProps) {
  const [mistakes, setMistakes] = useState<MistakeRecord[]>([]);
  const [notes, setNotes] = useState<DailyNote[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void (async () => {
      try {
        const date = todayStr();
        const [mistakesRes, notesRes] = await Promise.allSettled([
          fetch("/api/mistakes", { cache: "no-store" }).then((r) => {
            if (!r.ok) throw new Error(`mistakes ${r.status}`);
            return r.json() as Promise<MistakeRecord[]>;
          }),
          fetch(`/api/notes?date=${encodeURIComponent(date)}`, {
            cache: "no-store",
          }).then((r) => {
            if (!r.ok) throw new Error(`notes ${r.status}`);
            return r.json() as Promise<{ notes: DailyNote[]; date: string }>;
          }),
        ]);
        if (cancelled) return;
        if (mistakesRes.status === "fulfilled") setMistakes(mistakesRes.value);
        if (notesRes.status === "fulfilled") setNotes(notesRes.value.notes);
      } catch (err) {
        console.error("[admin-recent-activity] load", err);
      } finally {
        if (!cancelled) setLoading(false);
        if (!cancelled) onLoaded?.();
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [refreshKey, onLoaded]);

  const shownMistakes = mistakes.slice(0, MAX_MISTAKES);

  return (
    <div className="grid grid-cols-1 gap-5 sm:gap-6 lg:grid-cols-2">
      {/* 最近错题 */}
      <GlassCard pad="md">
        <header className="mb-3 flex items-center justify-between gap-2">
          <h3 className="flex items-center gap-1.5 text-sm font-medium text-foreground">
            <Sparkles className="h-4 w-4 text-leaf" aria-hidden />
            最近错题
          </h3>
          <span className="text-xs text-muted-foreground">
            前 <span className="font-num">{Math.min(mistakes.length, MAX_MISTAKES)}</span> 条
          </span>
        </header>

        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full rounded-xl" />
            ))}
          </div>
        ) : shownMistakes.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-6 text-center">
            <span
              className="flex h-10 w-10 items-center justify-center rounded-full bg-leaf-soft/50 text-xl"
              aria-hidden
            >
              📒
            </span>
            <p className="max-w-xs text-sm leading-relaxed text-muted-foreground">
              还没有错题记录
            </p>
          </div>
        ) : (
          <ul className="space-y-2">
            {shownMistakes.map((m, idx) => (
              <RecentMistakeItem key={m.id} record={m} idx={idx} />
            ))}
          </ul>
        )}
      </GlassCard>

      {/* 今日留言 */}
      <GlassCard pad="md">
        <header className="mb-3 flex items-center justify-between gap-2">
          <h3 className="flex items-center gap-1.5 text-sm font-medium text-foreground">
            <MessageSquare className="h-4 w-4 text-leaf" aria-hidden />
            今日留言
          </h3>
          <span className="text-xs text-muted-foreground">
            <span className="font-num tabular-nums">{notes.length}</span> 张
          </span>
        </header>

        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full rounded-xl" />
            ))}
          </div>
        ) : notes.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-6 text-center">
            <span
              className="flex h-10 w-10 items-center justify-center rounded-full bg-leaf-soft/50 text-xl"
              aria-hidden
            >
              💌
            </span>
            <p className="max-w-xs text-sm leading-relaxed text-muted-foreground">
              今天还没有留言
            </p>
          </div>
        ) : (
          <ul className="max-h-96 space-y-2 overflow-y-auto pr-1">
            {notes.map((note, idx) => (
              <motion.li
                key={note.id}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  duration: 0.25,
                  delay: Math.min(idx * 0.03, 0.2),
                }}
                className={cn(
                  "rounded-xl border border-white/40 px-3 py-2.5 dark:border-white/10",
                  note.authorRole === "sister"
                    ? "bg-leaf-soft/30"
                    : "bg-cream/40",
                )}
              >
                <div className="flex items-center gap-1.5">
                  <span
                    className={cn(
                      "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
                      AUTHOR_BADGE_BG[note.authorRole],
                    )}
                  >
                    {CREATOR_LABEL[note.authorRole]}
                  </span>
                  <span className="inline-flex items-center gap-0.5 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" aria-hidden />
                    <span className="font-num tabular-nums">
                      {noteTime(note.createdAt)}
                    </span>
                  </span>
                </div>
                <p className="mt-1.5 whitespace-pre-wrap break-words text-sm leading-relaxed text-foreground/90">
                  {truncate(note.content, NOTE_TRUNCATE)}
                </p>
              </motion.li>
            ))}
          </ul>
        )}
      </GlassCard>
    </div>
  );
}

/** 单条最近错题 —— 只读，姐姐只看不改 */
function RecentMistakeItem({
  record,
  idx,
}: {
  record: MistakeRecord;
  idx: number;
}) {
  const altText = record.note || record.subject || "错题";
  return (
    <motion.li
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: Math.min(idx * 0.03, 0.2) }}
      className="flex items-start gap-3 rounded-xl px-2 py-2 hover:bg-muted/30"
    >
      {/* 缩略图 / 录音封面 */}
      {record.type === ("image" as MistakeType) ? (
        <div className="relative aspect-[4/3] w-16 shrink-0 overflow-hidden rounded-lg border border-border/60 bg-muted/40 sm:w-20">
          <img
            src={record.url}
            alt={altText}
            className="h-full w-full object-cover"
            loading="lazy"
          />
        </div>
      ) : (
        <div className="flex aspect-[4/3] w-16 shrink-0 items-center justify-center rounded-lg border border-leaf/30 bg-leaf-soft/40 sm:w-20">
          <Mic2 className="h-5 w-5 text-leaf" aria-hidden />
        </div>
      )}

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5">
          {record.subject && (
            <Badge
              variant="outline"
              className="bg-leaf-soft/40 border-leaf/30 text-foreground"
            >
              {record.subject}
            </Badge>
          )}
          <Badge
            variant="outline"
            className="gap-1 border-leaf/30 text-muted-foreground"
          >
            {record.type === "image" ? (
              <ImageIcon className="h-3 w-3" />
            ) : (
              <Mic2 className="h-3 w-3" />
            )}
            {record.type === "image" ? "图片" : "语音"}
          </Badge>
          <span className="inline-flex items-center gap-0.5 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" aria-hidden />
            <span className="font-num tabular-nums">
              {relativeTime(record.createdAt)}
            </span>
          </span>
        </div>
        <p className="mt-1 line-clamp-2 break-words text-sm leading-relaxed text-foreground/80">
          {record.note
            ? truncate(record.note, 60)
            : record.type === "voice"
              ? "把嘴里的念叨也存下来了"
              : "悄悄把题目收进来了"}
        </p>
      </div>
    </motion.li>
  );
}
