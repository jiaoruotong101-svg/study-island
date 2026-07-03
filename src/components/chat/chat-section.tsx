"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { MessageCircleHeart, RefreshCw } from "lucide-react";
import { GlassCard } from "@/components/ui/glass-card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useUserStore } from "@/store/user-store";
import { getChatSocket } from "@/lib/chat-socket";
import {
  ChatMessageBubble,
  type ChatMessage,
  type ChatSenderRole,
} from "./chat-message-bubble";
import { ChatComposer } from "./chat-composer";

/**
 * 聊天板块 —— section 容器。
 *
 * 架构（与主代理契约一致）：
 *   - 挂载时 GET /api/chat/messages?limit=100 拉历史
 *   - 发消息：composer 内部 POST /api/chat/messages 拿到完整记录 →
 *     回调 onSent(record) → 本组件 socket.emit('chat:send', record) +
 *     本地追加（id 去重）
 *   - 监听 socket 'chat:message'：按 id 去重后追加（发送者自己也会收到，
 *     去重避免重复）
 *
 * socket 单例由 src/lib/chat-socket.ts 维护，跨 section 卸载/重挂不重连。
 * 监听器在本组件 effect 中 on/off，避免重复绑定。
 */

type ConnState = "connecting" | "connected" | "reconnecting";

/** socket payload 的类型守卫 —— 防止脏数据污染列表 */
function isChatMessagePayload(v: unknown): v is ChatMessage {
  if (typeof v !== "object" || v === null) return false;
  const o = v as Record<string, unknown>;
  return (
    typeof o.id === "string" &&
    (o.senderRole === "sister" || o.senderRole === "younger") &&
    (o.type === "text" || o.type === "voice") &&
    typeof o.createdAt === "string"
  );
}

