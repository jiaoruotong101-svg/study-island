import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";

/**
 * 通用文件上传。
 *
 * 接收 multipart 表单，字段名 `file`。
 * 写入项目根目录 uploads/ 下，文件名 uuid + 原扩展名。
 * 返回 { ok, filename, url, mimeType, size }，url 为 /api/files/<filename>。
 *
 * 用于：错题图片/语音、聊天语音。
 */
export const runtime = "nodejs";

const UPLOAD_DIR = path.join(process.cwd(), "uploads");

const EXT_BY_MIME: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/gif": ".gif",
  "audio/webm": ".webm",
  "audio/mp4": ".m4a",
  "audio/ogg": ".ogg",
  "audio/mpeg": ".mp3",
};

function extFor(mime: string, originalName?: string | null): string {
  if (EXT_BY_MIME[mime]) return EXT_BY_MIME[mime];
  if (originalName) {
    const idx = originalName.lastIndexOf(".");
    if (idx >= 0) return originalName.slice(idx).toLowerCase();
  }
  return ".bin";
}

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json(
        { ok: false, error: "缺少 file 字段" },
        { status: 400 },
      );
    }

    await mkdir(UPLOAD_DIR, { recursive: true });
    const ext = extFor(file.type, file.name);
    const filename = `${randomUUID()}${ext}`;
    const filepath = path.join(UPLOAD_DIR, filename);
    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(filepath, buffer);

    return NextResponse.json({
      ok: true,
      filename,
      url: `/api/files/${filename}`,
      mimeType: file.type || "application/octet-stream",
      size: file.size,
    });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: (e as Error).message },
      { status: 500 },
    );
  }
}
