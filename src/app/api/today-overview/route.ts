import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";
import { getAccountFromRequest } from "@/lib/auth";
import { getMoodOption } from "@/lib/mood-types";

/**
 * 今日概览聚合。
 *
 * 返回：今日待完成任务数、已完成任务数、今日专注总分钟数、今日最新心情。
 * 首页 TodayOverview 卡片用此数据。
 *
 * 多对隔离：所有子查询都按当前账号的 pairId 过滤。
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
  const acc = await getAccountFromRequest();
  if (!acc) {
    return NextResponse.json(
      { ok: false, error: "请先登录" },
      { status: 401 },
    );
  }
  const pairId = acc.pairId;

  const date = todayStr();
  const start = new Date(`${date}T00:00:00`).toISOString();
  const end = new Date(`${date}T23:59:59.999`).toISOString();

  const supabase = getSupabase();
  const [tasksRes, focusRes, moodRes] = await Promise.all([
    supabase
      .from("Task")
      .select("*")
      .eq("pairId", pairId)
      .eq("taskDate", date),
    supabase
      .from("FocusSession")
      .select("durationMinutes")
      .eq("pairId", pairId)
      .eq("type", "focus")
      .gte("completedAt", start)
      .lte("completedAt", end),
    supabase
      .from("MoodEntry")
      .select("*")
      .eq("pairId", pairId)
      .gte("createdAt", start)
      .lte("createdAt", end)
      .order("createdAt", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const tasks = tasksRes.data ?? [];
  const focusSessions = focusRes.data ?? [];
  const latestMood = moodRes.data;

  const completedTaskCount = tasks.filter((t) => t.done).length;
  const pendingTaskCount = tasks.length - completedTaskCount;
  const focusMinutes = focusSessions.reduce(
    (sum, s) => sum + s.durationMinutes,
    0,
  );

  const moodOpt = latestMood ? getMoodOption(latestMood.mood) : undefined;

  return NextResponse.json({
    pendingTaskCount,
    completedTaskCount,
    focusMinutes,
    mood: latestMood && moodOpt
      ? { mood: latestMood.mood, label: moodOpt.label, emoji: moodOpt.emoji }
      : null,
  });
}
