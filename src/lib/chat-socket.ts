/**
 * 前端 socket.io 单例 helper。
 *
 * 全局只持有一个 socket 连接，跨 section 卸载/重挂不会反复重连。
 * 监听器由调用方自行 on/off 管理，本文件不参与业务。
 *
 * 连接规范（必须遵守，否则 Caddy 网关不通）：
 *   - 路径必须为 '/'，端口只能写在 XTransformPort query 里
 *   - 禁止 io("http://localhost:3003") 形式
 *
 * 事件契约：
 *   - emit('chat:send', payload)   →  发送一条已持久化的消息给中继服务
 *   - on('chat:message', payload)  →  收到聊天广播（含发送者自己，前端按 id 去重）
 *   - emit('quote:update', quote)  →  首页留言更新后广播给所有首页
 *   - on('quote:updated', quote)   →  收到留言更新，首页实时刷新
 */

import { io, type Socket } from "socket.io-client";

let socket: Socket | null = null;

/**
 * 获取（必要时创建）chat socket 单例。
 * 第一次调用时建立连接；后续调用返回同一实例。
 */
export function getChatSocket(): Socket {
  if (socket) return socket;

  socket = io("/?XTransformPort=3003", {
    transports: ["websocket", "polling"],
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 10000,
    timeout: 10000,
  });

  return socket;
}

/**
 * 关闭并清空单例（仅在页面卸载时调用，正常 tab 切换不需要）。
 */
export function closeChatSocket(): void {
  if (!socket) return;
  socket.removeAllListeners();
  socket.disconnect();
  socket = null;
}
