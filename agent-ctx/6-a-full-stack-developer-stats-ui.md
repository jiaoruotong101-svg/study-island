# Task 6-a — 学习统计 UI（概览数字 + 专注趋势图 + 心情分布 + 科目分布）

**Agent**: full-stack-developer (stats UI)
**Date**: 2026-07-03

## 产物
- `src/components/stats/stats-overview-cards.tsx`（约 120 行）—— 4 张累计数字卡（专注/番茄/坚持天数/错题）+ Skeleton
- `src/components/stats/focus-trend-chart.tsx`（约 145 行）—— recharts BarChart 近 7 天专注 + 今日柱高亮 + 空态/加载态
- `src/components/stats/mood-distribution.tsx`（约 115 行）—— 横向列表 + 占比条（不用 PieChart）+ 空态/加载态
- `src/components/stats/subject-distribution.tsx`（约 95 行）—— 科目行 + 任务/错题 pill + 空态/加载态
- `src/components/stats/stats-section.tsx`（约 130 行，覆盖原 10 行 stub）—— section 容器编排 + 一次 fetch + 视角化副标题

## 关键决策
- **单 endpoint 单 fetch**：/api/stats 一次返回完整 StatsData，父级 StatsSection 持有 data + loading，按 slice 传给 4 个子组件（避免 4 次同 endpoint 重复请求）
- **effect cancelled-flag 模式**：`let cancelled=false; void (async()=>{...if(!cancelled)setX(...)})(); return ()=>{cancelled=true}` 满足 lint 与卸载安全
- **视角化副标题**：妹妹"看看这段时间的坚持，每一分钟都算数" / 姐姐"陪她走过的这段路"
- **图表配色**：leaf `#7aa881` + 深 leaf `#5f9a6c`（今日柱）治愈色，禁蓝紫；tick 文字色用 `[&_.recharts-cartesian-axis-tick_text]:fill-muted-foreground` className 覆盖（暗黑模式自适应，避免 SVG var() 兼容性疑虑）
- **心情占比条**：按 mood key 映射治愈浅色（与 MOOD_OPTIONS softBg 同色系 leaf/amber-300/stone-300/slate-300/sky-200），fallback leaf-soft
- **不用 PieChart**：task spec 明确（避免 5 色块太乱），改横向列表 + 占比条
- **科目分布**：pill 风格（leaf-soft 任务 + cream 错题），不强调谁多谁少，符合"各科的坚持"
- **数字**：一律 `.font-num tabular-nums`（Times 字体 + 等宽数字）
- **空态文案陪伴不催促**：用"这周还没开始专注，不急"/"这周还没记心情，慢慢来"/"这周还没记任务或错题，慢慢来"，不用"暂无数据"
- **响应式**：概览 `grid-cols-2 sm:grid-cols-4`；心情/科目两列 `lg:grid-cols-2`，移动端单列堆叠
- **a11y**：aria-label 全覆盖（刷新学习统计/近 7 天每日专注分钟柱状图/近 7 天科目分布/各科任务/错题描述）；图表 `role="img"`

## 文案样例（陪伴向）
- 副标题（妹妹）："看看这段时间的坚持，每一分钟都算数"
- 副标题（姐姐）："陪她走过的这段路"
- 子卡副标题："每根柱子都是一段坚持" / "慢慢懂自己" / "各科的坚持"
- 概览小语："每一分钟都算数" / "一个个，慢慢来" / "已经走了这么远" / "记下就是成长"
- 空态："这周还没开始专注，不急" / "这周还没记心情，慢慢来" / "这周还没记任务或错题，慢慢来"
- 错误："统计暂时打不开，稍等一下再试"

## 工程校验
- `bun run lint` → 0 error 0 warning exit 0（两次跑均干净）
- API 冒烟（curl 经 :3000）：
  - GET /api/stats → 200，返回完整 StatsData（含 dailyFocus 7 项 / moodDistribution 4 项 / subjectDistribution 4 项）
  - 数据形态与子组件 props 完全匹配
- dev.log：GET /api/stats 200（首次 compile 2.9s 后续 5-54ms）、✓ Compiled 多次无错误、stats 页面编译通过

## 已知事项
- 一次 fetch 设计：4 个子组件共享 loading 态，整 section 同步加载（无独立 loading 阶梯），换取单次请求效率
- recharts 在客户端渲染（"use client"），首屏需等 JS 加载后才绘制柱状图
- 任务 spec 提到的 weeklyCompletedTasks / weeklyPendingTasks 字段已由 API 返回但本 task 未要求展示（聚焦概览+趋势+心情+科目四部分），保留供后续 Sprint 使用
- 心情占比条颜色与 MOOD_OPTIONS softBg 同色系（leaf/amber/stone/slate/sky），与项目既有设计一致（sky 用于"有点难过"💧，对应雨滴/眼泪意象，非纯蓝紫色块）
