"use client";

import { useSyncExternalStore } from "react";

/**
 * 返回当前时间，每分钟刷新一次。
 *
 * 使用 useSyncExternalStore 而非 useEffect+setState，
 * 以避免 hydration mismatch 与"effect 内同步 setState"的反模式。
 * 服务端快照返回 null，客户端首屏后自动切换到真实时间。
 */

let cachedNow: Date | null = null;

function subscribe(callback: () => void): () => void {
  const timer = setInterval(() => {
    cachedNow = new Date();
    callback();
  }, 60_000);
  return () => clearInterval(timer);
}

function getClientSnapshot(): Date {
  if (cachedNow === null) {
    cachedNow = new Date();
  }
  return cachedNow;
}

function getServerSnapshot(): null {
  return null;
}

export function useNow(): Date | null {
  return useSyncExternalStore(subscribe, getClientSnapshot, getServerSnapshot);
}
