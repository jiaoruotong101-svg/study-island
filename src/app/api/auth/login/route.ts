import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";
import { setSessionCookie, verifyPassword } from "@/lib/auth";

/**
 * 登录。
 *
 * body: { username, password }
 * 校验通过后种 cookie，返回账号信息。
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "请求格式不对呀" },
      { status: 400 },
    );
  }
  if (typeof body !== "object" || body === null) {
    return NextResponse.json(
      { ok: false, error: "请求格式不对呀" },
      { status: 400 },
    );
  }
  const { username, password } = body as {
    username?: unknown;
    password?: unknown;
  };
  if (typeof username !== "string" || typeof password !== "string") {
    return NextResponse.json(
      { ok: false, error: "用户名和密钥都要填" },
      { status: 400 },
    );
  }

  const supabase = getSupabase();
  const { data: account, error } = await supabase
    .from("Account")
    .select("*")
    .eq("username", username)
    .maybeSingle();
  if (error || !account) {
    return NextResponse.json(
      { ok: false, error: "用户名或密钥不对" },
      { status: 400 },
    );
  }
  const ok = await verifyPassword(password, account.passwordHash);
  if (!ok) {
    return NextResponse.json(
      { ok: false, error: "用户名或密钥不对" },
      { status: 400 },
    );
  }

  await setSessionCookie(account.id);

  return NextResponse.json({
    ok: true,
    account: {
      id: account.id,
      username: account.username,
      displayName: account.displayName,
      role: account.role,
      pairId: account.pairId,
    },
  });
}
