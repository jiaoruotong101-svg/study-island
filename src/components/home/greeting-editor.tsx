"use client";

import { useState } from "react";
import { Pencil } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useUserStore } from "@/store/user-store";
import { useToast } from "@/hooks/use-toast";
import type { HomeGreeting } from "@/lib/greeting-types";

/**
 * 首页顶部问候编辑器（仅姐姐视角渲染）。
 *
 * - 姐姐可编辑大标题 + 副标题
 * - 保存后 PUT /api/quote 持久化 + socket 广播
 * - 两人共享同一条问候
 */
interface GreetingEditorProps {
  current: HomeGreeting | null;
  onSaved: (g: HomeGreeting) => void;
}

export function GreetingEditor({ current, onSaved }: GreetingEditorProps) {
  const role = useUserStore((s) => s.currentUser.role);
  const { toast } = useToast();
  const [open, setOpen] = useState(false);

  // 仅姐姐视角显示编辑入口
  if (role !== "sister") return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          type="button"
          aria-label="编辑首页问候"
          className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted/40 hover:text-foreground"
        >
          <Pencil className="h-4 w-4" />
        </button>
      </DialogTrigger>
      <DialogContent className="glass-strong border-white/50 sm:max-w-md">
        {open && (
          <GreetingForm
            key="open"
            heading={current?.heading ?? ""}
            subtitle={current?.subtitle ?? ""}
            onSubmit={(g) => {
              onSaved(g);
              setOpen(false);
              toast({ description: "首页问候已经更新啦" });
            }}
            onCancel={() => setOpen(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

interface FormValues {
  heading: string;
  subtitle: string;
}

function GreetingForm({
  heading,
  subtitle,
  onSubmit,
  onCancel,
}: {
  heading: string;
  subtitle: string;
  onSubmit: (g: HomeGreeting) => void;
  onCancel: () => void;
}) {
  const role = useUserStore((s) => s.currentUser.role);
  const [h, setH] = useState(heading);
  const [s, setS] = useState(subtitle);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    const trimmedH = h.trim();
    if (!trimmedH) {
      setError("标题留几个字吧");
      return;
    }
    if (trimmedH.length > 60) {
      setError("标题有点长，60 字以内就好");
      return;
    }
    const trimmedS = s.trim().slice(0, 120);
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/greeting", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          heading: trimmedH,
          subtitle: trimmedS,
          authorRole: role,
        }),
      });
      const data = (await res.json()) as {
        ok: boolean;
        greeting?: HomeGreeting;
        error?: string;
      };
      if (!res.ok || !data.ok || !data.greeting) {
        setError(data.error ?? "没存上，再试一次");
        return;
      }
      onSubmit(data.greeting);
    } catch {
      setError("网络似乎抖了一下，再试一次");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle className="text-base font-semibold text-foreground">
          编辑首页问候
        </DialogTitle>
        <DialogDescription className="text-xs text-muted-foreground">
          你写的，妹妹一打开就能看到。会标注是「姐姐」留的。
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-4 py-2">
        <div className="space-y-2">
          <Label htmlFor="greeting-heading" className="text-sm text-foreground">
            标题
          </Label>
          <Input
            id="greeting-heading"
            value={h}
            onChange={(e) => setH(e.target.value)}
            placeholder="比如：妹妹，今天也辛苦啦"
            maxLength={60}
            className="bg-background/60"
            autoFocus
          />
          <div className="flex justify-end text-xs text-muted-foreground">
            <span className="font-num">
              {h.length}/60
            </span>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="greeting-subtitle" className="text-sm text-foreground">
            副标题（可选）
          </Label>
          <Textarea
            id="greeting-subtitle"
            value={s}
            onChange={(e) => setS(e.target.value)}
            placeholder="比如：不用赶，把想做的事一件件做完就好。"
            rows={3}
            maxLength={120}
            className="resize-none bg-background/60"
          />
          <div className="flex justify-end text-xs text-muted-foreground">
            <span className="font-num">
              {s.length}/120
            </span>
          </div>
        </div>

        {error && <p className="text-xs text-destructive">{error}</p>}
      </div>

      <DialogFooter>
        <Button
          type="button"
          variant="ghost"
          onClick={onCancel}
          disabled={saving}
          className="text-muted-foreground"
        >
          再想想
        </Button>
        <Button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="bg-leaf text-primary-foreground hover:bg-leaf/90"
        >
          {saving ? "正在保存…" : "保存"}
        </Button>
      </DialogFooter>
    </>
  );
}
