import { NextRequest, NextResponse } from "next/server";
import { getSupabase, SUPABASE_BUCKET } from "@/lib/supabase";
import { getAccountFromRequest } from "@/lib/auth";

/**
 * 错题记录单条 API —— 删除
 *
 * - DELETE /api/mistakes/[id]   先删 Supabase Storage 文件（容错），再删库记录
 *
 * 多对隔离：先查记录确认 record.pairId === 当前账号 pairId，
 * 不匹配返回 404，防止越权。
 *
 * runtime=nodejs：与文件系统无关，但保持与其他错题接口一致以便日后扩展。
 */

export const runtime = "nodejs";

function isSafeFilename(name: string): boolean {
  return (
    name.length > 0 &&
    !name.includes("/") &&
    !name.includes("\\") &&
    !name.includes("..")
  );
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const acc = await getAccountFromRequest();
  if (!acc) {
    return NextResponse.json(
      { ok: false, error: "请先登录" },
      { status: 401 },
    );
  }
  const pairId = acc.pairId;

  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: "缺少 id" }, { status: 400 });
  }

  const supabase = getSupabase();
  let record;
  try {
    const { data, error } = await supabase
      .from("MistakeRecord")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (error) {
      console.error("[mistakes] DELETE 查询失败", error);
      return NextResponse.json(
        { error: "暂时没能删掉，稍后再试" },
        { status: 500 },
      );
    }
    record = data;
  } catch (err) {
    console.error("[mistakes] DELETE 查询失败", err);
    return NextResponse.json(
      { error: "暂时没能删掉，稍后再试" },
      { status: 500 },
    );
  }

  // 防越权：记录不存在或不属于当前配对均返 404
  if (!record || record.pairId !== pairId) {
    return NextResponse.json({ error: "记录不存在" }, { status: 404 });
  }

  // 删 Supabase Storage 文件 —— 容错：文件可能已被外部移除
  if (isSafeFilename(record.filePath)) {
    const { error: storeErr } = await supabase.storage
      .from(SUPABASE_BUCKET)
      .remove([record.filePath]);
    if (storeErr) {
      // 容忍文件不存在；其它错误仅记录日志，不阻塞删除
      console.error("[mistakes] DELETE 删文件失败", storeErr);
    }
  }

  try {
    const { error: delErr } = await supabase
      .from("MistakeRecord")
      .delete()
      .eq("id", id)
      .eq("pairId", pairId);
    if (delErr) {
      console.error("[mistakes] DELETE 删库记录失败", delErr);
      return NextResponse.json(
        { error: "没能删掉，再试一次看看" },
        { status: 500 },
      );
    }
  } catch (err) {
    console.error("[mistakes] DELETE 删库记录失败", err);
    return NextResponse.json(
      { error: "没能删掉，再试一次看看" },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}
