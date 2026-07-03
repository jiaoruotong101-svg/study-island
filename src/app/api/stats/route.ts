import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";
import { getAccountFromRequest } from "@/lib/auth";
import { MOOD_OPTIONS } from "@/lib/mood-types";
import type {
  DailyFocusStat,
  MoodStatItem,
  SubjectStatItem,
  StatsData,
} from "@/lib/stats-types";

/**
 * 学习统计聚合。
 *
 * 返回：累计专注分钟/番茄/错题/坚持天数 +
 * 近 7 天每日专注趋势 + 任务完成 + 心情分布 + 科目分布。
 *
 * 体现"陪伴而非监督"：只看坚持的轨迹，不做排名/对比/警告。
 *
 * 多对隔离：所有子查询都按当前账号的 pairId 过滤。
 *
 * 注意：Supabase REST API 返回的 timestamptz 字段为 ISO 字符串，
 * 本接口用 ISO 字符串做范围/按日比较（ISO UTC Z 字符串字典序 == 时间序）。
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SUBJECTS = ["数学", "语文", "英语", "物理", "化学", "生物", "历史", "地理", "政治", "其他"];

function dateStr(d: Date | string): string {
  const date = typeof d === "string" ? new Date(d) : d;
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${m}-${day}`;
}

/** 近 N 天的日期数组（含今天，按 asc） */
function lastNDays(n: number): Date[] {
  const days: Date[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    days.push(d);
  }
  return days;
}

const WEEKDAY_LABELS = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];

export async function GET(_req: NextRequest) {
  const acc = await getAccountFromRequest();
  if (!acc) {
    return NextResponse.json(
      { ok: false, error: "请先登录" },
      { status: 401 },
    );
  }
  const pairId = acc.pairId;

  const days = lastNDays(7);
  const startDate = days[0]!;
  const start = new Date(startDate);
  start.setHours(0, 0, 0, 0);
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  const startISO = start.toISOString();
  const endISO = end.toISOString();

  // 并行查询：累计 + 近7天（全部按 pairId 过滤）
  const supabase = getSupabase();
  const [
    allFocusRes,
    allMistakesRes,
    weeklyFocusRes,
    weeklyTasksRes,
    weeklyMistakesRes,
    weeklyMoodsRes,
  ] = await Promise.all([
    supabase
      .from("FocusSession")
      .select("*")
      .eq("pairId", pairId)
      .eq("type", "focus"),
    supabase.from("MistakeRecord").select("*").eq("pairId", pairId),
    supabase
      .from("FocusSession")
      .select("*")
      .eq("pairId", pairId)
      .eq("type", "focus")
      .gte("completedAt", startISO)
      .lte("completedAt", endISO),
    supabase
      .from("Task")
      .select("*")
      .eq("pairId", pairId)
      .in("taskDate", days.map(dateStr)),
    supabase
      .from("MistakeRecord")
      .select("*")
      .eq("pairId", pairId)
      .gte("createdAt", startISO)
      .lte("createdAt", endISO),
    supabase
      .from("MoodEntry")
      .select("*")
      .eq("pairId", pairId)
      .gte("createdAt", startISO)
      .lte("createdAt", endISO),
  ]);

  const allFocusSessions = allFocusRes.data ?? [];
  const allMistakes = allMistakesRes.data ?? [];
  const weeklyFocus = weeklyFocusRes.data ?? [];
  const weeklyTasks = weeklyTasksRes.data ?? [];
  const weeklyMistakes = weeklyMistakesRes.data ?? [];
  const weeklyMoods = weeklyMoodsRes.data ?? [];

  // 累计
  const totalFocusMinutes = allFocusSessions.reduce(
    (s, x) => s + x.durationMinutes,
    0,
  );
  const totalPomodoros = allFocusSessions.length;
  const totalMistakes = allMistakes.length;
  // 坚持天数：有 focus session 的不同日期数
  const activeDaysSet = new Set(
    allFocusSessions.map((s) => dateStr(s.completedAt)),
  );
  const activeDays = activeDaysSet.size;

  // 近7天每日专注 —— 用 ISO 字符串做比较（UTC Z 字典序 == 时间序）
  const dailyFocus: DailyFocusStat[] = days.map((d) => {
    const ds = dateStr(d);
    const dayStart = new Date(d);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(d);
    dayEnd.setHours(23, 59, 59, 999);
    const dayStartISO = dayStart.toISOString();
    const dayEndISO = dayEnd.toISOString();
    const sessions = weeklyFocus.filter(
      (s) => s.completedAt >= dayStartISO && s.completedAt <= dayEndISO,
    );
    const focusMinutes = sessions.reduce((sum, s) => sum + s.durationMinutes, 0);
    const weekday = WEEKDAY_LABELS[d.getDay()];
    return {
      date: ds,
      label: weekday!,
      focusMinutes,
      pomodoroCount: sessions.length,
    };
  });

  // 近7天任务
  const weeklyCompletedTasks = weeklyTasks.filter((t) => t.done).length;
  const weeklyPendingTasks = weeklyTasks.length - weeklyCompletedTasks;

  // 近7天心情分布
  const moodCounts = new Map<string, number>();
  for (const m of weeklyMoods) {
    moodCounts.set(m.mood, (moodCounts.get(m.mood) ?? 0) + 1);
  }
  const moodDistribution: MoodStatItem[] = MOOD_OPTIONS.map((opt) => ({
    mood: opt.key,
    label: opt.label,
    emoji: opt.emoji,
    count: moodCounts.get(opt.key) ?? 0,
  })).filter((x) => x.count > 0);

  // 近7天科目分布（任务 + 错题）
  const subjectMap = new Map<string, SubjectStatItem>();
  for (const sub of SUBJECTS) {
    subjectMap.set(sub, { subject: sub, taskCount: 0, mistakeCount: 0 });
  }
  for (const t of weeklyTasks) {
    const sub = t.subject && SUBJECTS.includes(t.subject) ? t.subject : "其他";
    const item = subjectMap.get(sub);
    if (item) item.taskCount += 1;
  }
  for (const m of weeklyMistakes) {
    const sub = m.subject && SUBJECTS.includes(m.subject) ? m.subject : "其他";
    const item = subjectMap.get(sub);
    if (item) item.mistakeCount += 1;
  }
  const subjectDistribution = Array.from(subjectMap.values()).filter(
    (x) => x.taskCount > 0 || x.mistakeCount > 0,
  );

  const data: StatsData = {
    totalFocusMinutes,
    totalPomodoros,
    totalMistakes,
    activeDays,
    dailyFocus,
    weeklyCompletedTasks,
    weeklyPendingTasks,
    moodDistribution,
    subjectDistribution,
  };

  return NextResponse.json(data);
}
