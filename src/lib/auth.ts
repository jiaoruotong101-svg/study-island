import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { getSupabase } from "@/lib/supabase";

/**
 * 账号与 session 工具。
 *
 * - 密钥用 bcrypt 哈希存储
 * - 登录后种 httpOnly cookie `si-session`，内容为签名后的 accountId
 * - 校验时从 cookie 取 accountId → 查 Account → 返回账号信息
 *
 * 设计取舍：产品仅 2 人/对，多对隔离，不引入 NextAuth 的复杂配置。
 * cookie 值用 HMAC 签名防篡改（签名密钥从环境变量取，缺省用开发兜底）。
 */

const COOKIE_NAME = "si-session";
const BCRYPT_ROUNDS = 10;

function getSignKey(): string {
  return process.env.SI_SIGN_KEY || "study-island-dev-sign-key-change-me";
}

/** 简单 HMAC 签名（用于 cookie 防篡改，非加密强度，足够本场景）。 */
async function sign(value: string): Promise<string> {
  const key = getSignKey();
  const enc = new TextEncoder();
  const data = enc.encode(value + ":" + key);
  const hashBuf = await crypto.subtle.digest("SHA-256", data);
  const hashHex = Array.from(new Uint8Array(hashBuf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return `${value}.${hashHex}`;
}

async function verify(signed: string): Promise<string | null> {
  const idx = signed.lastIndexOf(".");
  if (idx < 0) return null;
  const value = signed.slice(0, idx);
  const expected = await sign(value);
  return signed === expected ? value : null;
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

export async function verifyPassword(
  password: string,
  hash: string,
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/** 种登录 cookie。 */
export async function setSessionCookie(accountId: string): Promise<void> {
  const signed = await sign(accountId);
  const store = await cookies();
  store.set(COOKIE_NAME, signed, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30, // 30 天
  });
}

/** 清登录 cookie。 */
export async function clearSessionCookie(): Promise<void> {
  const store = await cookies();
  store.delete(COOKIE_NAME);
}

export interface SessionAccount {
  id: string;
  username: string;
  displayName: string;
  role: "sister" | "younger";
  pairId: string;
}

/** 从请求 cookie 取当前登录账号，未登录返回 null。 */
export async function getAccountFromRequest(): Promise<SessionAccount | null> {
  try {
    const store = await cookies();
    const signed = store.get(COOKIE_NAME)?.value;
    if (!signed) return null;
    const accountId = await verify(signed);
    if (!accountId) return null;
    const supabase = getSupabase();
    const { data: acc, error } = await supabase
      .from("Account")
      .select("*")
      .eq("id", accountId)
      .maybeSingle();
    if (error || !acc) return null;
    return {
      id: acc.id,
      username: acc.username,
      displayName: acc.displayName,
      role: acc.role as "sister" | "younger",
      pairId: acc.pairId,
    };
  } catch {
    return null;
  }
}

/** 生成 6 位配对码（大写字母+数字，去除易混字符）。 */
export function generatePairCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}
