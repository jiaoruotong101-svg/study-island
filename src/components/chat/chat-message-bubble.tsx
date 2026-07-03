"use client";

import { Volume2 } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * 聊天消息气泡。
 *
 * - 自己的消息靠右，leaf 色背景
 * - 对方的消息靠左，玻璃白
 * - text 类型：宋体正文 + 时间
 * - voice 类型：原生 audio 小播放器 + 时长（.font-num）+ 小喇叭图标
 *
 * 类型导出挂在 bubble 上（与 mistake-card 同样模式）。
 */

export type ChatSenderRole = "sister" | "younger";
export type ChatMessageType = "text" | "voice";

export interface ChatMessage {
  id: string;
  senderRole: ChatSenderRole;
  type: ChatMessageType;
  content: string | null;
  filePath: string | null;
  duration: number | null;
  /** 可直接访问的音频 url（仅 voice 类型有值） */
  url: string | null;
  createdAt: string;
}

const SENDER_LABEL: Record<ChatSenderRole, string> = {
  sister: "姐姐",
  younger: "妹妹",
};

/** HH:mm —— 数字用 Times（.font-num） */
function fmtClock(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}

/** m:ss —— 数字用 Times（.font-num） */
function fmtDuration(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

interface Props {
  message: ChatMessage;
  /** 是否为自己发的（决定左右 + 配色） */
  isOwn: boolean;
}

export function ChatMessageBubble({ message, isOwn }: Props) {
  // 自己看自己 → "我"；自己看对方 → 对方角色名
  const label = isOwn ? "我" : SENDER_LABEL[message.senderRole];

  return (
    <div
      className={cn(
        "flex w-full flex-col gap-1",
        isOwn ? "items-end" : "items-start",
      )}
    >
      <span className="px-1 text-[11px] text-muted-foreground">{label}</span>

      <div
        className={cn(
          "max-w-[78%] rounded-2xl px-3.5 py-2.5 shadow-sm sm:max-w-[70%]",
          isOwn
            ? "bg-leaf/90 text-primary-foreground rounded-tr-sm"
            : "glass rounded-tl-sm",
        )}
      >
        {message.type === "text" ? (
          <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">
            {message.content ?? ""}
          </p>
        ) : (
          <div className="flex items-center gap-2.5">
            <span
              className={cn(
                "flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
                isOwn ? "bg-white/20" : "bg-leaf-soft text-leaf",
              )}
              aria-hidden
            >
              <Volume2 className="h-4 w-4" />
            </span>
            <div className="flex min-w-0 flex-col gap-1">
              <audio
                controls
                preload="none"
                src={message.url ?? undefined}
                className="h-8 w-[180px] sm:w-[220px]"
              />
              {message.duration != null && message.duration > 0 && (
                <span
                  className={cn(
                    "font-num text-[11px] tabular-nums",
                    isOwn
                      ? "text-primary-foreground/80"
                      : "text-muted-foreground",
                  )}
                >
                  语音 · {fmtDuration(message.duration)}
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      <span
        className={cn(
          "font-num px-1 text-[10px] tabular-nums text-muted-foreground/80",
          isOwn ? "text-right" : "text-left",
        )}
      >
        {fmtClock(message.createdAt)}
      </span>
    </div>
  );
}
