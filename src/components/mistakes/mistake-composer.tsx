"use client";

import { useRef, useState } from "react";
import { Camera, Upload, Loader2 } from "lucide-react";
import { GlassCard } from "@/components/ui/glass-card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { VoiceRecorder } from "@/components/shared/voice-recorder";
import { cn } from "@/lib/utils";
import type { CreatorRole, MistakeRecord, MistakeType } from "./mistake-card";

/**
 * 错题录入器。
 *
 * 三种录入方式：
 *   1. 拍照 —— input[capture=environment]，手机调起后置相机
 *   2. 上传图片 —— input[multiple]，可选多张
 *   3. 录音 —— 共享 VoiceRecorder
 *
 * 流程：选/拍图或录完音 → 上传到 /api/uploads 拿 filePath → POST /api/mistakes 存库
 * → 通过 onCreated 回调把新记录推回父组件列表顶部
 *
 * 设计取舍：
 *   - 多张图片串行上传（并发小、出错可定位）
 *   - 科目 / 备注在录入前填好，所有本次上传的图片共用同一份
 */

const SUBJECTS = [
  "语文",
  "数学",
  "英语",
  "物理",
  "化学",
  "生物",
  "政治",
  "历史",
  "地理",
  "其它",
];

interface UploadResult {
  ok: boolean;
  filename?: string;
  url?: string;
  mimeType?: string;
  size?: number;
  error?: string;
}

interface SavePayload {
  type: MistakeType;
  filePath: string;
  mimeType: string;
  duration: number | null;
  note: string | null;
  subject: string | null;
  createdBy: CreatorRole;
}

type Stage = "idle" | "uploading" | "saving" | "done";

async function uploadBlob(
  file: Blob,
  fallbackName: string,
): Promise<UploadResult> {
  const fd = new FormData();
  // MediaRecorder 产出的 Blob 没有 name，FormData.append 必须给个文件名
  const fileObj =
    file instanceof File ? file : new File([file], fallbackName, { type: file.type });
  fd.append("file", fileObj);
  const res = await fetch("/api/uploads", { method: "POST", body: fd });
  if (!res.ok) {
    return { ok: false, error: `上传失败（${res.status}）` };
  }
  return (await res.json()) as UploadResult;
}

async function saveMistake(payload: SavePayload): Promise<MistakeRecord> {
  const res = await fetch("/api/mistakes", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    throw new Error(`保存失败（${res.status}）`);
  }
  return (await res.json()) as MistakeRecord;
}

/** 根据 mime 选合适扩展名（仅用于给 Blob 起名） */
function extForAudio(mime: string): string {
  if (mime.includes("mp4") || mime.includes("m4a")) return "m4a";
  if (mime.includes("ogg")) return "ogg";
  if (mime.includes("mpeg")) return "mp3";
  return "webm";
}

interface Props {
  createdBy: CreatorRole;
  onCreated: (record: MistakeRecord) => void;
}

