import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAccountFromRequest } from "@/lib/auth";

/**
 * 获取当前登录账号 + 配对信息。
 *
 * 返回：
 *   - 未登录：{ account: null }
 *   - 已登录：{ account: {...}, pair: { code, partner: {...}|null } }
 *     partner 是配对的另一端账号（姐姐能看到妹妹的 displayName，反之亦然）
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const acc = await getAccountFromRequest();
  if (!acc) {
    return NextResponse.json({ account: null });
  }

  const pair = await db.pair.findUnique({ where: { id: acc.pairId } });

  // 找配对的另一端账号
  const partner = await db.account.findFirst({
    where: {
      pairId: acc.pairId,
      role: acc.role === "sister" ? "younger" : "sister",
    },
    select: { id: true, displayName: true, role: true, username: true },
  });

  return NextResponse.json({
    account: acc,
    pair: pair
      ? {
          code: pair.code,
          partner,
        }
      : null,
  });
}
