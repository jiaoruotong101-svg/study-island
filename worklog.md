# 学习小岛 — 工作日志

---
Task ID: SPRINT-1
Agent: main (Z.ai Code)
Task: Sprint 1 —— 项目地基与首页骨架

Work Log:
- 适配技术栈：用户文档为 Vite+Supabase，实际环境为 Next.js 16 App Router + Prisma + shadcn/ui + Zustand + TanStack Query，已保留全部设计理念
- 建立治愈系设计系统（src/app/globals.css）：奶白背景 + 浅绿主色 + 浅灰辅助，浅/深色双模式，自定义滚动条，新增 leaf / leaf-soft / cream 语义色
- 创建类型定义 src/lib/types.ts（Role / CurrentUser / TodayOverview / QuickEntry）
- 创建 Zustand 用户态 src/store/user-store.ts（姐姐/妹妹切换，localStorage 持久化）
- 创建陪伴语录库 src/lib/quotes.ts（8 条鼓励向文案，按日期稳定取一条）
- 创建布局组件：app-header（绿叶 logo + 时段问候 + 身份标签）、app-footer（5 tab 底部导航，仅首页可用，其余"即将"）、app-shell（min-h-screen flex-col + mt-auto 实现 sticky footer 规范）
- 创建首页子组件：role-switcher（身份切换，framer-motion 动效）、today-overview（4 张概览卡，演示数据）、companion-quote（每日语录，纯色无渐变）、quick-entry-grid（7 个功能入口，暂未上线）
- 创建 useNow hook（useSyncExternalStore，避免 effect 内同步 setState 的 lint 报错 + hydration mismatch）
- 创建 ThemeProvider（next-themes）
- 创建 PWA manifest（public/manifest.webmanifest）+ 叶子图标（public/icon-leaf.svg）
- 改造 layout.tsx（中文 lang、PWA metadata、viewport、ThemeProvider、AppShell）
- 改造 page.tsx（首页四段式：欢迎语 + 语录 + 概览 + 身份切换 + 功能入口）
- 修正 lint 报错（set-state-in-effect → useSyncExternalStore）
- 修正 footer：移除 sticky bottom-0，仅用 mt-auto，确保长内容不覆盖、短内容贴底
- 按 VLM 反馈微调：身份标签更柔和、桌面端卡片间距加大、卡片内边距加大

Stage Summary:
- 产物：可运行的治愈系首页，支持姐姐/妹妹身份切换，响应式（手机/平板/桌面），PWA manifest 就绪，深色模式就绪
- 设计校验：VLM 二次确认配色无蓝紫渐变、留白舒适、无排版问题、陪伴感到位
- 工程校验：ESLint 0 error，dev server 200，hydration 无 mismatch，footer sticky 行为符合规范
- 已铺好的目录结构供后续 Sprint 复用：src/store、src/components/layout、src/components/home、src/hooks、src/lib
- 数据层（Prisma）尚未启用，Sprint 1 用演示数据（产品定位允许的初始化演示数据例外）
- 底部导航 5 tab 中 4 个标注"即将"，对应后续 Sprint：任务/番茄/聊天/我的
