"use client";

import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { BookOpen, RefreshCw, NotebookPen } from "lucide-react";
import { GlassCard } from "@/components/ui/glass-card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useUserStore } from "@/store/user-store";
import { MistakeCard, type MistakeRecord } from "./mistake-card";
import { MistakeComposer } from "./mistake-composer";
import type { CreatorRole } from "./mistake-card";

/**
 * 错题板块 —— section 容器。
 *
 * 职责：
 *   - 拉取列表（useState + fetch；未引入 QueryClientProvider）
 *   - 顶部：标题 + 刷新
 *   - 中段：MistakeComposer 录入
 *   - 下段：列表（卡片 + 空态 + 加载态 + 错误态）
 *
 * 设计：
 *   - 治愈配色奶白/浅绿/浅灰，文案陪伴鼓励向
 *   - 列表用 max-h + overflow-y-auto，自定义滚动条全局已就绪
 *   - framer-motion 做轻柔入场
 */

export function MistakeSection() {
  const currentUser = useUserStore((s) => s.currentUser);
  const role: CreatorRole = currentUser.role;

  const [records, setRecords] = useState<MistakeRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await fetch("/api/mistakes", { cache: "no-store" });
      if (!res.ok) throw new Error(`加载失败（${res.status}）`);
      const data = (await res.json()) as MistakeRecord[];
      setRecords(data);
    } catch (err) {
      console.error("[mistakes] load", err);
      setError("错题本暂时打不开，稍等一下再试");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const handleCreated = useCallback((rec: MistakeRecord) => {
    setRecords((prev) => [rec, ...prev]);
  }, []);

  const handleDelete = useCallback(async (id: string) => {
    setDeletingId(id);
    setError(null);
    try {
      const res = await fetch(`/api/mistakes/${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error(`删除失败（${res.status}）`);
      setRecords((prev) => prev.filter((r) => r.id !== id));
    } catch (err) {
      console.error("[mistakes] delete", err);
      setError("没能删掉，再试一次看看");
    } finally {
      setDeletingId(null);
    }
  }, []);

  const headerSubtitle =
    role === "sister"
      ? "看看妹妹又攒下了哪些题吧~"
      : "再错一次也没关系，记下来就是赚到了！";

  return (
    <section aria-label="错题记录" className="space-y-6">
      {/* 标题区 */}
      <header className="flex items-end justify-between gap-3 px-1">
        <div className="min-w-0">
          <h2 className="flex items-center gap-2 text-2xl font-semibold tracking-tight text-foreground">
            <BookOpen className="h-6 w-6 text-leaf" />
            错题小本
          </h2>
          <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
            {headerSubtitle}
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            setRefreshing(true);
            void load();
          }}
          disabled={refreshing || loading}
          className="shrink-0 text-muted-foreground"
          aria-label="刷新错题列表"
        >
          <RefreshCw
            className={refreshing ? "h-3.5 w-3.5 animate-spin" : "h-3.5 w-3.5"}
          />
          刷新
        </Button>
      </header>

      {/* 录入 */}
      <MistakeComposer createdBy={role} onCreated={handleCreated} />

      {/* 列表 */}
      <div className="space-y-3">
        <h3 className="px-1 text-sm font-medium text-muted-foreground">
          已记录 <span className="font-num tabular-nums">{records.length}</span> 条
        </h3>

        {error && (
          <div
            role="alert"
            className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive"
          >
            {error}
          </div>
        )}

        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-28 w-full rounded-2xl" />
            ))}
          </div>
        ) : records.length === 0 ? (
          <EmptyState role={role} />
        ) : (
          <div className="max-h-[70vh] space-y-3 overflow-y-auto pr-1">
            {records.map((r, idx) => (
              <motion.div
                key={r.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  duration: 0.25,
                  delay: Math.min(idx * 0.03, 0.2),
                }}
              >
                <MistakeCard
                  record={r}
                  currentRole={role}
                  onDelete={handleDelete}
                  deleting={deletingId === r.id}
                />
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function EmptyState({ role }: { role: CreatorRole }) {
  const text =
    role === "sister"
      ? "妹妹还没记下错题。也许今天她做对了很多？"
      : "这里还空着，遇到不会的题就拍下来吧。";
  return (
    <GlassCard pad="lg" className="bg-cream/30">
      <div className="flex flex-col items-center gap-3 py-8 text-center">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-leaf-soft">
          <NotebookPen className="h-6 w-6 text-leaf" />
        </span>
        <p className="max-w-xs text-sm leading-relaxed text-muted-foreground">
          {text}
        </p>
      </div>
    </GlassCard>
  );
}
