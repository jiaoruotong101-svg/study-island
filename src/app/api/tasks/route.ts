import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAccountFromRequest } from "@/lib/auth";
import type { CreatorRole } from "@/lib/task-types";

/**
 * 今日任务。
 *
 * - GET ?date=YYYY-MM-DD：返回该日任务（默认今天），按 createdAt asc
 * - POST：新建任务，title 必填，subject/estimatedPomodoros 可选
 *
 * 任务归属日期由前端传 taskDate（YYYY-MM-DD），默认今天。
 * 姐姐和妹妹都能创建，体现"自主规划"。
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
  const tasks = await db.task.findMany({
    where: { pairId, taskDate: date },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json({ tasks });
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
  const {
    title,
    subject,
    estimatedPomodoros,
    createdBy,
    taskDate,
  } = body as {
    title?: unknown;
    subject?: unknown;
    estimatedPomodoros?: unknown;
    createdBy?: unknown;
    taskDate?: unknown;
  };

  if (typeof title !== "string" || title.trim().length === 0) {
    return NextResponse.json({ ok: false, error: "给任务起个名字吧" }, { status: 400 });
  }
  if (title.length > 100) {
    return NextResponse.json(
      { ok: false, error: "任务名有点长，100 字以内就好" },
      { status: 400 },
    );
  }
  if (!isValidRole(createdBy)) {
    return NextResponse.json({ ok: false, error: "不知道是谁的任务" }, { status: 400 });
  }

  const est =
    typeof estimatedPomodoros === "number" &&
    Number.isFinite(estimatedPomodoros) &&
    estimatedPomodoros >= 1 &&
    estimatedPomodoros <= 12
      ? Math.floor(estimatedPomodoros)
      : 1;

  const subj =
    typeof subject === "string" && subject.trim().length > 0
      ? subject.trim().slice(0, 20)
      : null;

  const date =
    typeof taskDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(taskDate)
      ? taskDate
      : todayStr();

  const task = await db.task.create({
    data: {
      title: title.trim(),
      subject: subj,
      estimatedPomodoros: est,
      completedPomodoros: 0,
      done: false,
      createdBy,
      taskDate: date,
      pairId,
    },
  });
  return NextResponse.json({ ok: true, task }, { status: 201 });
}
