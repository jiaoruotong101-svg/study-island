# Task 7-a — 姐姐后台（陪伴仪表盘 UI）

**Agent**: full-stack-developer (admin UI)
**Date**: 2026-07-03
**Task ID**: 7-a

## 产物（4 个允许文件，全部 < 500 行，单职责）
- `src/components/admin/admin-overview.tsx`（157 行）—— 今日状态概览 4 卡（今日任务/专注分钟/今日心情/待完成任务）+ Skeleton + framer-motion 阶梯入场
- `src/components/admin/admin-today-detail.tsx`（303 行）—— 今日详情：今日任务（≤5 条，超出"还有 N 条"）| 今日心情（≤3 条），双列网格
- `src/components/admin/admin-recent-activity.tsx`（332 行）—— 最近活动：最近错题（≤3 条，只读）| 今日留言（全部，截断 60 字），双列网格
- `src/components/admin/admin-section.tsx`（159 行，覆盖原 stub）—— section 容器：权限守卫 + header + 三子组件编排 + 底部结语

## 功能
- **权限守卫**：role !== "sister" → GlassCard 居中卡片"这是姐姐的角落～" + 副标题"想看看妹妹的状态？切到姐姐视角就能看到啦。" + 按钮"切到姐姐看看"（switchRole("sister")）+ 🌿 装饰
- **header**：Heart(leaf) 图标 + "姐姐的后台"标题 + 副标题"看看妹妹今天的状态，不强求，她愿意说就说。" + 刷新按钮
- **AdminOverview**：4 张 GlassCard（grid-cols-2 sm:grid-cols-4），数据来自 /api/today-overview
  - 今日任务：completed/total（icon ListChecks）+ 小语"一件件来"
  - 专注分钟：focusMinutes（icon Timer）+ 小语"每一分钟都算数"
  - 今日心情：mood ? emoji+label : "—"（icon Smile）+ 小语"她的感受很重要"
  - 待完成任务：pendingTaskCount（icon Clock）+ 小语"不急，慢慢来"
  - 数字加 .font-num tabular-nums
- **AdminTodayDetail**：双列 GlassCard
  - 今日任务：勾选状态（✅/○）+ 标题 + 科目 Badge + 番茄进度 🍅 completed/estimated（.font-num）+ 创建者；空态"妹妹今天还没列任务，也许她想先歇会儿"
  - 今日心情：emoji 圆徽 + label + 相对时间 + 备注（line-clamp-2）+ 创建者；空态"妹妹今天还没记心情"
- **AdminRecentActivity**：双列 GlassCard
  - 最近错题：缩略图（image: img / voice: 🎤 Mic2 图标）+ 科目 Badge + 类型 Badge + 相对时间 + 备注（截断 60 字，line-clamp-2）；只读，无点击；空态"还没有错题记录"
  - 今日留言：作者标签（姐姐浅绿/妹妹奶白，复用 note-list 便签纸色系）+ 时间 + 内容（截断 60 字）；空态"今天还没有留言"
- **底部结语**：framer-motion 淡入"她今天也在努力着。"

## 关键决策
- **3 子组件独立 fetch**：AdminOverview（/api/today-overview）/ AdminTodayDetail（/api/tasks + /api/moods Promise.allSettled）/ AdminRecentActivity（/api/mistakes + /api/notes Promise.allSettled），各自管理 loading + Skeleton，符合 mood-timeline / note-list 既有范式
- **refreshKey + onLoaded 计数器**：父级 AdminSection 持有 refreshKey，3 子组件各报 onLoaded 一次；用 useRef 计数器（pendingLoadsRef）跟踪待完成数，归零时 setRefreshing(false)；初始挂载的 onLoaded 因 counter=0 被 Math.max(0,...) 兜底，不影响 refreshing=false 初值
- **effect cancelled-flag + try/finally 模式**：满足 react-hooks/set-state-in-effect lint 规则（setLoading(true) 同步调用需配合 try/finally 的 setLoading(false) 才不被 flag，与 stats-section / mood-timeline 既有通过 lint 的模式一致）
- **权限守卫提前 return**：role !== "sister" 时直接 return 守卫卡片，不挂载 3 个子组件（避免无谓 fetch）
- **文案全程陪伴向**：禁用"监控/检查/绩效/达标/落后"，空态用"也许她想先歇会儿"/"还没有错题记录"/"今天还没有留言"，不用"暂无数据"
- **数字 .font-num tabular-nums**：所有数字（任务数/番茄进度/时间/计数）均加 Times 字体类
- **配色奶白/浅绿/浅灰**：leaf/leaf-soft/cream 语义色，禁蓝紫禁渐变；作者标签复用 note-list STICKY_BG 色系（姐姐 leaf-soft/妹妹 cream）
- **响应式**：概览 grid-cols-2 sm:grid-cols-4；详情/活动 lg:grid-cols-2 双列，移动端单列堆叠；留言列表 max-h-96 overflow-y-auto（自定义滚动条全局已就绪）
- **a11y**：section aria-label / 刷新按钮 aria-label / 图标 aria-hidden / Badge 语义化；缩略图 alt 取 note||subject
- **相对时间自写**：刚刚/X分钟前/X小时前/昨天 M月D日/X天前，不依赖外部库
- **truncate 自写**：按字符数截断，超长加 …

## 文案样例（陪伴向，无催促）
- 副标题："看看妹妹今天的状态，不强求，她愿意说就说。"
- 概览小语："一件件来" / "每一分钟都算数" / "她的感受很重要" / "不急，慢慢来"
- 空态："妹妹今天还没列任务，也许她想先歇会儿" / "妹妹今天还没记心情" / "还没有错题记录" / "今天还没有留言"
- 权限守卫："这是姐姐的角落～" / "想看看妹妹的状态？切到姐姐视角就能看到啦。"
- 底部结语："她今天也在努力着。"

## 工程校验
- `bun run lint` → 0 error 0 warning exit 0
- API 冒烟（curl 经 :3000）：
  - GET /api/today-overview → 200 `{"pendingTaskCount":0,"completedTaskCount":0,"focusMinutes":0,"mood":null}`
  - GET /api/tasks?date=2026-07-03 → 200 `{"tasks":[]}`
  - GET /api/mistakes → 200 `[]`
  - GET /api/notes?date=2026-07-03 → 200 `{"notes":[],"date":"2026-07-03"}`
- dev.log：✓ Compiled 多次无错误，4 个 API 均 200（8-79ms），admin section 编译通过

## 已知事项
- **3 子组件独立 fetch**：共 5 个 endpoint（today-overview / tasks / moods / mistakes / notes），刷新时并行触发；未做单 endpoint 聚合（与 stats API 不同，此处无现成 admin 聚合 endpoint，按 task spec 复用已有 API）
- **SSR 默认 younger**：useUserStore persist 默认 currentUser.role="younger"，姐姐首次访问需先切换；如已持久化为 sister，刷新后短暂渲染守卫卡片再切到仪表盘（与 stats-section 一致，可接受）
- **错题只读**：姐姐后台只看不改，错题缩略图无点击交互（与 mistake-card 的大图 Dialog 不同，避免误操作）
- **留言截断 60 字**：超长内容用 … 截断，未提供展开（保持仪表盘"一眼概览"语义，详细内容走 note section）
- **line-clamp-2**：用于心情备注/错题备注，Tailwind v4 内置（select.tsx/alert.tsx 已有同款用法）
- **relativeTime**：自写不依赖 date-fns，与 mood-timeline / mistake-card 保持一致
