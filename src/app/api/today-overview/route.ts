import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

/**
 * 今日概览聚合。
 *
 * 返回：今日待完成任务数、已完成任务数、今日专注总分钟数。
 * 首页 TodayOverview 卡片用此数据替换演示数据。
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function todayStr(): string {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

export async function GET(_req: NextRequest) {
  const date = todayStr();
  const start = new Date(`${date}T00:00:00`);
  const end = new Date(`${date}T23:59:59.999`);

  const [tasks, focusSessions] = await Promise.all([
    db.task.findMany({ where: { taskDate: date } }),
    db.focusSession.findMany({
      where: {
        completedAt: { gte: start, lte: end },
        type: "focus",
      },
    }),
  ]);

  const completedTaskCount = tasks.filter((t) => t.done).length;
  const pendingTaskCount = tasks.length - completedTaskCount;
  const focusMinutes = focusSessions.reduce(
    (sum, s) => sum + s.durationMinutes,
    0,
  );

  return NextResponse.json({
    pendingTaskCount,
    completedTaskCount,
    focusMinutes,
  });
}
