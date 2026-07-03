import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  generatePairCode,
  hashPassword,
  setSessionCookie,
} from "@/lib/auth";

/**
 * 注册账号。
 *
 * 两种流程：
 *   - 姐姐注册：创建 Pair（生成配对码）+ 创建 sister 账号
 *   - 妹妹注册：body 带 pairCode，关联到已有 Pair + 创建 younger 账号
 *
 * body: { username, password, displayName, role, pairCode? }
 *   - role="sister"：不需要 pairCode（自己是创建者）
 *   - role="younger"：必须带 pairCode（关联姐姐的 Pair）
 *
 * 注册成功后自动登录（种 cookie）。
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isValidRole(v: unknown): v is "sister" | "younger" {
  return v === "sister" || v === "younger";
}

export async function POST(req: NextRequest) {
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
  const { username, password, displayName, role, pairCode } = body as {
    username?: unknown;
    password?: unknown;
    displayName?: unknown;
    role?: unknown;
    pairCode?: unknown;
  };

  // 校验基础字段
  if (typeof username !== "string" || !/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
    return NextResponse.json(
      { ok: false, error: "用户名 3-20 位，只能字母数字下划线" },
      { status: 400 },
    );
  }
  if (typeof password !== "string" || password.length < 6 || password.length > 64) {
    return NextResponse.json(
      { ok: false, error: "密钥 6-64 位" },
      { status: 400 },
    );
  }
  if (typeof displayName !== "string" || displayName.trim().length === 0 || displayName.length > 20) {
    return NextResponse.json(
      { ok: false, error: "给自己起个名字吧（20 字以内）" },
      { status: 400 },
    );
  }
  if (!isValidRole(role)) {
    return NextResponse.json({ ok: false, error: "角色不对" }, { status: 400 });
  }

  // 用户名唯一
  const existing = await db.account.findUnique({ where: { username } });
  if (existing) {
    return NextResponse.json(
      { ok: false, error: "这个用户名已经有人用了" },
      { status: 400 },
    );
  }

  const passwordHash = await hashPassword(password);

  // 姐姐：创建 Pair；妹妹：关联已有 Pair
  let pairId: string;
  let pairCodeOut: string | undefined;

  if (role === "sister") {
    // 姐姐注册：生成配对码并创建 Pair
    let code = generatePairCode();
    // 避免极小概率重复
    while (await db.pair.findUnique({ where: { code } })) {
      code = generatePairCode();
    }
    const pair = await db.pair.create({
      data: { code, createdBy: "pending" },
    });
    pairId = pair.id;
    pairCodeOut = code;
  } else {
    // 妹妹注册：校验配对码
    if (typeof pairCode !== "string" || pairCode.length !== 6) {
      return NextResponse.json(
        { ok: false, error: "请输入姐姐给你的 6 位配对码" },
        { status: 400 },
      );
    }
    const upperCode = pairCode.toUpperCase();
    const pair = await db.pair.findUnique({ where: { code: upperCode } });
    if (!pair) {
      return NextResponse.json(
        { ok: false, error: "配对码不对，再跟姐姐确认一下" },
        { status: 400 },
      );
    }
    // 检查该 Pair 是否已有 younger（一对只能一个妹妹）
    const hasYounger = await db.account.findFirst({
      where: { pairId: pair.id, role: "younger" },
    });
    if (hasYounger) {
      return NextResponse.json(
        { ok: false, error: "这个配对码已经有妹妹了" },
        { status: 400 },
      );
    }
    pairId = pair.id;
  }

  // 创建账号
  const account = await db.account.create({
    data: {
      username,
      passwordHash,
      displayName: displayName.trim(),
      role,
      pairId,
    },
  });

  // 姐姐注册时回填 Pair.createdBy
  if (role === "sister") {
    await db.pair.update({
      where: { id: pairId },
      data: { createdBy: account.id },
    });
  }

  // 自动登录
  await setSessionCookie(account.id);

  return NextResponse.json(
    {
      ok: true,
      account: {
        id: account.id,
        username: account.username,
        displayName: account.displayName,
        role: account.role,
        pairId: account.pairId,
      },
      pairCode: pairCodeOut,
    },
    { status: 201 },
  );
}
