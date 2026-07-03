import { NextRequest, NextResponse } from "next/server";
import { unlink } from "fs/promises";
import path from "path";
import { db } from "@/lib/db";
import { getAccountFromRequest } from "@/lib/auth";

/**
 * 错题记录单条 API —— 删除
 *
 * - DELETE /api/mistakes/[id]   先删文件（容错），再删库记录
 *
 * 多对隔离：先查记录确认 record.pairId === 当前账号 pairId，
 * 不匹配返回 404，防止越权。
 *
 * runtime=nodejs：涉及 fs。
 */

export const runtime = "nodejs";

const UPLOAD_DIR = path.join(process.cwd(), "uploads");

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

  let record;
  try {
    record = await db.mistakeRecord.findUnique({ where: { id } });
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

  // 删文件 —— 容错：文件可能已被外部移除
  if (isSafeFilename(record.filePath)) {
    try {
      await unlink(path.join(UPLOAD_DIR, record.filePath));
    } catch (err) {
      // 容忍文件不存在；其它错误仅记录日志，不阻塞删除
      const code = (err as NodeJS.ErrnoException)?.code;
      if (code !== "ENOENT") {
        console.error("[mistakes] DELETE 删文件失败", err);
      }
    }
  }

  try {
    await db.mistakeRecord.delete({ where: { id } });
  } catch (err) {
    console.error("[mistakes] DELETE 删库记录失败", err);
    return NextResponse.json(
      { error: "没能删掉，再试一次看看" },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}
