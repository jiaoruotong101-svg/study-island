"use client";

import { useRef, useState } from "react";
import { Send, Loader2 } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { VoiceRecorder } from "@/components/shared/voice-recorder";
import { cn } from "@/lib/utils";
import type {
  ChatMessage,
  ChatSenderRole,
} from "./chat-message-bubble";

/**
 * 聊天输入器。
 *
 * 文字 + 语音双通道：
 *   - 文字：textarea 自适应高度（field-sizing-content），
 *           Enter 发送、Shift+Enter 换行，输入法合成中不触发
 *   - 语音：共享 VoiceRecorder（inline 形态），录完即上传 + 持久化
 *
 * 流程（与主代理契约一致）：
 *   1. 文字 / 上传完成的语音 → POST /api/chat/messages 持久化
 *   2. 拿到完整记录后回调 onSent(record) —— 由父组件 emit socket + 追加列表
 *
 * 错误与进度自管：进度小字、错误小字都贴在输入框下方，陪伴向文案。
 */

interface Props {
  senderRole: ChatSenderRole;
  /** 是否整体禁用（例如历史还在加载时） */
  disabled?: boolean;
  /** 输入框 placeholder，按角色由父组件传入 */
  placeholder: string;
  onSent: (msg: ChatMessage) => void;
}

type Stage = "idle" | "text" | "voice";

interface UploadResult {
  ok: boolean;
  filename?: string;
  url?: string;
  mimeType?: string;
  size?: number;
  error?: string;
}

/** 根据 mime 给语音 Blob 起个文件名（MediaRecorder 产出的 Blob 没 name） */
function extForAudio(mime: string): string {
  if (mime.includes("mp4") || mime.includes("m4a")) return "m4a";
  if (mime.includes("ogg")) return "ogg";
  if (mime.includes("mpeg")) return "mp3";
  return "webm";
}

async function uploadBlob(blob: Blob, fallbackName: string): Promise<UploadResult> {
  const fd = new FormData();
  const fileObj =
    blob instanceof File
      ? blob
      : new File([blob], fallbackName, { type: blob.type });
  fd.append("file", fileObj);
  const res = await fetch("/api/uploads", { method: "POST", body: fd });
  if (!res.ok) {
    return { ok: false, error: `上传失败（${res.status}）` };
  }
  return (await res.json()) as UploadResult;
}

async function saveMessage(payload: {
  senderRole: ChatSenderRole;
  type: "text" | "voice";
  content?: string;
  filePath?: string;
  duration?: number;
}): Promise<ChatMessage> {
  const res = await fetch("/api/chat/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(data.error || `发送失败（${res.status}）`);
  }
  return (await res.json()) as ChatMessage;
}

export function ChatComposer({
  senderRole,
  disabled = false,
  placeholder,
  onSent,
}: Props) {
  const [text, setText] = useState("");
  const [stage, setStage] = useState<Stage>("idle");
  const [error, setError] = useState<string | null>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);

  const isBusy = stage !== "idle" || disabled;
  const canSend = text.trim().length > 0 && !isBusy;

  async function sendText() {
    const content = text.trim();
    if (!content || isBusy) return;
    setError(null);
    setStage("text");
    try {
      const msg = await saveMessage({ senderRole, type: "text", content });
      onSent(msg);
      setText("");
      // 重置 textarea 高度（field-sizing-content 会自适应）
      if (taRef.current) taRef.current.style.height = "";
    } catch (err) {
      console.error("[chat-composer] sendText", err);
      setError(err instanceof Error ? err.message : "消息没能发出去");
    } finally {
      setStage("idle");
    }
  }

  async function handleVoice(blob: Blob, durationSec: number) {
    if (disabled) return;
    setError(null);
    setStage("voice");
    try {
      const ext = extForAudio(blob.type);
      const up = await uploadBlob(blob, `chat-voice-${Date.now()}.${ext}`);
      if (!up.ok || !up.filename) {
        setError(up.error || "录音上传失败");
        return;
      }
      const msg = await saveMessage({
        senderRole,
        type: "voice",
        filePath: up.filename,
        duration: durationSec,
      });
      onSent(msg);
    } catch (err) {
      console.error("[chat-composer] handleVoice", err);
      setError(err instanceof Error ? err.message : "语音没能发出去");
    } finally {
      setStage("idle");
    }
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    // 输入法合成中不触发发送
    if (e.nativeEvent.isComposing) return;
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void sendText();
    }
  }

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-end gap-2 rounded-2xl glass-strong p-2.5 sm:p-3">
        <VoiceRecorder
          variant="inline"
          disabled={isBusy}
          onComplete={(blob, dur) => {
            void handleVoice(blob, dur);
          }}
        />

        <Textarea
          ref={taRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          rows={1}
          maxLength={5000}
          disabled={isBusy}
          aria-label="聊天输入框"
          className={cn(
            "min-h-9 max-h-40 resize-none border-none bg-transparent px-2 shadow-none focus-visible:ring-0",
            "text-sm leading-relaxed",
          )}
        />

        <Button
          type="button"
          size="icon"
          onClick={() => void sendText()}
          disabled={!canSend}
          aria-label="发送消息"
          className="h-9 w-9 shrink-0 rounded-full bg-leaf text-primary-foreground hover:bg-leaf/90"
        >
          {stage === "text" ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* 进度 / 错误 —— 一行陪伴向小字 */}
      <div className="flex min-h-4 items-center gap-2 px-2 text-[11px]">
        {stage === "voice" && (
          <span className="inline-flex items-center gap-1.5 text-leaf">
            <Loader2 className="h-3 w-3 animate-spin" />
            正在把语音送出去…
          </span>
        )}
        {stage === "text" && (
          <span className="inline-flex items-center gap-1.5 text-leaf">
            <Loader2 className="h-3 w-3 animate-spin" />
            正在发送…
          </span>
        )}
        {error && (
          <span className="text-destructive" role="alert">
            {error}
          </span>
        )}
      </div>
    </div>
  );
}
