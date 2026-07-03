import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAccountFromRequest } from "@/lib/auth";
import type { HomeGreeting } from "@/lib/greeting-types";

/**
 * 首页顶部问候（大标题 + 副标题）。
 *
 * 多对隔离：每对 pair 一条问候，按 pairId @unique 唯一。
 * - GET：取当前配对的问候；无则返回 null（前端回退到角色默认文案）
 * - PUT：upsert 更新（heading + subtitle + authorRole）
 *   where: { pairId }，create/update 均带 pairId
 *
 * 实时同步由 chat-service socket 广播 greeting:updated 事件。
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

  const row = await db.homeGreeting.findUnique({ where: { pairId } });
  return NextResponse.json({ greeting: row });
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
  const { heading, subtitle, authorRole } = body as {
    heading?: unknown;
    subtitle?: unknown;
    authorRole?: unknown;
  };

  if (typeof heading !== "string" || heading.trim().length === 0) {
    return NextResponse.json({ ok: false, error: "标题留几个字吧" }, { status: 400 });
  }
  if (heading.length > 60) {
    return NextResponse.json(
      { ok: false, error: "标题有点长，60 字以内就好" },
      { status: 400 },
    );
  }
  // 副标题允许空串（姐姐可能只想留标题）
  const sub = typeof subtitle === "string" ? subtitle.trim().slice(0, 120) : "";
  if (!isValidRole(authorRole)) {
    return NextResponse.json({ ok: false, error: "不知道是谁留的" }, { status: 400 });
  }

  const greeting: HomeGreeting = await db.homeGreeting.upsert({
    where: { pairId },
    update: { heading: heading.trim(), subtitle: sub, authorRole },
    create: {
      pairId,
      heading: heading.trim(),
      subtitle: sub,
      authorRole,
    },
  });
  return NextResponse.json({ ok: true, greeting });
}
