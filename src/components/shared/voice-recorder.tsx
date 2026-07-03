"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Mic, Square } from "lucide-react";
import { cn } from "@/lib/utils";

/** 是否处于客户端（避免 hydration mismatch 与 effect 内 setState）。 */
function useIsClient(): boolean {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
}

/**
 * 语音录制组件（共享：错题记录 / 实时聊天 复用）。
 *
 * - 使用 MediaRecorder API
 * - 录制中显示时长（mm:ss）
 * - 停止后回调 onComplete(blob, durationSec)
 * - 自动选择浏览器支持的 mime（webm/opus 优先，mp4 兜底）
 *
 * 仅客户端：SSR 时按钮不可用，挂载后启用。
 */
interface VoiceRecorderProps {
  onComplete: (blob: Blob, durationSec: number) => void;
  /** 渲染形态：inline（小，用于聊天）/ block（大，用于错题录入） */
  variant?: "inline" | "block";
  disabled?: boolean;
  className?: string;
}

const MIME_CANDIDATES = [
  "audio/webm;codecs=opus",
  "audio/webm",
  "audio/mp4",
  "audio/ogg;codecs=opus",
];

function pickMime(): string | undefined {
  if (typeof MediaRecorder === "undefined") return undefined;
  return MIME_CANDIDATES.find((m) => MediaRecorder.isTypeSupported(m));
}

export function VoiceRecorder({
  onComplete,
  variant = "block",
  disabled = false,
  className,
}: VoiceRecorderProps) {
  const isClient = useIsClient();
  const supported =
    isClient &&
    typeof navigator !== "undefined" &&
    !!navigator.mediaDevices?.getUserMedia &&
    typeof MediaRecorder !== "undefined";
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef(0);

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const cleanup = useCallback(() => {
    stopTimer();
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    recorderRef.current = null;
    chunksRef.current = [];
  }, [stopTimer]);

  useEffect(() => () => cleanup(), [cleanup]);

  const start = useCallback(async () => {
    setError(null);
    if (!supported) {
      setError("当前环境不支持录音");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mime = pickMime();
      const recorder = mime
        ? new MediaRecorder(stream, { mimeType: mime })
        : new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        const type = recorder.mimeType || mime || "audio/webm";
        const blob = new Blob(chunksRef.current, { type });
        const duration = Math.max(
          1,
          Math.round((Date.now() - startTimeRef.current) / 1000),
        );
        onComplete(blob, duration);
        cleanup();
        setRecording(false);
        setElapsed(0);
      };
      recorder.start();
      recorderRef.current = recorder;
      startTimeRef.current = Date.now();
      setRecording(true);
      setElapsed(0);
      timerRef.current = setInterval(() => {
        setElapsed(Math.round((Date.now() - startTimeRef.current) / 1000));
      }, 500);
    } catch {
      setError("没能获取麦克风权限，检查一下设置呀");
      cleanup();
      setRecording(false);
    }
  }, [supported, onComplete, cleanup]);

  const stop = useCallback(() => {
    const r = recorderRef.current;
    if (r && r.state !== "inactive") {
      r.stop();
    }
  }, []);

  if (!supported) {
    return (
      <span className={cn("text-xs text-muted-foreground", className)}>
        当前环境暂不支持录音
      </span>
    );
  }

  const fmt = (s: number) =>
    `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

  if (variant === "inline") {
    return (
      <span className={cn("inline-flex items-center gap-2", className)}>
        {error && <span className="text-xs text-destructive">{error}</span>}
        <button
          type="button"
          onClick={recording ? stop : start}
          disabled={disabled}
          aria-label={recording ? "停止录音" : "开始录音"}
          className={cn(
            "flex h-9 w-9 items-center justify-center rounded-full transition-colors",
            recording
              ? "bg-destructive/90 text-white"
              : "bg-leaf-soft text-leaf hover:bg-leaf/20",
            disabled && "cursor-not-allowed opacity-50",
          )}
        >
          {recording ? (
            <Square className="h-4 w-4" fill="currentColor" />
          ) : (
            <Mic className="h-4 w-4" />
          )}
        </button>
        {recording && (
          <span className="font-num text-xs tabular-nums text-destructive">
            {fmt(elapsed)}
          </span>
        )}
      </span>
    );
  }

  return (
    <div className={cn("flex flex-col items-center gap-3", className)}>
      <button
        type="button"
        onClick={recording ? stop : start}
        disabled={disabled}
        aria-label={recording ? "结束录音" : "开始录音"}
        className={cn(
          "relative flex h-16 w-16 items-center justify-center rounded-full transition-all",
          recording
            ? "bg-destructive/90 text-white"
            : "bg-leaf-soft text-leaf hover:scale-105",
          disabled && "cursor-not-allowed opacity-50",
        )}
      >
        {recording ? (
          <Square className="h-6 w-6" fill="currentColor" />
        ) : (
          <Mic className="h-7 w-7" />
        )}
        {recording && (
          <span className="absolute inset-0 animate-ping rounded-full bg-destructive/30" />
        )}
      </button>
      <div className="text-center">
        {recording ? (
          <span className="font-num text-sm tabular-nums text-destructive">
            录制中 · {fmt(elapsed)}
          </span>
        ) : (
          <span className="text-sm text-muted-foreground">
            点击录音，再说给姐姐听
          </span>
        )}
        {error && (
          <span className="mt-1 block text-xs text-destructive">{error}</span>
        )}
      </div>
    </div>
  );
}
