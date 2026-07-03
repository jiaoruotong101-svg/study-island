# Task SUPABASE-MIGRATE: Prisma → Supabase JS SDK 迁移

## 任务范围
所有数据访问从 Prisma 直连 Postgres 改为 `@supabase/supabase-js` 走 REST API（HTTPS 443），
原因：沙箱封了直连 Postgres 5432 端口。

## 改动文件清单（18 个，全部 API/lib 层，前端未动）
1. `src/lib/auth.ts` — getAccountFromRequest 中 Account 查询改 supabase .maybeSingle()
2. `src/app/api/auth/register/route.ts` — Pair 配对码去重 + Account/Pair insert + 回填 createdBy
3. `src/app/api/auth/login/route.ts` — Account.findUnique → .maybeSingle()
4. `src/app/api/auth/me/route.ts` — Pair + partner 两查询改 .maybeSingle()
5. `src/app/api/auth/logout/route.ts` — 不动（无 db 调用）
6. `src/app/api/tasks/route.ts` — findMany + create
7. `src/app/api/tasks/[id]/route.ts` — PATCH 防越权 + incPomodoro 读后写；DELETE count 判 404
8. `src/app/api/focus-sessions/route.ts` — ISO 字符串 gte/lte + role 过滤
9. `src/app/api/mistakes/route.ts` — Storage 公开 URL 替代 /api/files
10. `src/app/api/mistakes/[id]/route.ts` — Storage .remove([filePath]) 容错删
11. `src/app/api/chat/messages/route.ts` — Storage 公开 URL；take → .limit()
12. `src/app/api/moods/route.ts` — 同 focus-sessions 模式
13. `src/app/api/notes/route.ts` — findMany + create
14. `src/app/api/quote/route.ts` — .upsert(row, { onConflict: "pairId" })
15. `src/app/api/greeting/route.ts` — 同 quote
16. `src/app/api/today-overview/route.ts` — 3 子查询 Promise.all
17. `src/app/api/stats/route.ts` — 6 子查询 Promise.all；dateStr 接受 Date|string
18. `src/app/api/ai-summary/route.ts` — 4 子查询 Promise.all；LLM 调用不变
19. `src/app/api/uploads/route.ts` — fs.writeFile → Storage .upload；返回 Storage 公开 URL
20. 删除 `src/app/api/files/[filename]/route.ts`

## 关键模式
### 鉴权
```ts
import { getAccountFromRequest } from "@/lib/auth";
const acc = await getAccountFromRequest();
if (!acc) return NextResponse.json({ ok: false, error: "请先登录" }, { status: 401 });
const pairId = acc.pairId;
```

### 单行查询（findUnique/findFirst 语义）
```ts
const { data, error } = await supabase
  .from("Account")
  .select("*")
  .eq("id", id)
  .maybeSingle();  // 无行时 data=null，无 error
```

### 插入并取回
```ts
const { data, error } = await supabase
  .from("Task")
  .insert({ id: randomUUID(), ... })
  .select()
  .single();
```

### 防越权更新/删除
```ts
// UPDATE 双过滤
await supabase.from("Task").update({...}).eq("id", id).eq("pairId", pairId);

// DELETE 用 count 判 404
const { count, error } = await supabase
  .from("Task")
  .delete({ count: "exact" })
  .eq("id", id)
  .eq("pairId", pairId);
if (count === 0) return 404;
```

### 单例 upsert（HomeQuote/HomeGreeting）
```ts
await supabase.from("HomeQuote")
  .upsert({ id: randomUUID(), pairId, content, authorRole, updatedAt }, { onConflict: "pairId" })
  .select().single();
```

### 范围查询（日期）
```ts
const start = new Date(`${date}T00:00:00`).toISOString();
const end = new Date(`${date}T23:59:59.999`).toISOString();
await supabase.from("FocusSession")
  .select("*")
  .eq("pairId", pairId)
  .gte("completedAt", start)
  .lte("completedAt", end)
  .order("completedAt", { ascending: false });
```

### Storage 公开 URL
```ts
const { data } = supabase.storage.from(SUPABASE_BUCKET).getPublicUrl(filename);
// → https://xxx.supabase.co/storage/v1/object/public/<bucket>/<filename>
```

### Storage 删除
```ts
await supabase.storage.from(SUPABASE_BUCKET).remove([filename]);
```

## 日期处理差异
- Prisma 返回 Date 对象；Supabase 返回 ISO 字符串
- 写入：`new Date().toISOString()` 或显式 ISO 串
- 范围查询：ISO 字符串 gte/lte
- 按日聚合：`dateStr()` 改为接受 `Date|string`，内部用 `new Date(s)` 归一化
- ISO UTC Z 字符串字典序 == 时间序，可直接用 `>=` `<=` 比较

## id 生成差异
- Prisma：`@default(cuid())` 自动生成
- Supabase：手动 `crypto.randomUUID()`（schema 为 `text primary key`，UUID v4 满足）

## 原子自增差异
- Prisma：`{ increment: 1 }` 原子自增
- PostgREST：不支持，改"读后写"（先 select 取当前值，再 update 为 +1）
- 产品仅 2 人/对，并发概率极低，可接受

## 验证
- `bun run lint` → 0 error, 0 warning
- 代码无 Prisma 引用残留（grep `@/lib/db` 0 hits）

## 已知问题 / 待主代理处理
1. **表未建**：需要在 Supabase SQL Editor 执行 `supabase-schema.sql`（项目根目录已存在）
2. **Bucket 权限**：Storage bucket 需在 Supabase Dashboard 设为 public，否则 getPublicUrl 返回的 URL 仍需签名
3. **环境变量**：`.env` 已配置 `SUPABASE_URL / SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY / SUPABASE_BUCKET`，主代理只需建表 + 设 bucket public
4. 前端契约不变：所有 API 返回的 url 字段（mistakes/chat）直接是 Storage 公开 URL，前端照旧使用
5. `src/lib/db.ts` 与 `prisma/schema.prisma` 保留作历史文档，未删
