"use client";

import { useState } from "react";
import { Settings2, RotateCcw } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  DEFAULT_FOCUS_MIN,
  DEFAULT_LONG_BREAK_MIN,
  DEFAULT_SHORT_BREAK_MIN,
  usePomodoroStore,
} from "@/store/pomodoro-store";

/**
 * 番茄钟时长设置。
 *
 * - 专注 / 短休 / 长休 分钟数可自由调整
 * - 运行中改动不影响当前段（下一段生效），idle 时立即同步
 * - "恢复默认"一键回到 25/5/15
 */
export function PomodoroSettings() {
  const focusMin = usePomodoroStore((s) => s.focusMin);
  const shortBreakMin = usePomodoroStore((s) => s.shortBreakMin);
  const longBreakMin = usePomodoroStore((s) => s.longBreakMin);
  const setDurations = usePomodoroStore((s) => s.setDurations);
  const resetDurations = usePomodoroStore((s) => s.resetDurations);
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          type="button"
          aria-label="番茄钟设置"
          className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted/40 hover:text-foreground"
        >
          <Settings2 className="h-4 w-4" />
        </button>
      </DialogTrigger>
      <DialogContent className="glass-strong border-white/50 sm:max-w-sm">
        {/* key={open} 让表单在每次打开时重新挂载，用当前 store 值作初始值，
            避免 effect 内 setState（lint 规则）。 */}
        {open && (
          <SettingsForm
            key="open"
            focusMin={focusMin}
            shortBreakMin={shortBreakMin}
            longBreakMin={longBreakMin}
            onSubmit={(v) => {
              setDurations(v);
              setOpen(false);
            }}
            onReset={() => {
              resetDurations();
            }}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

interface FormValues {
  focusMin: number;
  shortBreakMin: number;
  longBreakMin: number;
}

function SettingsForm({
  focusMin,
  shortBreakMin,
  longBreakMin,
  onSubmit,
  onReset,
}: {
  focusMin: number;
  shortBreakMin: number;
  longBreakMin: number;
  onSubmit: (v: FormValues) => void;
  onReset: () => void;
}) {
  const [focus, setFocus] = useState(String(focusMin));
  const [shortB, setShortB] = useState(String(shortBreakMin));
  const [longB, setLongB] = useState(String(longBreakMin));
  const [error, setError] = useState<string | null>(null);

  function handleSave() {
    const f = parseInt(focus, 10);
    const sb = parseInt(shortB, 10);
    const lb = parseInt(longB, 10);
    if (!Number.isFinite(f) || f < 1 || f > 120) {
      setError("专注时长 1–120 分钟");
      return;
    }
    if (!Number.isFinite(sb) || sb < 1 || sb > 60) {
      setError("短休 1–60 分钟");
      return;
    }
    if (!Number.isFinite(lb) || lb < 1 || lb > 60) {
      setError("长休 1–60 分钟");
      return;
    }
    if (lb < sb) {
      setError("长休应不短于短休");
      return;
    }
    onSubmit({ focusMin: f, shortBreakMin: sb, longBreakMin: lb });
  }

  function handleReset() {
    onReset();
    setFocus(String(DEFAULT_FOCUS_MIN));
    setShortB(String(DEFAULT_SHORT_BREAK_MIN));
    setLongB(String(DEFAULT_LONG_BREAK_MIN));
    setError(null);
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle className="text-base font-semibold text-foreground">
          番茄钟时长
        </DialogTitle>
        <DialogDescription className="text-xs text-muted-foreground">
          按自己的节奏来，没有标准答案。
          {`默认 ${DEFAULT_FOCUS_MIN}/${DEFAULT_SHORT_BREAK_MIN}/${DEFAULT_LONG_BREAK_MIN} 分钟。`}
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-4 py-2">
        <DurationField
          id="pomodoro-focus"
          label="专注"
          suffix="分钟"
          value={focus}
          onChange={setFocus}
          hint="1–120"
        />
        <DurationField
          id="pomodoro-short"
          label="短休"
          suffix="分钟"
          value={shortB}
          onChange={setShortB}
          hint="1–60"
        />
        <DurationField
          id="pomodoro-long"
          label="长休"
          suffix="分钟"
          value={longB}
          onChange={setLongB}
          hint="1–60，每 4 个专注后"
        />
        {error && <p className="text-xs text-destructive">{error}</p>}
      </div>

      <DialogFooter className="gap-2 sm:gap-2">
        <Button
          type="button"
          variant="ghost"
          onClick={handleReset}
          className="text-muted-foreground"
        >
          <RotateCcw className="mr-1 h-3.5 w-3.5" />
          恢复默认
        </Button>
        <Button
          type="button"
          variant="ghost"
          onClick={() => onSubmit({ focusMin, shortBreakMin, longBreakMin })}
          className="text-muted-foreground"
        >
          再想想
        </Button>
        <Button
          type="button"
          onClick={handleSave}
          className="bg-leaf text-primary-foreground hover:bg-leaf/90"
        >
          保存
        </Button>
      </DialogFooter>
    </>
  );
}

function DurationField({
  id,
  label,
  suffix,
  value,
  onChange,
  hint,
}: {
  id: string;
  label: string;
  suffix: string;
  value: string;
  onChange: (v: string) => void;
  hint: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <Label htmlFor={id} className="text-sm text-foreground">
        {label}
      </Label>
      <div className="flex items-center gap-2">
        <Input
          id={id}
          type="number"
          inputMode="numeric"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-20 text-right font-num"
          min={1}
          max={120}
        />
        <span className="w-16 text-xs text-muted-foreground">
          {suffix}
          <span className="ml-1 text-muted-foreground/70">{hint}</span>
        </span>
      </div>
    </div>
  );
}

