import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import type { CreatorRole } from "@/lib/task-types";

/**
 * 专注/休息会话记录。
 *
 * - GET ?date=YYYY-MM-DD：返回该日会话（默认今天），completedAt desc
 *   可选 ?role=sister|younger 进一步过滤
 * - POST：记录一次完成的会话（番茄钟结束时调用）
 *   { role, taskId?, durationMinutes, type: "focus"|"break" }
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
  const date = req.nextUrl.searchParams.get("date") ?? todayStr();
  const role = req.nextUrl.searchParams.get("role");

  // 按日期过滤：completedAt 当天
  const start = new Date(`${date}T00:00:00`);
  const end = new Date(`${date}T23:59:59.999`);

  const sessions = await db.focusSession.findMany({
    where: {
      completedAt: { gte: start, lte: end },
      ...(role && isValidRole(role) ? { role } : {}),
    },
    orderBy: { completedAt: "desc" },
  });
  return NextResponse.json({ sessions });
}

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
  const { role, taskId, durationMinutes, type } = body as {
    role?: unknown;
    taskId?: unknown;
    durationMinutes?: unknown;
    type?: unknown;
  };

  if (!isValidRole(role)) {
    return NextResponse.json({ ok: false, error: "不知道是谁专注的" }, { status: 400 });
  }
  if (type !== "focus" && type !== "break") {
    return NextResponse.json({ ok: false, error: "类型不对" }, { status: 400 });
  }
  const dur =
    typeof durationMinutes === "number" &&
    Number.isFinite(durationMinutes) &&
    durationMinutes > 0 &&
    durationMinutes <= 120
      ? Math.floor(durationMinutes)
      : 25;
  const tid = typeof taskId === "string" && taskId.length > 0 ? taskId : null;

  const session = await db.focusSession.create({
    data: { role, taskId: tid, durationMinutes: dur, type },
  });
  return NextResponse.json({ ok: true, session }, { status: 201 });
}
