import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";
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
 *
 * 注意：Supabase PostgREST 不支持 Prisma 的 { increment: N } 原子自增，
 * 因此 incPomodoro 先读当前 completedPomodoros 再 update 为 +1。
 * 产品仅 2 人/对，并发概率极低，可接受。
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

  const supabase = getSupabase();
  // 防越权：按 id + pairId 双过滤
  const { data: existing, error: findErr } = await supabase
    .from("Task")
    .select("*")
    .eq("id", id)
    .eq("pairId", pairId)
    .maybeSingle();
  if (findErr || !existing) {
    return NextResponse.json({ ok: false, error: "任务不见了" }, { status: 404 });
  }

  const update: Record<string, unknown> = { updatedAt: new Date().toISOString() };

  if (typeof body.done === "boolean") {
    update.done = body.done;
    update.completedAt = body.done ? new Date().toISOString() : null;
  }
  if (body.incPomodoro === true) {
    update.completedPomodoros = (existing.completedPomodoros ?? 0) + 1;
  }

  const { data: task, error: updateErr } = await supabase
    .from("Task")
    .update(update)
    .eq("id", id)
    .eq("pairId", pairId)
    .select()
    .single();
  if (updateErr || !task) {
    return NextResponse.json(
      { ok: false, error: "没能更新，再试一次看看" },
      { status: 500 },
    );
  }
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
  const supabase = getSupabase();
  // 防越权：按 id + pairId 双过滤删除
  const { error, count } = await supabase
    .from("Task")
    .delete({ count: "exact" })
    .eq("id", id)
    .eq("pairId", pairId);
  if (error) {
    return NextResponse.json(
      { ok: false, error: "任务已不在了" },
      { status: 404 },
    );
  }
  if (count === 0) {
    return NextResponse.json({ ok: false, error: "任务已不在了" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
