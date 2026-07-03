import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

/**
 * 首页小岛留言（共享语录）。
 *
 * 单例：固定 id = "island-quote"，姐姐和妹妹都能改。
 * - GET：取当前留言；无则返回 null（前端回退到默认语录库）
 * - PUT：upsert 更新，作者视角由请求体 authorRole 决定
 *
 * 实时同步由 chat-service socket 广播 quote:updated 事件，
 * 本接口只负责持久化。
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const QUOTE_ID = "island-quote";

function isValidRole(v: unknown): v is "sister" | "younger" {
  return v === "sister" || v === "younger";
}

export async function GET() {
  const row = await db.homeQuote.findUnique({ where: { id: QUOTE_ID } });
  return NextResponse.json({ quote: row });
}

export async function PUT(req: NextRequest) {
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

  const quote = await db.homeQuote.upsert({
    where: { id: QUOTE_ID },
    update: { content: content.trim(), authorRole },
    create: { id: QUOTE_ID, content: content.trim(), authorRole },
  });
  return NextResponse.json({ ok: true, quote });
}