export function ChatSection() {
  const currentUser = useUserStore((s) => s.currentUser);
  const myRole: ChatSenderRole = currentUser.role;

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [conn, setConn] = useState<ConnState>("connecting");

  const idsRef = useRef<Set<string>>(new Set());
  const scrollRef = useRef<HTMLDivElement>(null);
  const wasNearBottomRef = useRef(true);

  /** 追加一条消息（按 id 去重） */
  const appendMessage = useCallback((msg: ChatMessage) => {
    if (idsRef.current.has(msg.id)) return;
    idsRef.current.add(msg.id);
    setMessages((prev) => [...prev, msg]);
  }, []);

  /** 拉历史 */
  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await fetch("/api/chat/messages?limit=100", {
        cache: "no-store",
      });
      if (!res.ok) throw new Error(`加载失败（${res.status}）`);
      const data = (await res.json()) as ChatMessage[];
      idsRef.current = new Set(data.map((m) => m.id));
      setMessages(data);
      // 拉完历史后强制滚到底
      wasNearBottomRef.current = true;
    } catch (err) {
      console.error("[chat] load", err);
      setError("聊天记录暂时打不开，稍等一下再试");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // 初次挂载拉历史
  useEffect(() => {
    void load();
  }, [load]);

  // 连接 socket + 注册监听
  useEffect(() => {
    const socket = getChatSocket();

    const onConnect = () => setConn("connected");
    const onDisconnect = () => setConn("reconnecting");
    const onReconnectAttempt = () => setConn("reconnecting");
    const onMessage = (payload: unknown) => {
      if (isChatMessagePayload(payload)) {
        appendMessage(payload);
      }
    };

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("reconnect_attempt", onReconnectAttempt);
    socket.on("reconnect", onConnect);
    socket.on("chat:message", onMessage);

    // 已连接状态下立即同步状态
    if (socket.connected) setConn("connected");

    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("reconnect_attempt", onReconnectAttempt);
      socket.off("reconnect", onConnect);
      socket.off("chat:message", onMessage);
    };
  }, [appendMessage]);

  // 新消息到达 → 若用户在底部附近则自动滚到底
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    if (!wasNearBottomRef.current) return;
    el.scrollTop = el.scrollHeight;
  }, [messages]);

  /** 滚动监听：记录用户是否在底部附近 */
  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const distFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    wasNearBottomRef.current = distFromBottom < 80;
  }, []);

  /** composer 发送完成的回调 —— emit + 本地追加 */
  const handleSent = useCallback(
    (msg: ChatMessage) => {
      // 让 socket 中继广播给其他连接（其他设备/对方）
      // 发送者自己也会收到广播，但 idsRef 去重会避免重复
      const socket = getChatSocket();
      socket.emit("chat:send", msg);
      appendMessage(msg);
    },
    [appendMessage],
  );

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    void load();
  }, [load]);

  // 文案按角色陪伴向
  const title =
    myRole === "sister" ? "陪妹妹说说话" : "和姐姐说说话";
  const subtitle =
    myRole === "sister"
      ? "你说的每一句，她都能看见。"
      : "想说就说，姐姐都听着。";
  const composerPlaceholder =
    myRole === "sister"
      ? "给妹妹留句话吧，慢慢打也行…"
      : "想说点什么，姐姐都听着呢…";
  const emptyText =
    myRole === "sister"
      ? "还没开始说话。给妹妹留句晚安吧。"
      : "还没有消息，跟姐姐说句晚安吧。";

  return (
    <section aria-label="聊天" className="space-y-4">
      {/* 标题区 + 连接状态 */}
      <header className="flex items-end justify-between gap-3 px-1">
        <div className="min-w-0">
          <h2 className="flex items-center gap-2 text-2xl font-semibold tracking-tight text-foreground">
            <MessageCircleHeart className="h-6 w-6 text-leaf" />
            {title}
          </h2>
          <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
            {subtitle}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <ConnectionIndicator state={conn} />
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRefresh}
            disabled={refreshing || loading}
            className="shrink-0 text-muted-foreground"
            aria-label="刷新聊天记录"
          >
            <RefreshCw
              className={refreshing ? "h-3.5 w-3.5 animate-spin" : "h-3.5 w-3.5"}
            />
            <span className="hidden sm:inline">刷新</span>
          </Button>
        </div>
      </header>

      {/* 错误条 */}
      {error && (
        <div
          role="alert"
          className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive"
        >
          {error}
        </div>
      )}

      {/* 消息列表 / 加载态 / 空态 */}
      <GlassCard pad="sm">
        {loading ? (
          <div className="flex flex-col gap-4 py-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className={cn(
                  "flex flex-col gap-1",
                  i % 2 === 0 ? "items-start" : "items-end",
                )}
              >
                <Skeleton className="h-3 w-10 rounded-full" />
                <Skeleton
                  className={cn(
                    "h-10 rounded-2xl",
                    i % 2 === 0 ? "w-48" : "w-40",
                  )}
                />
              </div>
            ))}
          </div>
        ) : messages.length === 0 ? (
          <EmptyState text={emptyText} />
        ) : (
          <div
            ref={scrollRef}
            onScroll={handleScroll}
            className="max-h-[60vh] space-y-4 overflow-y-auto pr-1"
          >
            {messages.map((m, idx) => (
              <motion.div
                key={m.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  duration: 0.22,
                  delay: Math.min(idx * 0.02, 0.12),
                }}
              >
                <ChatMessageBubble message={m} isOwn={m.senderRole === myRole} />
              </motion.div>
            ))}
          </div>
        )}
      </GlassCard>

      {/* 输入器 —— 加载中也允许发送，但 conn 不可用不影响 POST */}
      <ChatComposer
        senderRole={myRole}
        placeholder={composerPlaceholder}
        onSent={handleSent}
      />
    </section>
  );
}

/** 连接状态指示：绿点已连接 / 灰点（脉冲）重连中 */
function ConnectionIndicator({ state }: { state: ConnState }) {
  const isConnected = state === "connected";
  const label = isConnected ? "已连接" : "重连中";
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full bg-background/60 px-2.5 py-1 text-xs text-muted-foreground"
      aria-label={`连接状态：${label}`}
      title={`连接状态：${label}`}
    >
      <span
        className={cn(
          "h-2 w-2 rounded-full",
          isConnected
            ? "bg-leaf"
            : "bg-muted-foreground/40 animate-pulse",
        )}
      />
      <span className="hidden sm:inline">{label}</span>
    </span>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="flex flex-col items-center gap-3 py-10 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-leaf-soft">
        <MessageCircleHeart className="h-6 w-6 text-leaf" />
      </span>
      <p className="max-w-xs text-sm leading-relaxed text-muted-foreground">
        {text}
      </p>
    </div>
  );
}
