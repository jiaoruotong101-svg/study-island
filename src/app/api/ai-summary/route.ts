import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAccountFromRequest } from "@/lib/auth";
import { getMoodOption } from "@/lib/mood-types";
import ZAI from "z-ai-web-dev-sdk";

/**
 * AI 总结（姐姐视角）。
 *
 * 聚合妹妹近 7 天的学习数据（专注/任务/心情/错题），
 * 调 z-ai-web-dev-sdk LLM 生成一段温暖的陪伴向总结。
 *
 * 设计：不是冰冷的数据报告，是"姐姐一直陪着"的温暖话语。
 * 体现"陪伴而非监督"：鼓励/成长/坚持，禁用催促/警告/排名。
 *
 * 多对隔离：所有子查询都按当前账号的 pairId 过滤。
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

function dateStr(d: Date): string {
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

function lastNDates(n: number): string[] {
  const out: string[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    out.push(dateStr(d));
  }
  return out;
}

const SYSTEM_PROMPT = `你是一个温柔的学习陪伴助手，专门为姐姐写一段关于妹妹近期学习状态的总结。

你的写作原则：
1. 语气温暖、鼓励、像姐姐在跟自己说话，体现"陪伴而非监督"
2. 关注妹妹的"坚持"和"努力"，不关注"完成率不足""落后"
3. 禁止使用：监督、催促、警告、排名、对比、达标率、落后、不够、差、糟糕 等词
4. 多用：坚持、慢慢来、陪伴、成长、努力、了不起、不急、一直在 等词
5. 长度 150-250 字，2-3 段，口语化，像在跟姐姐聊天
6. 可以适当提一个具体的观察（比如某个科目花了多少时间、某种心情出现的次数）
7. 结尾给姐姐一句温暖的提醒（比如"她今天也在努力着""你也在陪着她，辛苦了"）
8. 用中文，用"妹妹"称呼，不用"她/该用户"`;

export async function POST(req: NextRequest) {
  const acc = await getAccountFromRequest();
  if (!acc) {
    return NextResponse.json(
      { ok: false, error: "请先登录" },
      { status: 401 },
    );
  }
  const pairId = acc.pairId;

  // 可选 body：days（默认7）
  let days = 7;
  try {
    const body = await req.json();
    if (typeof body?.days === "number" && body.days >= 1 && body.days <= 30) {
      days = Math.floor(body.days);
    }
  } catch {
    // 允许空 body
  }

  const dates = lastNDates(days);
  const startDate = new Date(dates[0]!);
  startDate.setHours(0, 0, 0, 0);
  const endDate = new Date();
  endDate.setHours(23, 59, 59, 999);

  // 全部按 pairId 过滤
  const [focusSessions, tasks, mistakes, moods] = await Promise.all([
    db.focusSession.findMany({
      where: {
        pairId,
        type: "focus",
        completedAt: { gte: startDate, lte: endDate },
      },
    }),
    db.task.findMany({ where: { pairId, taskDate: { in: dates } } }),
    db.mistakeRecord.findMany({
      where: { pairId, createdAt: { gte: startDate, lte: endDate } },
    }),
    db.moodEntry.findMany({
      where: { pairId, createdAt: { gte: startDate, lte: endDate } },
    }),
  ]);

  // 聚合
  const totalFocusMinutes = focusSessions.reduce(
    (s, x) => s + x.durationMinutes,
    0,
  );
  const pomodoroCount = focusSessions.length;
  const completedTasks = tasks.filter((t) => t.done).length;
  const pendingTasks = tasks.length - completedTasks;

  // 心情分布
  const moodCounts = new Map<string, number>();
  for (const m of moods) {
    moodCounts.set(m.mood, (moodCounts.get(m.mood) ?? 0) + 1);
  }
  const moodSummary = Array.from(moodCounts.entries())
    .map(([key, count]) => {
      const opt = getMoodOption(key);
      return opt ? `${opt.emoji}${opt.label}${count}次` : null;
    })
    .filter(Boolean);

  // 科目分布（任务 + 错题）
  const subjectMap = new Map<string, { tasks: number; mistakes: number }>();
  for (const t of tasks) {
    const sub = t.subject ?? "其他";
    const e = subjectMap.get(sub) ?? { tasks: 0, mistakes: 0 };
    e.tasks += 1;
    subjectMap.set(sub, e);
  }
  for (const m of mistakes) {
    const sub = m.subject ?? "其他";
    const e = subjectMap.get(sub) ?? { tasks: 0, mistakes: 0 };
    e.mistakes += 1;
    subjectMap.set(sub, e);
  }
  const subjectSummary = Array.from(subjectMap.entries())
    .filter(([, v]) => v.tasks > 0 || v.mistakes > 0)
    .map(([sub, v]) => `${sub}（任务${v.tasks}/错题${v.mistakes}）`);

  // 坚持天数
  const activeDays = new Set(focusSessions.map((s) => dateStr(s.completedAt))).size;

  const dataSummary = [
    `时间范围：近 ${days} 天`,
    `坚持天数：${activeDays} 天`,
    `累计专注：${totalFocusMinutes} 分钟（${pomodoroCount} 个番茄）`,
    `任务：完成 ${completedTasks} 个，待完成 ${pendingTasks} 个`,
    `错题：记录了 ${mistakes.length} 道`,
    moodSummary.length > 0 ? `心情记录：${moodSummary.join("、")}` : "心情记录：暂无",
    subjectSummary.length > 0
      ? `科目分布：${subjectSummary.join("、")}`
      : "科目分布：暂无",
  ].join("\n");

  try {
    const zai = await ZAI.create();
    const completion = await zai.chat.completions.create({
      messages: [
        { role: "assistant", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: `请根据以下妹妹近 ${days} 天的学习数据，为姐姐写一段温暖的总结：\n\n${dataSummary}`,
        },
      ],
      thinking: { type: "disabled" },
    });

    const summary = completion.choices[0]?.message?.content?.trim();
    if (!summary) {
      return NextResponse.json(
        { ok: false, error: "AI 没能写出总结，再试一次吧" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      ok: true,
      summary,
      meta: {
        days,
        totalFocusMinutes,
        pomodoroCount,
        completedTasks,
        pendingTasks,
        mistakeCount: mistakes.length,
        activeDays,
      },
    });
  } catch (e) {
    console.error("[ai-summary] LLM error", e);
    return NextResponse.json(
      { ok: false, error: "AI 暂时不在，稍等再试" },
      { status: 502 },
    );
  }
}
