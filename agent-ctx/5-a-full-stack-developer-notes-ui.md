# Task 5-a — 每日留言 UI（录入 + 当日列表 + 日期切换）

**Agent**: full-stack-developer (notes UI)
**Date**: 2026-07-03

## 产物
- `src/components/notes/note-date-nav.tsx`（约 90 行）—— 日期切换：前一天/今天/后一天 + "今天 · 7月3日 周五" 展示
- `src/components/notes/note-composer.tsx`（约 120 行）—— 留言录入：Textarea 500 字 + 字数计数 + "留下"按钮 POST
- `src/components/notes/note-list.tsx`（约 180 行）—— 当日留言列表：便签纸风格 + 状态分支 + max-h-[50vh]
- `src/components/notes/note-section.tsx`（约 115 行，覆盖原 stub）—— section 容器：header + nav + composer + list 编排

## 关键决策
- **状态管理**：useState + fetch（项目未配 QueryClientProvider，遵循 mood/tasks 模式）
- **effect cancelled-flag 模式**：NoteList 拉取用 `let cancelled=false; void (async()=>{...if(!cancelled)setX(...)})(); return ()=>{cancelled=true}` 满足 lint 与卸载安全
- **依赖数组**：NoteList effect 依赖 `[refreshKey, currentDate, onLoaded]`（onLoaded 由 useCallback 稳定）
- **日期切换**：currentDate 由 NoteSection 维护（Date 对象，默认今天），传给 NoteDateNav 与 NoteList；NoteDateNav 调 onChange 通知父级；NoteList 按 currentDate 重新 fetch
- **"今天"边界**：NoteDateNav 用 date-fns `isToday` + `isFuture`；"后一天"按钮在"今天或未来"时禁用（不能给未来留言）；"今天"按钮在已是今天时禁用；"前一天"始终可用
- **仅今天可写**：NoteComposer 仅在 `isToday(currentDate)` 时渲染（往日只读，符合"每日"语义）
- **提交刷新链路**：NoteComposer onSubmitted → setRefreshKey(+1) → NoteList 重新 fetch；NoteSection 刷新按钮同理
- **便签纸风格**：
  - 姐姐留的用 `bg-leaf-soft/40`，妹妹留的用 `bg-cream/50`（治愈浅色，非蓝紫）
  - 字面量 class 写在 STICKY_BG Record 里，Tailwind v4 内容扫描能识别
  - rounded-xl + shadow-sm + border-white/40 + 正文 whitespace-pre-wrap
- **左右区分**：自己留的靠右（justify-end + ml-auto），对方留的靠左（justify-start + mr-auto）；max-w-[85%] sm:max-w-[78%]
- **时间显示**：今天视图 "刚刚/X分钟前/X小时前"，往日视图 "HH:mm"（用 date-fns format + zhCN locale）
- **作者标签**：圆角小标签（white/50 底，foreground/70 文字）
- **字数计数**：超 500 字标 destructive 色（虽然 maxLength 已限，防御性提示）
- **响应式**：NoteDateNav 中间区在手机/桌面分别纵向/横向排列；NoteList 卡片 max-w 自适应
- **a11y**：aria-label 留言内容/留下这条小纸条/前一天/后一天/回到今天/刷新当日留言；article + aria-label

## 文案样例（陪伴向）
- 副标题（姐姐视角）："给妹妹留句话，慢慢说，不急。"
- 副标题（妹妹视角）："给姐姐留张小纸条，她打开就能看到。"
- placeholder（姐姐）："想给妹妹留句话…"
- placeholder（妹妹）："想对姐姐说什么，写下来…"
- 提交成功 toast："小纸条已经留下啦"
- 提交中："留着呢…"
- 空态（今天）："还没留言，给彼此留张小纸条吧"
- 空态（往日）："这天没有留言"
- 错误："小纸条暂时打不开，稍等一下再试" / "网络似乎抖了一下，再试一次看看"
- API 校验文案复用（"留句话再走呀"/"小纸条有点长，500 字以内就好"/"不知道是谁留的"）

## 工程校验
- `bun run lint` → 0 error 0 warning exit 0
- API 冒烟（curl 经 :3000）：
  - GET /api/notes?date=2026-07-03 → 200 `{notes:[], date:"2026-07-03"}`
  - POST /api/notes {younger, "冒烟测试…"} → 201 `{ok:true, note:{...}}`
  - GET 复查 → 列表含新条目，createdAt asc
  - 清理测试数据（bun 直接 prisma deleteMany content LIKE "冒烟测试"），remaining 0
- dev.log：GET /api/notes 200、POST /api/notes 201，无编译错误

## 已知事项
- 无编辑/删除留言入口（task 未要求；"留下也是一种记录"，符合慢沟通气质）
- 跨日留言不可补写（仅今天显示 Composer，符合"每日"语义）
- 长列表用 max-h-[50vh] + 全局自定义滚动条（已在 globals.css 就绪）
- 暂无实时推送（姐姐留言后妹妹需手动刷新；与 chat 不同，每日留言是慢沟通，不强求实时）
