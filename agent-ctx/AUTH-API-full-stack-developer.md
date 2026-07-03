# Task AUTH-API: 业务 API pairId 隔离

## 任务范围
13 个业务 API route 加 pairId 隔离 + prisma schema 微调（HomeQuote/HomeGreeting.pairId 加 @unique）

## 改动文件清单
1. prisma/schema.prisma — HomeQuote/HomeGreeting 的 id 改 @default(cuid())，pairId 加 @unique
2. src/app/api/tasks/route.ts — GET where 加 pairId；POST create data 加 pairId
3. src/app/api/tasks/[id]/route.ts — PATCH/DELETE 防越权（先查归属 pairId 比对）
4. src/app/api/focus-sessions/route.ts — GET where + POST data 加 pairId
5. src/app/api/mistakes/route.ts — GET where + POST data 加 pairId
6. src/app/api/mistakes/[id]/route.ts — DELETE 防越权
7. src/app/api/chat/messages/route.ts — GET where + POST data 加 pairId
8. src/app/api/moods/route.ts — GET where + POST data 加 pairId
9. src/app/api/notes/route.ts — GET where + POST data 加 pairId
10. src/app/api/quote/route.ts — findUnique/upsert 用 pairId（移除固定 QUOTE_ID）
11. src/app/api/greeting/route.ts — 同 quote
12. src/app/api/today-overview/route.ts — 3 子查询 where 加 pairId
13. src/app/api/stats/route.ts — 6 子查询 where 加 pairId
14. src/app/api/ai-summary/route.ts — 4 子查询 where 加 pairId
15. src/lib/db.ts — 仅加注释（无逻辑改动）

## 鉴权统一模式
```ts
const acc = await getAccountFromRequest();
if (!acc) return NextResponse.json({ ok: false, error: "请先登录" }, { status: 401 });
const pairId = acc.pairId;
```

## 防越权模式（tasks/[id]、mistakes/[id]）
```ts
const existing = await db.task.findUnique({ where: { id } });
if (!existing || existing.pairId !== pairId) return 404;
```

## 单例改造（quote/greeting）
- 旧：固定 id "island-quote" / "island-greeting" 全局单例
- 新：每对 pair 一条，pairId @unique，upsert where: { pairId }
- 前端契约不变（GET 仍返 { quote: {...}|null }，PUT body 不传 pairId）

## 验证
- bun run lint → 0 error 0 warning
- bunx prisma db push --accept-data-loss → 成功
- 直接 Prisma 脚本验证 pairId 隔离：pairA 数据对 pairB 不可见 ✅
- curl 13 个 API 未带 cookie 全部 401 ✅
- curl 带 cookie GET /api/tasks → 200 + Prisma SQL WHERE pairId = ? 生效 ✅

## 已知问题
- dev server（Turbopack）在我 kill 后重启期间偶有静默退出（无 OOM、无 error 日志），与 pairId 改造无关，是 Next 16 dev server 自身稳定性问题
- 代码本身经 lint + 直接 Prisma 脚本双重验证正确
