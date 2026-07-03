"use client";

import { useEffect, useState } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useUserStore } from "@/store/user-store";
import type { HomeQuote } from "@/lib/quote-types";

/**
 * 小岛留言编辑器。
 *
 * - 点击铅笔按钮打开 Dialog
 * - textarea 编辑（200 字内）
 * - 保存：PUT /api/quote，成功后 onSaved 回调 + socket 广播
 * - 作者视角自动取当前登录身份
 */
interface QuoteEditorProps {
  current: HomeQuote | null;
  onSaved: (quote: HomeQuote) => void;
}

export function QuoteEditor({ current, onSaved }: QuoteEditorProps) {
  const role = useUserStore((s) => s.currentUser.role);
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 打开时用当前内容预填
  useEffect(() => {
    if (open) {
      setText(current?.content ?? "");
      setError(null);
    }
  }, [open, current]);

  async function handleSave() {
    const trimmed = text.trim();
    if (!trimmed) {
      setError("留句话再走呀");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/quote", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: trimmed, authorRole: role }),
      });
      const data = (await res.json()) as { ok: boolean; quote?: HomeQuote; error?: string };
      if (!res.ok || !data.ok || !data.quote) {
        setError(data.error ?? "没存上，再试一次");
        return;
      }
      onSaved(data.quote);
      setOpen(false);
    } catch {
      setError("网络似乎抖了一下，再试一次");
    } finally {
      setSaving(false);
    }
  }

  const placeholder =
    role === "sister"
      ? "给妹妹留句鼓励，她会看到的小岛牌…"
      : "想对姐姐说点什么，写在小岛牌上…";

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          type="button"
          aria-label="编辑小岛留言"
          className="absolute bottom-5 right-5 z-[3] flex h-9 w-9 items-center justify-center rounded-full bg-background/60 text-leaf transition-colors hover:bg-background/90"
        >
          <Pencil className="h-4 w-4" />
        </button>
      </DialogTrigger>
      <DialogContent className="glass-strong border-white/50 sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold text-foreground">
            留一句话在小岛上
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            {role === "sister"
              ? "你写的，妹妹一打开就能看到。"
              : "你写的，姐姐一打开就能看到。"}
            会标注是「{role === "sister" ? "姐姐" : "妹妹"}」留的。
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={placeholder}
            rows={4}
            maxLength={200}
            className="resize-none bg-background/60 font-medium leading-relaxed"
            autoFocus
          />
          <div className="flex items-center justify-between text-xs">
            <span className="text-destructive">{error ?? ""}</span>
            <span className="font-num text-muted-foreground">
              {text.length}/200
            </span>
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="ghost"
            onClick={() => setOpen(false)}
            disabled={saving}
            className="text-muted-foreground"
          >
            再想想
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving}
            className="bg-leaf text-primary-foreground hover:bg-leaf/90"
          >
            {saving ? "正在留…" : "留下"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
