import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAccountFromRequest } from "@/lib/auth";

/**
 * 聊天消息 API —— 历史拉取 / 新建持久化。
 *
 * - GET  /api/chat/messages?limit=100  按 createdAt asc 返回，每条带 url
 * - POST /api/chat/messages             新建一条消息，返回完整记录
 *
 * 多对隔离：所有读写都按当前账号的 pairId 过滤。
 *
 * 与 socket.io 中继的关系：本接口只管"持久化"，
 * 实时分发由 mini-services/chat-service (端口 3003) 负责。
 * 前端流程：POST 本接口 → 拿到完整记录 → socket.emit('chat:send', record)。
 */

export const runtime = "nodejs";

type SenderRole = "sister" | "younger";
type MessageType = "text" | "voice";

/** 对外 DTO —— 加上可直接访问的 url，避免前端拼接。 */
interface ChatMessageDTO {
  id: string;
  senderRole: SenderRole;
  type: MessageType;
  content: string | null;
  filePath: string | null;
  duration: number | null;
  url: string | null;
  createdAt: string;
}

function toDTO(r: {
  id: string;
  senderRole: string;
  type: string;
  content: string | null;
  filePath: string | null;
  duration: number | null;
  createdAt: Date;
}): ChatMessageDTO {
  return {
    id: r.id,
    senderRole: r.senderRole as SenderRole,
    type: r.type as MessageType,
    content: r.content,
    filePath: r.filePath,
    duration: r.duration,
    url: r.filePath
      ? `/api/files/${encodeURIComponent(r.filePath)}`
      : null,
    createdAt: r.createdAt.toISOString(),
  };
}

/* ============ 类型守卫 ============ */

function isSenderRole(v: unknown): v is SenderRole {
  return v === "sister" || v === "younger";
}

function isMessageType(v: unknown): v is MessageType {
  return v === "text" || v === "voice";
}

function isNonEmptyString(v: unknown): v is string {
  return typeof v === "string" && v.trim().length > 0;
}

function toOptionalInt(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) {
    return Math.max(0, Math.floor(v));
  }
  if (typeof v === "string" && /^\d+$/.test(v)) {
    return parseInt(v, 10);
  }
  return null;
}

/** limit 查询参数：默认 100，范围 [1, 500] */
function parseLimit(raw: string | null): number {
  const n = parseInt(raw ?? "100", 10);
  if (!Number.isFinite(n) || n <= 0) return 100;
  return Math.min(n, 500);
}

interface CreateBody {
  senderRole?: unknown;
  type?: unknown;
  content?: unknown;
  filePath?: unknown;
  duration?: unknown;
}

/* ============ GET 历史 ============ */

export async function GET(req: NextRequest) {
  const acc = await getAccountFromRequest();
  if (!acc) {
    return NextResponse.json(
      { ok: false, error: "请先登录" },
      { status: 401 },
    );
  }
  const pairId = acc.pairId;

  const limit = parseLimit(req.nextUrl.searchParams.get("limit"));
  try {
    const records = await db.chatMessage.findMany({
      where: { pairId },
      orderBy: { createdAt: "asc" },
      take: limit,
    });
    return NextResponse.json(records.map(toDTO));
  } catch (err) {
    console.error("[chat/messages] GET 失败", err);
    return NextResponse.json(
      { error: "暂时没能读到聊天记录，稍等一下再试" },
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

  const senderRole = isSenderRole(body.senderRole) ? body.senderRole : null;
  const type = isMessageType(body.type) ? body.type : null;

  if (!senderRole || !type) {
    return NextResponse.json(
      { error: "缺少必填字段：senderRole / type" },
      { status: 400 },
    );
  }

  let content: string | null = null;
  let filePath: string | null = null;
  let duration: number | null = null;

  if (type === "text") {
    if (!isNonEmptyString(body.content)) {
      return NextResponse.json(
        { error: "文字消息内容不能为空" },
        { status: 400 },
      );
    }
    // 安全上限：单条文字 5000 字以内
    content = body.content.slice(0, 5000);
  } else {
    // type === "voice"
    if (!isNonEmptyString(body.filePath)) {
      return NextResponse.json(
        { error: "语音消息缺少 filePath" },
        { status: 400 },
      );
    }
    // 防路径穿越：filePath 应当只是文件名
    if (body.filePath.includes("/") || body.filePath.includes("..")) {
      return NextResponse.json(
        { error: "filePath 不合法" },
        { status: 400 },
      );
    }
    filePath = body.filePath;
    duration = toOptionalInt(body.duration);
  }

  try {
    const created = await db.chatMessage.create({
      data: { senderRole, type, content, filePath, duration, pairId },
    });
    return NextResponse.json(toDTO(created), { status: 201 });
  } catch (err) {
    console.error("[chat/messages] POST 失败", err);
    return NextResponse.json(
      { error: "消息没能发出去，再试一次看看" },
      { status: 500 },
    );
  }
}
