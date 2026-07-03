"use client";

import { useState } from "react";
import { Trash2, ImageIcon, Mic2, Clock, User } from "lucide-react";
import { GlassCard } from "@/components/ui/glass-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
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

/**
 * 错题卡片。
 *
 * - image 类型：缩略图 + 点击看大图（Dialog）
 * - voice 类型：原生 audio 播放 + 时长
 * - 共同展示：科目标签 / 类型标签 / 创建者 / 相对时间 / 备注
 * - 创建者本人可删除（带确认 AlertDialog）
 */

export type MistakeType = "image" | "voice";
export type CreatorRole = "sister" | "younger";

export interface MistakeRecord {
  id: string;
  type: MistakeType;
  filePath: string;
  url: string;
  mimeType: string;
  duration: number | null;
  note: string | null;
  subject: string | null;
  createdBy: CreatorRole;
  createdAt: string;
}

const CREATOR_LABEL: Record<CreatorRole, string> = {
  sister: "姐姐",
  younger: "妹妹",
};

/** 相对时间 —— 中文，不依赖外部库。 */
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
  if (day < 30) return `${day} 天前`;
  const month = Math.floor(day / 30);
  if (month < 12) return `${month} 个月前`;
  return `${Math.floor(month / 12)} 年前`;
}

function fmtDuration(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

interface Props {
  record: MistakeRecord;
  currentRole: CreatorRole;
  onDelete?: (id: string) => Promise<void> | void;
  deleting?: boolean;
}

export function MistakeCard({ record, currentRole, onDelete, deleting }: Props) {
  const [previewOpen, setPreviewOpen] = useState(false);
  const isOwn = record.createdBy === currentRole;
  const canDelete = isOwn && !!onDelete;
  const altText = record.note || record.subject || "错题图片";

  return (
    <GlassCard pad="md" className="group">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
        {/* 缩略图 / 录音封面 */}
        {record.type === "image" ? (
          <button
            type="button"
            onClick={() => setPreviewOpen(true)}
            className="relative block aspect-[4/3] w-full shrink-0 overflow-hidden rounded-xl border border-border/60 bg-muted/40 sm:w-36"
            aria-label="点击查看大图"
          >
            <img
              src={record.url}
              alt={altText}
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
              loading="lazy"
            />
          </button>
        ) : (
          <div className="flex aspect-[4/3] w-full shrink-0 items-center justify-center rounded-xl border border-leaf/30 bg-leaf-soft/40 sm:w-36">
            <Mic2 className="h-7 w-7 text-leaf" />
          </div>
        )}

        {/* 内容区 */}
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <div className="flex flex-wrap items-center gap-1.5">
            {record.subject && (
              <Badge
                variant="secondary"
                className="bg-leaf-soft text-leaf"
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
            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
              <User className="h-3 w-3" />
              {CREATOR_LABEL[record.createdBy]}
            </span>
            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              <span className="font-num tabular-nums">
                {relativeTime(record.createdAt)}
              </span>
            </span>
          </div>

          {/* 语音播放器 */}
          {record.type === "voice" && (
            <div className="flex flex-wrap items-center gap-2">
              <audio
                controls
                preload="none"
                src={record.url}
                className="h-9 w-full max-w-xs"
              />
              {record.duration != null && record.duration > 0 && (
                <span className="font-num shrink-0 text-xs text-muted-foreground">
                  {fmtDuration(record.duration)}
                </span>
              )}
            </div>
          )}

          {/* 备注 */}
          {record.note ? (
            <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-foreground">
              {record.note}
            </p>
          ) : (
            <p className="text-sm italic text-muted-foreground">
              {record.type === "voice"
                ? "把嘴里的念叨也存下来了"
                : "悄悄把题目收进来了"}
            </p>
          )}

          {/* 操作区 */}
          {canDelete && (
            <div className="mt-1 flex items-center justify-end">
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={deleting}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    {deleting ? "删除中" : "删除"}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>删掉这道题吗？</AlertDialogTitle>
                    <AlertDialogDescription>
                      这条记录会被移走，文件也会一起删掉。再想想也无妨，留下也是一种记录。
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>再想想</AlertDialogCancel>
                    <AlertDialogAction
                      className="bg-destructive text-white hover:bg-destructive/90"
                      onClick={() => onDelete?.(record.id)}
                    >
                      嗯，删掉吧
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          )}
        </div>
      </div>

      {/* 大图预览 */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent
          showCloseButton
          className="max-w-3xl border-leaf/20 p-2 sm:p-3"
        >
          <DialogTitle className="sr-only">错题大图</DialogTitle>
          <DialogDescription className="sr-only">
            {altText}
          </DialogDescription>
          <img
            src={record.url}
            alt={altText}
            className="max-h-[80vh] w-full rounded-lg object-contain"
          />
        </DialogContent>
      </Dialog>
    </GlassCard>
  );
}
