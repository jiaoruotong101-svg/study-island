import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { getSupabase, SUPABASE_BUCKET } from "@/lib/supabase";

/**
 * 通用文件上传 —— 上传到 Supabase Storage（公开 bucket）。
 *
 * 接收 multipart 表单，字段名 `file`。
 * 上传到 SUPABASE_BUCKET，文件名 uuid + 原扩展名。
 * 返回 { ok, filename, url, mimeType, size }，url 为 Supabase Storage 公开 URL：
 *   https://xxx.supabase.co/storage/v1/object/public/<bucket>/<filename>
 *
 * 用于：错题图片/语音、聊天语音。前端直接用 url 字段访问，不再走 /api/files。
 */
export const runtime = "nodejs";

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

    const supabase = getSupabase();
    const ext = extFor(file.type, file.name);
    const filename = `${randomUUID()}${ext}`;
    const buffer = Buffer.from(await file.arrayBuffer());
    const contentType = file.type || "application/octet-stream";

    const { error: upErr } = await supabase.storage
      .from(SUPABASE_BUCKET)
      .upload(filename, buffer, {
        contentType,
        upsert: false,
      });
    if (upErr) {
      console.error("[uploads] 上传失败", upErr);
      return NextResponse.json(
        { ok: false, error: "上传失败，再试一次看看" },
        { status: 500 },
      );
    }

    const { data: pub } = supabase.storage
      .from(SUPABASE_BUCKET)
      .getPublicUrl(filename);

    return NextResponse.json({
      ok: true,
      filename,
      url: pub.publicUrl,
      mimeType: contentType,
      size: file.size,
    });
  } catch (e) {
    console.error("[uploads] 异常", e);
    return NextResponse.json(
      { ok: false, error: (e as Error).message },
      { status: 500 },
    );
  }
}
