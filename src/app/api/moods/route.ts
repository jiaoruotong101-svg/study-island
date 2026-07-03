import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { getSupabase } from "@/lib/supabase";
import { getAccountFromRequest } from "@/lib/auth";
import { MOOD_OPTIONS } from "@/lib/mood-types";
import type { CreatorRole } from "@/lib/mood-types";

/**
 * 心情记录。
 *
 * - GET ?date=YYYY-MM-DD：返回该日心情记录（默认今天），createdAt desc
 *   可选 ?role=sister|younger 过滤
 * - POST：新建一条心情记录 { role, mood, note? }
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

function isValidMood(v: unknown): v is string {
  return typeof v === "string" && MOOD_OPTIONS.some((m) => m.key === v);
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
  const role = req.nextUrl.searchParams.get("role");
  const start = new Date(`${date}T00:00:00`).toISOString();
  const end = new Date(`${date}T23:59:59.999`).toISOString();

  const supabase = getSupabase();
  let query = supabase
    .from("MoodEntry")
    .select("*")
    .eq("pairId", pairId)
    .gte("createdAt", start)
    .lte("createdAt", end)
    .order("createdAt", { ascending: false });
  if (role && isValidRole(role)) {
    query = query.eq("role", role);
  }
  const { data: entries, error } = await query;
  if (error) {
    return NextResponse.json(
      { ok: false, error: "暂时没能读到心情，稍等再试" },
      { status: 500 },
    );
  }
  return NextResponse.json({ entries: entries ?? [] });
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
  const { role, mood, note } = body as {
    role?: unknown;
    mood?: unknown;
    note?: unknown;
  };

  if (!isValidRole(role)) {
    return NextResponse.json({ ok: false, error: "不知道是谁的心情" }, { status: 400 });
  }
  if (!isValidMood(mood)) {
    return NextResponse.json({ ok: false, error: "选一个心情吧" }, { status: 400 });
  }
  const safeNote =
    typeof note === "string" && note.trim().length > 0
      ? note.trim().slice(0, 200)
      : null;

  const supabase = getSupabase();
  const { data: entry, error } = await supabase
    .from("MoodEntry")
    .insert({
      id: randomUUID(),
      role,
      mood,
      note: safeNote,
      pairId,
      createdAt: new Date().toISOString(),
    })
    .select()
    .single();
  if (error || !entry) {
    return NextResponse.json(
      { ok: false, error: "没能记下来，再试一次看看" },
      { status: 500 },
    );
  }
  return NextResponse.json({ ok: true, entry }, { status: 201 });
}
