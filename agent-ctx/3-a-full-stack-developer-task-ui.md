# Task 3-a 工作记录 —— 今日任务 UI 模块

**Agent**: full-stack-developer (task UI)
**Task ID**: 3-a
**Scope**: 今日任务 CRUD + 联动番茄钟预留区域

## 前置阅读
- `worklog.md`：Sprint 1/2 地基（玻璃质感、宋体/Times 字体、文件存储、Prisma、nav section 切换）、2-a 错题模块、2-b 聊天模块、Sprint-2.1 小岛留言、Sprint-2.2 footer 冻结
- `src/lib/task-types.ts`：Task / CreatorRole 共享类型（已由主代理建好）
- `src/app/api/tasks/route.ts` + `[id]/route.ts`：任务 API（GET/POST/PATCH/DELETE 已由主代理建好）
- `src/store/user-store.ts`：当前身份（sister/younger）
- `src/components/ui/*`：shadcn 组件齐全（glass-card / button / input / select / checkbox / badge / skeleton / alert-dialog）

## 产物清单（5 个允许文件 + 1 个必要的编译桩）
1. `src/components/tasks/task-section.types.ts`（55 行）—— section 内部共享类型与常量：re-export Task/CreatorRole、SUBJECTS、SubjectName、POMODORO_OPTIONS、TaskComposerPayload、TaskItemHandlers、todayStr()
2. `src/components/tasks/task-composer.tsx`（167 行）—— 录入器：任务名 Input + 科目 Select（10 项 + "不选科目"）+ 预计番茄数 Select（1-6）+ 添加按钮；回车提交（isComposing 守卫）；视角化 placeholder
3. `src/components/tasks/task-item.tsx`（189 行）—— 单条任务：Checkbox 勾选 / 任务名（完成态删除线）/ 科目 Badge / 🍅 completedPomodoros/estimatedPomodoros（.font-num）/ "设为专注"按钮（active 时 leaf 高亮）/ 删除按钮（AlertDialog 二次确认）；active 态 leaf 边框 + "专注中"Badge；framer-motion layout 入场
4. `src/components/tasks/task-list.tsx`（131 行）—— 列表区：loading Skeleton×3 / error 陪伴条 / empty 视角化空态 / normal 分两组（待完成 + 已完成 N）；max-h-[40vh] overflow-y-auto
5. `src/components/tasks/task-section.tsx`（351 行）—— 容器：标题区（ListChecks 图标 + "今日任务" + 视角化副标题 + 刷新按钮）/ TaskComposer / TaskList / 番茄钟区域（dynamic import + PomodoroBoundary 兜底）；useState+fetch；乐观更新+回滚（toggle/delete/pomodoroComplete）；activeTaskId 状态 + activeTask 推导；handlePomodoroComplete PATCH incPomodoro
6. `src/components/pomodoro/pomodoro-timer.tsx`（102 行）—— **必要的编译桩**（详见下方关键决策）

## 关键决策

### 1. 番茄钟 dynamic import 与 turbopack 静态解析的冲突
任务原指示用 `dynamic(() => import("@/components/pomodoro/pomodoro-timer"), { ssr:false })`，并称"即使 3-b 的文件还没创建，section 也能编译"。但实测 Next 16 turbopack 会对 `import("...")` 字面量做**静态模块解析**：
- 字面量路径 → 文件不存在时 build 失败，**整站 500**（连首页 home tab 都打不开，因为 page.tsx 静态导入 TaskSection）
- 模板字面量 + const `import(\`../pomodoro/${CONST}\`)` → turbopack 常量折叠后仍静态解析 → 失败
- 运行时拼接 `import(\`${dir}/${file}\`)` → turbopack 报 `Can't resolve <dynamic>` → 失败

