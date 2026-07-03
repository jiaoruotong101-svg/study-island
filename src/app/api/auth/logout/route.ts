import { NextResponse } from "next/server";
import { clearSessionCookie } from "@/lib/auth";

/** 退出登录：清 cookie。 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  await clearSessionCookie();
  return NextResponse.json({ ok: true });
}
