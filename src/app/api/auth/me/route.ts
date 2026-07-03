import { NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";
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

  const supabase = getSupabase();
  const { data: pair } = await supabase
    .from("Pair")
    .select("*")
    .eq("id", acc.pairId)
    .maybeSingle();

  // 找配对的另一端账号
  const partnerRole = acc.role === "sister" ? "younger" : "sister";
  const { data: partner } = await supabase
    .from("Account")
    .select("id, displayName, role, username")
    .eq("pairId", acc.pairId)
    .eq("role", partnerRole)
    .maybeSingle();

  return NextResponse.json({
    account: acc,
    pair: pair
      ? {
          code: pair.code,
          partner: partner
            ? {
                id: partner.id,
                displayName: partner.displayName,
                role: partner.role,
                username: partner.username,
              }
            : null,
        }
      : null,
  });
}
