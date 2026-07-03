import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { getSupabase } from "@/lib/supabase";
import { getAccountFromRequest } from "@/lib/auth";

/**
 * 首页小岛留言（共享语录）。
 *
 * 多对隔离：每对 pair 一条留言，按 pairId @unique 唯一。
 * - GET：取当前配对的留言；无则返回 null（前端回退到默认语录库）
 * - PUT：upsert 更新，作者视角由请求体 authorRole 决定
 *   onConflict: "pairId"
 *
 * 实时同步由 chat-service socket 广播 quote:updated 事件，
 * 本接口只负责持久化。
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isValidRole(v: unknown): v is "sister" | "younger" {
  return v === "sister" || v === "younger";
}

export async function GET() {
  const acc = await getAccountFromRequest();
  if (!acc) {
    return NextResponse.json(
      { ok: false, error: "请先登录" },
      { status: 401 },
    );
  }
  const pairId = acc.pairId;

  const supabase = getSupabase();
  const { data: row } = await supabase
    .from("HomeQuote")
    .select("*")
    .eq("pairId", pairId)
    .maybeSingle();
  return NextResponse.json({ quote: row });
}

export async function PUT(req: NextRequest) {
  const acc = await getAccountFromRequest();
  if (!acc) {
    return NextResponse.json(
      { ok: false, error: "请先登录" },
      { status: 401 },
    );
  }
  const pairId = acc.pairId;

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
  const { content, authorRole } = body as { content?: unknown; authorRole?: unknown };
  if (typeof content !== "string" || content.trim().length === 0) {
    return NextResponse.json(
      { ok: false, error: "留句话再走呀" },
      { status: 400 },
    );
  }
  if (content.length > 200) {
    return NextResponse.json(
      { ok: false, error: "小岛牌有点小，200 字以内就好" },
      { status: 400 },
    );
  }
  if (!isValidRole(authorRole)) {
    return NextResponse.json(
      { ok: false, error: "不知道是谁留的" },
      { status: 400 },
    );
  }

  const supabase = getSupabase();
  const { data: quote, error } = await supabase
    .from("HomeQuote")
    .upsert(
      {
        id: randomUUID(),
        pairId,
        content: content.trim(),
        authorRole,
        updatedAt: new Date().toISOString(),
      },
      { onConflict: "pairId" },
    )
    .select()
    .single();
  if (error || !quote) {
    return NextResponse.json(
      { ok: false, error: "没能保存，再试一次看看" },
      { status: 500 },
    );
  }
  return NextResponse.json({ ok: true, quote });
}
