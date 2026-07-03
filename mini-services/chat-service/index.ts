/**
 * chat-service —— 实时聊天的 socket.io 中继（mini-service，端口 3003）。
 *
 * 设计原则（与主应用解耦）：
 *   - 纯中继，不碰数据库（持久化由主应用 /api/chat/messages 负责）
 *   - 不维护在线用户列表（产品仅 2 人，无需 join/leave 业务）
 *   - 前端先 POST 主应用持久化拿到完整记录，再 emit('chat:send', record)
 *     → 本服务收到后 io.emit('chat:message', record) 广播给所有连接
 *     → 发送者自身也会收到，前端按 id 去重避免重复
 *
 * 与 Caddy 网关的契约：
 *   - path 必须为 '/'（Caddy 据此把 XTransformPort=3003 的请求转发过来）
 *   - 前端用 io('/?XTransformPort=3003') 连接
 *
 * 启动：cd mini-services/chat-service && bun install && bun run dev
 */

import { createServer } from "http";
import { Server, type Socket } from "socket.io";

const PORT = 3003;

const httpServer = createServer();
const io = new Server(httpServer, {
  // Caddy 据此路径转发 —— 请勿修改
  path: "/",
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
  pingTimeout: 60000,
  pingInterval: 25000,
});

/** 已连接的 socket 数（仅用于日志，不参与业务） */
let connectionCount = 0;

io.on("connection", (socket: Socket) => {
  connectionCount += 1;
  console.log(
    `[chat-service] connected: ${socket.id} (total: ${connectionCount})`,
  );

  /**
   * 收到一条已持久化的消息，原样广播给所有连接（含发送者）。
   * 不做任何业务校验 —— 主应用已经写库，本服务只管分发。
   */
  socket.on("chat:send", (payload: unknown) => {
    io.emit("chat:message", payload);
  });

  /**
   * 首页小岛留言更新：主应用 PUT /api/quote 持久化后 emit('quote:update', record)，
   * 本服务原样广播 quote:updated，所有首页实时刷新。
   */
  socket.on("quote:update", (payload: unknown) => {
    io.emit("quote:updated", payload);
  });

  socket.on("disconnect", (reason: string) => {
    connectionCount = Math.max(0, connectionCount - 1);
    console.log(
      `[chat-service] disconnected: ${socket.id} (${reason}) (total: ${connectionCount})`,
    );
  });

  socket.on("error", (err: Error) => {
    console.error(`[chat-service] socket error (${socket.id}):`, err);
  });
});

httpServer.listen(PORT, () => {
  console.log(
    `[chat-service] socket.io relay listening on :${PORT} (path: /)`,
  );
});

/** 优雅关闭 */
function shutdown(signal: string): void {
  console.log(`[chat-service] ${signal} received, closing server...`);
  io.close(() => {
    httpServer.close(() => {
      console.log("[chat-service] server closed");
      process.exit(0);
    });
  });
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
