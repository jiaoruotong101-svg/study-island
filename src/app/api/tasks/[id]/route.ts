import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAccountFromRequest } from "@/lib/auth";

/**
 * 单个任务操作。
 *
 * - PATCH /api/tasks/[id]：更新任务
 *   - { done?: boolean }：勾选完成/取消完成（completedAt 同步）
 *   - { incPomodoro?: true }：完成番茄数 +1（番茄钟结束时调用）
 * - DELETE /api/tasks/[id]：删除任务
 *
 * 多对隔离：先查记录确认 record.pairId === 当前账号 pairId，
 * 不匹配返回 404，防止越权。
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type PatchBody =
  | { done?: boolean; incPomodoro?: boolean }
  | Record<string, unknown>;

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const acc = await getAccountFromRequest();
  if (!acc) {
    return NextResponse.json(
      { ok: false, error: "请先登录" },
      { status: 401 },
    );
  }
  const pairId = acc.pairId;

  const { id } = await params;
  let body: PatchBody;
  try {
    body = (await req.json()) as PatchBody;
  } catch {
    return NextResponse.json(
      { ok: false, error: "请求格式不对呀" },
      { status: 400 },
    );
  }

  const existing = await db.task.findUnique({ where: { id } });
  if (!existing || existing.pairId !== pairId) {
    return NextResponse.json({ ok: false, error: "任务不见了" }, { status: 404 });
  }

  const data: {
    done?: boolean;
    completedAt?: Date | null;
    completedPomodoros?: { increment: number };
  } = {};

  if (typeof body.done === "boolean") {
    data.done = body.done;
    data.completedAt = body.done ? new Date() : null;
  }
  if (body.incPomodoro === true) {
    data.completedPomodoros = { increment: 1 };
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ ok: true, task: existing });
  }

  const task = await db.task.update({ where: { id }, data });
  return NextResponse.json({ ok: true, task });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const acc = await getAccountFromRequest();
  if (!acc) {
    return NextResponse.json(
      { ok: false, error: "请先登录" },
      { status: 401 },
    );
  }
  const pairId = acc.pairId;

  const { id } = await params;
  try {
    // 防越权：先确认归属再删
    const existing = await db.task.findUnique({ where: { id } });
    if (!existing || existing.pairId !== pairId) {
      return NextResponse.json({ ok: false, error: "任务已不在了" }, { status: 404 });
    }
    await db.task.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false, error: "任务已不在了" }, { status: 404 });
  }
}