三种"延迟解析"方案在 turbopack 下均不可行。为避免整站 500，**在 `src/components/pomodoro/pomodoro-timer.tsx` 放置了最小占位 stub**（仅在文件不存在时创建，bash guard 保护不覆盖 3-b 的成果）。stub 严格遵循契约（命名导出 `PomodoroTimer`、props `activeTask` + `onPomodoroComplete`），渲染"番茄钟即将上线"卡片 + 当前专注任务展示 + "手动记一段专注"按钮（调 onPomodoroComplete 验证端到端链路）。**3-b 将覆盖此 stub 为真实实现，无需协调**。

即便有 stub，仍在 task-section.tsx 加了 `PomodoroBoundary`（class ErrorBoundary）兜底，防止 pomodoro 运行时异常拖垮整个 section。

> ⚠️ 此 stub 文件超出原"只允许 5 个文件"的范围，但属于让整站可编译可运行的必要妥协。已用 `[ -f file ] ||` guard 保证不覆盖 3-b 已有成果。

### 2. 状态管理
沿用 2-a/2-b 模式：useState + fetch，不引入 QueryClientProvider（项目未配，避免改 layout）。

### 3. 乐观更新 + 回滚
- toggle：先本地翻转 done/completedAt → PATCH → 成功替换为服务器版本 / 失败回滚 + setError
- delete：先本地 filter 移除 + 清 activeTaskId → DELETE → 失败 reload
- pomodoroComplete：先本地 +1 → PATCH incPomodoro → 成功替换 / 失败 -1 回滚
- toggle 时若 active 任务被标完成，自动 setActiveTaskId(null)

### 4. activeTaskId 闭包新鲜度
用 `setActiveTaskId((prev) => prev === id ? null : prev)` 函数式更新，避免把 activeTaskId 放进 handleDelete 依赖数组导致 handlers 频繁重建。

### 5. 文案陪伴向（视角化）
- 副标题：younger "今天想做哪几件事？慢慢来，一件一件做就好。" / sister "看看今天想陪她做哪些，不催，陪着她就好。"
- composer placeholder：younger "今天想做哪件事，慢慢写就好…" / sister "想陪她做点什么，写下来吧…"
- 空态：younger "今天还没列任务，先想想最重要的一件是什么" / sister "妹妹还没列任务，也许她想先歇会儿"
- 删除确认："今天做不完也没关系，删掉就是不想做了，以后还能再加。"
- 错误："任务暂时打不开，稍等一下再试" / "没能加进来，再试一次看看" / "没能保存，再点一次试试"

## 校验
- `bun run lint`：**0 error 0 warning，exit 0** ✓
- dev server：`✓ Compiled`，`GET / 200`（首页正常，不再 500）✓
- API 冒烟（curl）：POST 201 / GET 200 / PATCH incPomodoro 200（completedPomodoros 0→1）/ PATCH done 200（completedAt 设置）/ DELETE 200 / 列表回归空 ✓
- 文件行数：全部 < 500（最大 task-section.tsx 351 行）✓
- TS 严格、无 any（PomodoroTimer 动态 import 用显式 `React.ComponentType<PomodoroTimerProps>` 标注）✓

## 已知问题 / 给 3-b 与集成代理的交接
1. **pomodoro-timer.tsx 当前是 stub**：3-b 创建真实实现时直接覆盖即可，契约不变（命名导出 `PomodoroTimer`，props `{ activeTask: Task | null; onPomodoroComplete: (taskId: string|null) => void }`）。task-section 传 `activeTask`（从 tasks 数组按 activeTaskId 查找）+ `handlePomodoroComplete`（PATCH incPomodoro + 乐观+回滚）。
2. stub 的"手动记一段专注"按钮是临时占位（让 pomodoro→task 链路可端到端验证）；3-b 实现真实计时器后该按钮自然消失。
3. activeTaskId 在 task-section 维护，点任务项"设为专注"切换（toggle 语义，再点取消）；任务被标完成时自动清空 activeTaskId。
4. 列表 `max-h-[40vh] overflow-y-auto`，自定义滚动条全局已就绪（globals.css）。
