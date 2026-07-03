import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { getSupabase, SUPABASE_BUCKET } from "@/lib/supabase";
import { getAccountFromRequest } from "@/lib/auth";

/**
 * 错题记录 API —— 列表 / 新建
 *
 * - GET  /api/mistakes         返回当前配对的全部错题（按 createdAt desc），每条带 url
 * - POST /api/mistakes         新建一条错题记录
 *
 * 多对隔离：所有读写都按当前账号的 pairId 过滤。
 *
 * 文件 url 直接返回 Supabase Storage 公开 URL：
 *   https://xxx.supabase.co/storage/v1/object/public/<bucket>/<filename>
 * 前端用 url 字段不变，不再走 /api/files/<filename>。
 */

export const runtime = "nodejs";

type MistakeType = "image" | "voice";
type CreatorRole = "sister" | "younger";

/** 对外 DTO —— 加上可直接访问的 url，避免前端拼接。 */
interface MistakeRecordDTO {
  id: string;
  type: MistakeType;
  filePath: string;
  url: string;
  mimeType: string;
  duration: number | null;
  note: string | null;
  subject: string | null;
  createdBy: CreatorRole;
  createdAt: string;
}

function toDTO(r: {
  id: string;
  type: string;
  filePath: string;
  mimeType: string;
  duration: number | null;
  note: string | null;
  subject: string | null;
  createdBy: string;
  createdAt: string;
}): MistakeRecordDTO {
  const supabase = getSupabase();
  const { data } = supabase.storage
    .from(SUPABASE_BUCKET)
    .getPublicUrl(r.filePath);
  return {
    id: r.id,
    type: r.type as MistakeType,
    filePath: r.filePath,
    url: data.publicUrl,
    mimeType: r.mimeType,
    duration: r.duration,
    note: r.note,
    subject: r.subject,
    createdBy: r.createdBy as CreatorRole,
    createdAt: r.createdAt,
  };
}

/* ============ 类型守卫 ============ */

function isString(v: unknown): v is string {
  return typeof v === "string" && v.length > 0;
}

function toMistakeType(v: unknown): MistakeType | null {
  return v === "image" || v === "voice" ? v : null;
}

function toCreator(v: unknown): CreatorRole | null {
  return v === "sister" || v === "younger" ? v : null;
}

function toOptionalString(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const trimmed = v.trim();
  return trimmed.length === 0 ? null : trimmed;
}

function toOptionalInt(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return Math.max(0, Math.floor(v));
  if (typeof v === "string" && /^\d+$/.test(v)) return parseInt(v, 10);
  return null;
}

interface CreateBody {
  type?: unknown;
  filePath?: unknown;
  mimeType?: unknown;
  duration?: unknown;
  note?: unknown;
  subject?: unknown;
  createdBy?: unknown;
}

/* ============ GET 列表 ============ */

export async function GET() {
  const acc = await getAccountFromRequest();
  if (!acc) {
    return NextResponse.json(
      { ok: false, error: "请先登录" },
      { status: 401 },
    );
  }
  const pairId = acc.pairId;

  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from("MistakeRecord")
      .select("*")
      .eq("pairId", pairId)
      .order("createdAt", { ascending: false });
    if (error) {
      console.error("[mistakes] GET 失败", error);
      return NextResponse.json(
        { error: "暂时没能读到错题本，稍后再试" },
        { status: 500 },
      );
    }
    return NextResponse.json((data ?? []).map(toDTO));
  } catch (err) {
    console.error("[mistakes] GET 失败", err);
    return NextResponse.json(
      { error: "暂时没能读到错题本，稍后再试" },
      { status: 500 },
    );
  }
}

/* ============ POST 新建 ============ */

export async function POST(req: NextRequest) {
  const acc = await getAccountFromRequest();
  if (!acc) {
    return NextResponse.json(
      { ok: false, error: "请先登录" },
      { status: 401 },
    );
  }
  const pairId = acc.pairId;

  let body: CreateBody;
  try {
    body = (await req.json()) as CreateBody;
  } catch {
    return NextResponse.json(
      { error: "请求体不是合法的 JSON" },
      { status: 400 },
    );
  }

  const type = toMistakeType(body.type);
  const filePath = isString(body.filePath) ? body.filePath : null;
  const mimeType = isString(body.mimeType) ? body.mimeType : null;
  const createdBy = toCreator(body.createdBy);

  if (!type || !filePath || !mimeType || !createdBy) {
    return NextResponse.json(
      {
        error:
          "缺少必填字段：type / filePath / mimeType / createdBy",
      },
      { status: 400 },
    );
  }

  // 防止路径穿越：filePath 应当只是文件名
  if (filePath.includes("/") || filePath.includes("..")) {
    return NextResponse.json(
      { error: "filePath 不合法" },
      { status: 400 },
    );
  }

  const duration =
    type === "voice" ? toOptionalInt(body.duration) : null;
  const note = toOptionalString(body.note);
  const subject = toOptionalString(body.subject);

  try {
    const supabase = getSupabase();
    const { data: created, error } = await supabase
      .from("MistakeRecord")
      .insert({
        id: randomUUID(),
        type,
        filePath,
        mimeType,
        duration,
        note,
        subject,
        createdBy,
        pairId,
        createdAt: new Date().toISOString(),
      })
      .select()
      .single();
    if (error || !created) {
      console.error("[mistakes] POST 失败", error);
      return NextResponse.json(
        { error: "没能记下来，再试一次看看" },
        { status: 500 },
      );
    }
    return NextResponse.json(toDTO(created), { status: 201 });
  } catch (err) {
    console.error("[mistakes] POST 失败", err);
    return NextResponse.json(
      { error: "没能记下来，再试一次看看" },
      { status: 500 },
    );
  }
}
