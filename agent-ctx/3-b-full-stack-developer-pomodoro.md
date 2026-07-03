# Task 3-b — 番茄钟（计时状态机 + 圆形进度 + 段完成持久化）

Agent: full-stack-developer (pomodoro)
Task ID: 3-b
Date: 2026-07-03

## 范围
仅创建/覆盖 2 个文件（与任务书一致）：
- 覆盖 `src/components/pomodoro/pomodoro-timer.tsx`（3-a 留下的编译桩 → 完整番茄钟）
- 新建 `src/store/pomodoro-store.ts`（Zustand 计时状态机，不持久化）

## 关键设计决策

### 1. store 与组件的职责边界
- store 仅持有"计时核心状态 + 段切换逻辑"，**不**持有 activeTask / onPomodoroComplete（组件 props）。
- 段完成的副作用（POST /api/focus-sessions + onPomodoroComplete 回调）由组件 effect 监听 store 的 `lastCompletedSeq` 信号触发。
- 自然完成（tick 到 0）与跳过（skip）走不同分支：
  - 自然完成 → 推进 `lastCompletedSeq`，组件 effect 据此 POST + 回调；
  - 跳过 → 仅切到下一段，不递增 completedFocusCount、不记录、不回调（"跳过"非"完成"）。

### 2. 计时不持久化
不用 persist：计时态本就不应跨刷新存活（刷新=新会话，符合番茄钟直觉）。todayFocusCount 通过挂载时 GET /api/focus-sessions 初始化，仅 fetch 一次（todayFocusInitialized 标志防重复）。

### 3. props 新鲜度
activeTask / onPomodoroComplete / role 用 useRef + 同步 effect 保存最新值。副作用 effect 依赖仅 `lastCompletedSeq`，避免 props 变化重新触发副作用。latest 信息通过 `usePomodoroStore.getState().lastCompleted` 读取。

### 4. tick 与段衔接
- remainingSec > 1：常规 -1。
- remainingSec === 1：自然完成当前段，同 tick 内 set 新段的满值 + 保留 running 自动衔接（用户看到 1 → 新段满值，省略 0 的瞬时显示，避免引入 phaseEnding 中间态）。
- 长休判定：completedFocusCount > 0 && % 4 === 0（避免 0 段也触发长休）。

### 5. 进度环
- SVG viewBox 240×240，strokeWidth 12，radius = (240-12)/2。
- 用 `<circle transform="rotate(-90 cx cy)">` 让起点从 12 点钟开始。
- progress = remainingSec / currentPhaseTotalSec（1 → 0），dashOffset = circumference × (1 - progress) → 满圆 → 空圆，"时间流逝"视觉。
- `<circle key={phase}>`：段切换时重挂载，避免 dashOffset 回弹动画（500ms ease-out 仅作用于段内逐秒递减）。

### 6. setInterval 生命周期
- interval 在组件 useEffect 内，仅 status === "running" 时启动，卸载/暂停清 interval（遵循 spec）。
- 已知局限：用户切到其他 nav tab（TaskSection 卸载）时，interval 清除、tick 停止，timer 状态保留但实际"暂停"。store 是模块单例，重新挂载后从 remainingSec 继续。这是 spec 明确接受的取舍。

## 验证

### lint
`bun run lint` → exit 0，0 error 0 warning。

### API 冒烟（curl）
- GET /api/focus-sessions?date=2026-07-03 → 200 `{sessions:[]}`
- POST focus session `{role:"younger",taskId:null,durationMinutes:25,type:"focus"}` → 201 `{ok:true,session:{...}}`
- POST break session `{...type:"break"}` → 201
- POST bad role → 400 `{ok:false,error:"不知道是谁专注的"}`
- GET 再查 → 返回刚 POST 的两条，desc 排序
- 测试数据已清理（db.focusSession.deleteMany）

### dev server
`✓ Compiled` 无报错，首页 200。

## 文件清单
- `src/store/pomodoro-store.ts`（184 行）
- `src/components/pomodoro/pomodoro-timer.tsx`（382 行，覆盖 3-a 的 102 行 stub）

## 已知事项 / 后续注意
- 计时跨 nav 切换会"暂停"（spec 接受）；若后续需要真正后台计时，可改用 Web Worker 或 module-level setInterval。
- onPomodoroComplete 与 POST focus session 解耦：POST 失败仅日志，不影响任务 +1（任务 PATCH 由 TaskSection 自管乐观+回滚）。若 focus session 记录丢失，今日番茄数会在下次挂载时从 API 重新拉取（可能少于本地 store 计数）。
- 长休判定基于 `currentPhaseTotalSec === LONG_BREAK_SEC`，若未来调整时长常量需同步更新。
- 副作用 effect 与 props 切换的 1 帧竞态：理论存在（用户在段完成那一帧切换 activeTask），实际不可达。
