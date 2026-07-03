import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import path from "path";

/**
 * 文件访问。
 *
 * 从 uploads/ 读取文件并按 mime 返回。
 * 错题图片/语音、聊天语音都通过此接口访问。
 */
export const runtime = "nodejs";

const UPLOAD_DIR = path.join(process.cwd(), "uploads");

const MIME_BY_EXT: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".webm": "audio/webm",
  ".m4a": "audio/mp4",
  ".ogg": "audio/ogg",
  ".mp3": "audio/mpeg",
};

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ filename: string }> },
) {
  const { filename } = await params;
  // 防止路径穿越：仅允许文件名，不含斜杠
  if (!filename || filename.includes("/") || filename.includes("..")) {
    return NextResponse.json({ error: "非法文件名" }, { status: 400 });
  }
  try {
    const filepath = path.join(UPLOAD_DIR, filename);
    const buf = await readFile(filepath);
    const ext = path.extname(filename).toLowerCase();
    const mime = MIME_BY_EXT[ext] ?? "application/octet-stream";
    return new NextResponse(buf, {
      status: 200,
      headers: {
        "Content-Type": mime,
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return NextResponse.json({ error: "文件不存在" }, { status: 404 });
  }
}
