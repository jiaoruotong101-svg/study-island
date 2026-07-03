import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAccountFromRequest } from "@/lib/auth";
import type { CreatorRole } from "@/lib/note-types";

/**
 * 每日留言（给彼此的小纸条，慢沟通）。
 *
 * - GET ?date=YYYY-MM-DD：返回该日留言（默认今天），createdAt asc（早写的在前）
 * - POST：新建一条留言 { authorRole, content, noteDate? }
 *
 * 多对隔离：所有读写都按当前账号的 pairId 过滤。
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function todayStr(): string {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

function isValidRole(v: unknown): v is CreatorRole {
  return v === "sister" || v === "younger";
}

export async function GET(req: NextRequest) {
  const acc = await getAccountFromRequest();
  if (!acc) {
    return NextResponse.json(
      { ok: false, error: "请先登录" },
      { status: 401 },
    );
  }
  const pairId = acc.pairId;

  const date = req.nextUrl.searchParams.get("date") ?? todayStr();
  const notes = await db.dailyNote.findMany({
    where: { pairId, noteDate: date },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json({ notes, date });
}

export async function POST(req: NextRequest) {
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
  const { authorRole, content, noteDate } = body as {
    authorRole?: unknown;
    content?: unknown;
    noteDate?: unknown;
  };

  if (!isValidRole(authorRole)) {
    return NextResponse.json({ ok: false, error: "不知道是谁留的" }, { status: 400 });
  }
  if (typeof content !== "string" || content.trim().length === 0) {
    return NextResponse.json({ ok: false, error: "留句话再走呀" }, { status: 400 });
  }
  if (content.length > 500) {
    return NextResponse.json(
      { ok: false, error: "小纸条有点长，500 字以内就好" },
      { status: 400 },
    );
  }
  const date =
    typeof noteDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(noteDate)
      ? noteDate
      : todayStr();

  const note = await db.dailyNote.create({
    data: { authorRole, content: content.trim(), noteDate: date, pairId },
  });
  return NextResponse.json({ ok: true, note }, { status: 201 });
}