export function MistakeComposer({ createdBy, onCreated }: Props) {
  const [subject, setSubject] = useState<string>("");
  const [note, setNote] = useState("");
  const [stage, setStage] = useState<Stage>("idle");
  const [error, setError] = useState<string | null>(null);
  const [progressLabel, setProgressLabel] = useState<string>("");

  const cameraRef = useRef<HTMLInputElement>(null);
  const uploadRef = useRef<HTMLInputElement>(null);

  const isBusy = stage === "uploading" || stage === "saving";

  function resetInputs() {
    if (cameraRef.current) cameraRef.current.value = "";
    if (uploadRef.current) uploadRef.current.value = "";
  }

  function buildPayload(
    type: MistakeType,
    filePath: string,
    mimeType: string,
    duration: number | null,
  ): SavePayload {
    return {
      type,
      filePath,
      mimeType,
      duration,
      note: note.trim() || null,
      subject: subject || null,
      createdBy,
    };
  }

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setError(null);
    const list = Array.from(files).filter((f) => f.type.startsWith("image/"));
    if (list.length === 0) {
      setError("只支持图片格式");
      return;
    }
    setStage("uploading");
    let failed = 0;
    try {
      for (let i = 0; i < list.length; i++) {
        setProgressLabel(
          list.length === 1 ? "正在上传图片" : `正在上传图片 ${i + 1}/${list.length}`,
        );
        const up = await uploadBlob(list[i], list[i].name);
        if (!up.ok || !up.filename || !up.mimeType) {
          failed++;
          setError(up.error || "图片上传失败");
          continue;
        }
        setStage("saving");
        await saveMistake(
          buildPayload("image", up.filename, up.mimeType, null),
        );
        setStage("uploading");
      }
      if (failed === 0) {
        setNote("");
        setStage("done");
        setTimeout(() => setStage("idle"), 1500);
      } else {
        setStage("idle");
      }
    } catch (err) {
      console.error("[mistake-composer] handleFiles", err);
      setError("网络似乎抖了一下，重试一次试试");
      setStage("idle");
    } finally {
      setProgressLabel("");
      resetInputs();
    }
  }

  async function handleVoice(blob: Blob, durationSec: number) {
    setError(null);
    setStage("uploading");
    setProgressLabel("正在上传录音");
    try {
      const ext = extForAudio(blob.type);
      const up = await uploadBlob(blob, `voice-${Date.now()}.${ext}`);
      if (!up.ok || !up.filename || !up.mimeType) {
        setError(up.error || "录音上传失败");
        setStage("idle");
        return;
      }
      setStage("saving");
      await saveMistake(
        buildPayload("voice", up.filename, up.mimeType, durationSec),
      );
      setNote("");
      setStage("done");
      setTimeout(() => setStage("idle"), 1500);
    } catch (err) {
      console.error("[mistake-composer] handleVoice", err);
      setError("网络似乎抖了一下，重试一次试试");
      setStage("idle");
    } finally {
      setProgressLabel("");
    }
  }

  return (
    <GlassCard variant="strong" sheen pad="lg" className="bg-cream/40">
      <div className="relative z-[2] space-y-4">
        <div>
          <h3 className="text-base font-semibold text-foreground">记一道错题</h3>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            再错一次也没关系，记下来就赚到了。
          </p>
        </div>

        {/* 三种录入方式 */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <input
            ref={cameraRef}
            type="file"
            accept="image/*"
            capture="environment"
            multiple
            className="hidden"
            onChange={(e) => {
              void handleFiles(e.target.files);
            }}
            disabled={isBusy}
          />
          <input
            ref={uploadRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => {
              void handleFiles(e.target.files);
            }}
            disabled={isBusy}
          />

          <ComposerButton
            label="拍照"
            hint="手机调起相机"
            icon={<Camera className="h-5 w-5 text-leaf" />}
            disabled={isBusy}
            onClick={() => cameraRef.current?.click()}
          />
          <ComposerButton
            label="上传图片"
            hint="可一次选多张"
            icon={<Upload className="h-5 w-5 text-leaf" />}
            disabled={isBusy}
            onClick={() => uploadRef.current?.click()}
          />
          <div className="flex flex-col items-center justify-center gap-1 rounded-xl border border-leaf/30 bg-leaf-soft/40 px-3 py-3 text-sm">
            <VoiceRecorder
              variant="inline"
              disabled={isBusy}
              onComplete={(blob, dur) => {
                void handleVoice(blob, dur);
              }}
            />
            <span className="mt-1 font-medium text-foreground">录音</span>
            <span className="text-[11px] text-muted-foreground">说给姐姐听</span>
          </div>
        </div>

        {/* 科目 + 备注 */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-[180px_1fr]">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="mistake-subject" className="text-xs text-muted-foreground">
              科目
            </Label>
            <Select value={subject} onValueChange={setSubject}>
              <SelectTrigger id="mistake-subject" className="w-full">
                <SelectValue placeholder="选一科" />
              </SelectTrigger>
              <SelectContent>
                {SUBJECTS.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="mistake-note" className="text-xs text-muted-foreground">
              备注（可选）
            </Label>
            <Textarea
              id="mistake-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="想说点什么就说，不说也行"
              className="min-h-12"
              maxLength={500}
            />
          </div>
        </div>

        {/* 状态文案 */}
        <div className="flex min-h-5 items-center gap-2 text-xs">
          {stage === "uploading" && (
            <span className="inline-flex items-center gap-1.5 text-leaf">
              <Loader2 className="h-3 w-3 animate-spin" />
              {progressLabel || "正在上传"}
            </span>
          )}
          {stage === "saving" && (
            <span className="inline-flex items-center gap-1.5 text-leaf">
              <Loader2 className="h-3 w-3 animate-spin" />
              收进错题本…
            </span>
          )}
          {stage === "done" && (
            <span className="text-leaf">记好了，慢慢来就好。</span>
          )}
          {error && (
            <span className="text-destructive" role="alert">
              {error}
            </span>
          )}
        </div>
      </div>
    </GlassCard>
  );
}

interface ComposerButtonProps {
  label: string;
  hint: string;
  icon: React.ReactNode;
  disabled?: boolean;
  onClick: () => void;
}

function ComposerButton({
  label,
  hint,
  icon,
  disabled,
  onClick,
}: ComposerButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "flex flex-col items-center gap-2 rounded-xl border border-leaf/30 bg-leaf-soft/40 px-3 py-4 text-sm transition-all hover:-translate-y-0.5 hover:bg-leaf-soft/70",
        "disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0",
      )}
    >
      {icon}
      <span className="font-medium text-foreground">{label}</span>
      <span className="text-[11px] text-muted-foreground">{hint}</span>
    </button>
  );
}
