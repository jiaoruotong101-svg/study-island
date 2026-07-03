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

---
Task ID: SPRINT-2-Foundation
Agent: main (Z.ai Code)
Task: Sprint 2 地基 —— 玻璃质感 + 宋体/Times 字体 + 文件存储 + 导航架构

Work Log:
- 玻璃质感：在 globals.css 新增 .glass / .glass-strong / .glass-sheen 工具类（backdrop-blur + 半透明 + 高光边 + 内阴影 + 斜向高光伪元素），色系保持奶白/浅绿/浅灰
- 新增 GlassCard 组件 src/components/ui/glass-card.tsx（variant/pad/sheen 三个维度）
- 字体：next/font/google 加载 Tinos（Times 兼容）+ Noto Serif SC（宋体回退），html 字体栈 "Times New Roman", Tinos, Songti SC, SimSun, 宋体, Noto Serif SC, serif —— 中文自动用宋体、数字英文自动用 Times；新增 .font-num 工具类显式锁定数字
- layout.tsx 加背景柔色斑（leaf/cream 模糊圆），让玻璃磨砂有内容可透
- 创建共享 VoiceRecorder 组件 src/components/shared/voice-recorder.tsx（MediaRecorder API，inline/block 两种形态，useIsClient via useSyncExternalStore 避免 hydration mismatch）
- 文件存储：uploads/ 目录 + POST /api/uploads（multipart，返回 url）+ GET /api/files/[filename]（防路径穿越，按 ext 设 mime，长缓存）
- Prisma schema 新增 MistakeRecord（type/filePath/mimeType/duration/note/subject/createdBy）与 ChatMessage（senderRole/type/content/filePath/duration），db push 成功
- 导航架构：新增 useNavStore（activeTab: home/mistakes/chat）；AppFooter 改为客户端 section 切换（首页/错题/聊天可用，番茄/我的"即将"），header/footer 应用 glass-strong
- page.tsx 重构为 section 切换：activeTab=mistakes 渲染 MistakeSection，=chat 渲染 ChatSection，否则 HomeSection
- 首页各卡片（role/overview/quote/quick-entry）升级为玻璃质感；日期与概览数字加 .font-num
- 创建 stub: src/components/mistakes/mistake-section.tsx、src/components/chat/chat-section.tsx（占位，待子代理填充）
- 安装 socket.io-client

Stage Summary:
- 地基就绪：玻璃质感全局、宋体+Times 字体生效、文件上传/访问可用、Prisma 错题/聊天表已建、导航 section 切换架构落地
- ESLint 0 error 0 warning，dev server 200，next/font 编译通过
- 待并行子代理完成：2-a 错题模块、2-b 聊天模块（含 socket.io mini-service 端口 3003）
- 共享契约（供子代理遵循）：
  * GlassCard: import { GlassCard } from "@/components/ui/glass-card"; props: variant?('default'|'strong') sheen? pad?('none'|'sm'|'md'|'lg')
  * VoiceRecorder: import { VoiceRecorder } from "@/components/shared/voice-recorder"; props: onComplete(blob,durationSec) variant?('inline'|'block') disabled?
  * 上传: POST /api/uploads (FormData field 'file') -> { ok, filename, url, mimeType, size }
  * 访问: GET /api/files/<filename>
  * 当前身份: useUserStore(s=>s.currentUser) => { id, name, role: 'sister'|'younger' }
  * 数据库: import { db } from '@/lib/db'
  * 设计铁律：奶白/浅绿/浅灰，禁蓝紫，禁色块渐变（玻璃高光除外），文案陪伴不催促，文件<500行，单职责

---
Task ID: 2-a
Agent: full-stack-developer (mistake module)
Task: 错题记录模块（拍照/上传图片/录音 + CRUD）

Work Log:
- 通读 worklog.md / page.tsx / GlassCard / VoiceRecorder / user-store / db / files 路由，确认共享契约与设计铁律
- 新建 src/app/api/mistakes/route.ts：
  * GET：db.mistakeRecord.findMany({ orderBy: createdAt desc })，map 成 DTO（含 url=/api/files/<filePath>），返回 JSON 数组
  * POST：JSON body 用 unknown + 类型守卫解析（type/filePath/mimeType/createdBy 必填，duration/note/subject 可选），防路径穿越，db.create，返回 201 + DTO
  * runtime='nodejs'，全 catch + 中文陪伴向错误文案
- 新建 src/app/api/mistakes/[id]/route.ts：
  * DELETE：先 findUnique，不存在返 404；isSafeFilename 守卫后 fs.unlink（ENOENT 容忍），再 db.delete，返回 { ok: true }
  * params 用 Promise<{ id: string }> 解析（Next.js 16 规范），runtime='nodejs'
- 新建 src/components/mistakes/mistake-card.tsx：
  * MistakeCard + 导出 MistakeRecord/MistakeType/CreatorRole 类型
  * 图片：缩略图按钮 → Dialog 大图预览（DialogTitle/Description 走 sr-only 满足 a11y）
  * 语音：原生 <audio controls> + 时长 (mm:ss，.font-num)
  * 元信息：科目 Badge(leaf-soft) / 类型 Badge(outline) / 创建者 / 相对时间（中文，自实现）
  * 删除：仅创建者本人可见，AlertDialog 二次确认，文案"留下也是一种记录"
- 新建 src/components/mistakes/mistake-composer.tsx：
  * 三种录入方式：拍照(<input capture=environment>) / 上传图片(<input multiple>) / 录音(共享 VoiceRecorder inline)
  * 流程：选/拍图或录完音 → POST /api/uploads 拿 filePath → POST /api/mistakes 存库 → onCreated 推回父组件
  * 多图串行上传，进度文案"正在上传图片 i/N"；状态机 idle/uploading/saving/done
  * 科目 Select（10 项）+ 备注 Textarea(maxLength 500)，本次上传共用一份
  * 错误用陪伴向文案："网络似乎抖了一下，重试一次试试"
  * Blob → File 兜底（MediaRecorder 产出的 Blob 无 name，FormData 需要文件名），按 mime 推断扩展名
- 覆盖 src/components/mistakes/mistake-section.tsx：
  * 容器：标题区(含刷新按钮) + Composer + 列表（加载态 Skeleton×3 / 空态 GlassCard / 错误态条 / 正常态）
  * useState + fetch（未引入 QueryClientProvider，遵循"先用简单的 useState + fetch"指引）
  * 列表 max-h-[70vh] overflow-y-auto + 自定义滚动条（全局已就绪）
  * framer-motion 列表项轻柔入场（opacity+y, delay 阶梯）
  * useUserStore 取当前角色，header 副标题按姐姐/妹妹视角分别文案
- 校验：bun run lint 通过（0 error 0 warning，清理了 mistake-card 里多余的 eslint-disable）
- 端到端冒烟：curl 验证 GET/POST/DELETE 三接口均 200/201，dev.log 显示 Prisma query 正常执行

Stage Summary:
- 产物（5 个文件，严格遵守 task 范围）：
  * src/app/api/mistakes/route.ts（GET 列表 / POST 新建，约 170 行）
  * src/app/api/mistakes/[id]/route.ts（DELETE，约 70 行）
  * src/components/mistakes/mistake-card.tsx（卡片 + 类型导出，约 230 行）
  * src/components/mistakes/mistake-composer.tsx（三种录入 + 上传/保存状态机，约 290 行）
  * src/components/mistakes/mistake-section.tsx（section 容器，约 160 行）
- 关键决策：
  * 状态管理：useState + fetch（项目未配 QueryClientProvider，避免改 layout）
  * 类型导出挂在 mistake-card.tsx（单职责范围内最小代价）
  * 删除权限：客户端 currentRole===createdBy 控制（2 人本地 PWA，trust the client）
  * 路径穿越防护：POST 校验 filePath 不含 / ..；DELETE 校验后再 unlink
  * 音频扩展名：按 mime 推断（mp4/m4a/ogg/mp3/webm），确保 /api/files MIME 正确
  * 大图 Dialog 用 sr-only Title/Description 满足 Radix a11y 要求
- ⚠️ 已知问题（重要）：
  * 共享契约 /api/uploads 在 worklog 中标注已创建，但当前文件系统中 src/app/api/uploads/route.ts **不存在**（空目录存在）
  * 本次任务范围严格限定为 5 个文件，未创建 /api/uploads/route.ts
  * 影响：mistake-composer 上传图片/录音会 POST 到 /api/uploads 并失败（前端会显示"上传失败（404）"）；列表展示、查看大图、删除既有记录不受影响
  * 建议：主代理确认 /api/uploads/route.ts 是否需要补建（文件读取端 /api/files/[filename] 已就绪）
- 文案样例（陪伴向）：
  * "再错一次也没关系，记下来就赚到了"
  * "把嘴里的念叨也存下来了" / "悄悄把题目收进来了"
  * "删掉这道题吗？留下也是一种记录"
  * "记好了，慢慢来就好" / "网络似乎抖了一下，重试一次试试"
  * 空态："妹妹还没记下错题。也许今天她做对了很多。" / "这里还空着，遇到不会的题就拍下来吧。"

---
Task ID: 2-b
Agent: full-stack-developer (chat module)
Task: 实时聊天模块（socket.io 中继 + 持久化 + 文字/语音）

Work Log:
- 通读 worklog.md / page.tsx / mistakes 全模块 / GlassCard / VoiceRecorder / user-store / db / uploads / files 路由 / examples/websocket，确认共享契约、设计铁律、socket 连接规范
- 新建 mini-services/chat-service/package.json：独立 bun 项目，deps 仅 socket.io，scripts dev=`bun --hot index.ts`，type=module
- 新建 mini-services/chat-service/index.ts（约 75 行）：
  * createServer + socket.io，端口固定 3003，path '/'（Caddy 网关契约）
  * cors origin:'*' methods:['GET','POST']，pingTimeout 60s / pingInterval 25s
  * 仅监听 `chat:send` 事件 → io.emit('chat:message', payload) 广播（含发送者，前端按 id 去重）
  * 不碰数据库、不维护用户列表（2 人场景，无需 join/leave）
  * SIGTERM/SIGINT 优雅关闭（io.close → httpServer.close → exit 0）
  * 连接/断开打日志，含 connectionCount
- 新建 src/lib/chat-socket.ts（约 45 行）：
  * socket.io-client 单例 helper，导出 getChatSocket / closeChatSocket
  * 连接串 `io('/?XTransformPort=3003', {...})`，路径必为 '/'，端口只写在 query（Caddy 网关契约）
  * transports websocket+polling，reconnection true，reconnectionDelay 阶梯式退避到 10s 上限
  * 单例由模块级变量持有，跨 section 卸载/重挂不重连；监听器由调用方 on/off 自管
- 新建 src/app/api/chat/messages/route.ts（约 175 行）：
  * GET /api/chat/messages?limit=100：db.chatMessage.findMany({orderBy createdAt asc, take:limit})，limit 解析范围 [1,500] 默认 100，每条 toDTO 含 url=/api/files/<filePath> 或 null
  * POST /api/chat/messages：JSON body 用 unknown + 类型守卫解析（senderRole/type 必填，text 必须有 content，voice 必须有 filePath）
  * 防路径穿越：voice 的 filePath 不允许含 / 或 ..
  * content 上限 5000 字、duration toOptionalInt 容错
  * runtime='nodejs'，全 catch + 中文陪伴向错误文案
  * 返回 201 + DTO（含 url）
- 新建 src/components/chat/chat-message-bubble.tsx（约 140 行）：
  * 导出 ChatMessage / ChatSenderRole / ChatMessageType 类型 + ChatMessageBubble 组件（与 mistake-card 同样模式）
  * 自己靠右 leaf 色背景（bg-leaf/90 text-primary-foreground），对方靠左玻璃白（glass）
  * text：宋体正文 whitespace-pre-wrap break-words + HH:mm 时间（.font-num）
  * voice：小喇叭图标圆徽章 + 原生 audio controls（h-8 w-180/220）+ 时长 mm:ss（.font-num）
  * 圆角细节：自己 rounded-tr-sm，对方 rounded-tl-sm（贴近 chat app 习惯）
- 新建 src/components/chat/chat-composer.tsx（约 200 行）：
  * 三件套：VoiceRecorder(inline) + Textarea(自适应高度) + 发送按钮(圆形 leaf 色)
  * 文字流程：textarea Enter 发送、Shift+Enter 换行、输入法合成中（isComposing）不触发；maxLength 5000
  * 语音流程：onComplete(blob, dur) → uploadBlob(/api/uploads, 按mime推断扩展名) → saveMessage(/api/chat/messages type=voice) → onSent(record)
  * 状态机 idle/text/voice，busy 时禁用所有输入；进度小字"正在把语音送出去…"/"正在发送…"贴在输入框下
  * textarea 复用 shadcn Textarea 的 field-sizing-content，覆盖 min-h-9 max-h-40 resize-none 移除边框
  * 错误自管，文案陪伴向："消息没能发出去" / "语音没能发出去"
- 覆盖 src/components/chat/chat-section.tsx（约 215 行）：
  * 容器：header(标题 + 副标题 + 连接状态指示 + 刷新) → 错误条 → GlassCard(消息列表/加载/空态) → ChatComposer
  * 标题/副标题/placeholder/空态文案全部按角色（sister/younger）陪伴向：younger "和姐姐说说话" / sister "陪妹妹说说话"
  * useState + fetch（项目未配 QueryClientProvider，遵循"先用简单的 useState + fetch"指引）
  * 挂载时 GET /api/chat/messages?limit=100 拉历史；idsRef 维护 id 集合做去重
  * socket 监听 on('chat:message')：isChatMessagePayload 类型守卫校验后 appendMessage（按 id 去重）
  * 发送：composer 持久化后回调 onSent(record) → 本组件 socket.emit('chat:send', record) + 本地 appendMessage（发送者也会收到广播，去重避免重复）
  * 自动滚到底：wasNearBottomRef 记录用户是否在底部 80px 内，仅在底部时新消息才 scroll；手动滚上去读历史不会被强拉回
  * 加载态：4 个左右交错的 Skeleton 行（标题 + 气泡）；空态：圆徽章 + "还没有消息，跟姐姐说句晚安吧"
  * 连接状态：绿点已连接 / 灰点(脉冲)重连中；socket on connect/disconnect/reconnect_attempt/reconnect 同步状态
  * framer-motion 消息项轻柔入场（opacity+y, delay 阶梯 0.02s）
- 校验：bun run lint 通过（0 error 0 warning，exit 0）
- 端到端冒烟（curl）：
  * GET /api/chat/messages?limit=10 → 200，Prisma 查询日志正常
  * POST /api/chat/messages {younger,text,测试一下聊天} → 201，返回完整 DTO
  * POST 缺字段 → 400 "缺少必填字段：senderRole / type"
  * POST text 空内容 → 400 "文字消息内容不能为空"
  * POST voice 缺 filePath → 400 "语音消息缺少 filePath"
  * POST voice filePath="../etc/passwd" → 400 "filePath 不合法"（防穿越生效）
  * 测试数据已清理（bun -e db.chatMessage.deleteMany({})）
- mini-service 启动验证：
  * cd mini-services/chat-service && bun install → 22 包安装成功（socket.io@4.8.3）
  * bun run dev → 日志 "[chat-service] socket.io relay listening on :3003 (path: /)"
  * ss -tlnp 确认 :3003 LISTEN（bun pid 5585）
  * pkill 触发 SIGTERM → "[chat-service] SIGTERM received, closing server..." → "server closed" 优雅退出

Stage Summary:
- 产物（7 个文件，严格遵守 task 范围）：
  * mini-services/chat-service/package.json（独立 bun 项目元信息，约 14 行）
  * mini-services/chat-service/index.ts（socket.io 中继服务，约 75 行）
  * src/lib/chat-socket.ts（前端 socket 单例 helper，约 45 行）
  * src/app/api/chat/messages/route.ts（GET 历史 / POST 新建，约 175 行）
  * src/components/chat/chat-message-bubble.tsx（文字/语音气泡 + 类型导出，约 140 行）
  * src/components/chat/chat-composer.tsx（textarea + 发送 + 语音输入器，约 200 行）
  * src/components/chat/chat-section.tsx（section 容器，约 215 行）
- 关键决策：
  * 架构分层：socket 服务纯中继（不碰 DB），主应用 API 负责持久化 —— 前端先 POST 拿完整记录再 emit，避免双写不一致
  * 去重策略：socket.emit 广播含发送者自身，前端 idsRef Set 按 id 去重，避免本地 append + socket 回环造成重复
  * socket 单例：getChatSocket 模块级变量持有，跨 section 卸载/重挂不重连；监听器 on/off 由 ChatSection 自管，effect cleanup 只 off 不 disconnect
  * 自动滚到底：wasNearBottomRef 容差 80px，用户主动滚上去读历史时不被强拉回
  * 类型导出挂在 chat-message-bubble.tsx（与 mistake-card 同模式，单职责范围内最小代价）
  * 路径穿越防护：POST voice 校验 filePath 不含 / ..（与 mistakes API 一致）
  * textarea 自适应高度：复用 shadcn Textarea 的 field-sizing-content（Chrome/Edge 原生支持），覆盖 min-h-9 max-h-40
  * 文案角色陪伴向：younger "和姐姐说说话"/"想说就说，姐姐都听着"/"还没有消息，跟姐姐说句晚安吧" vs sister "陪妹妹说说话"/"你说的每一句，她都能看见"/"给妹妹留句晚安吧"
- mini-service 启动方式：
  * cd mini-services/chat-service && bun install（首次）
  * bun run dev（热重载，端口固定 3003，path '/'）
  * 与 Caddy 网关配合：前端 io('/?XTransformPort=3003') → Caddy 转发到 localhost:3003
- ⚠️ 已知事项 / 后续注意：
  * mini-service 默认未由主应用 dev 流程拉起，需要主代理在最终部署/启动脚本里加上 `bun run dev`（后台），否则聊天实时性不可用（仍可发消息但只能下次刷新看到对方回复）
  * socket.io-client 在 SSR 时 import 不报错（仅 io() 调用在 effect 内），已确认 dev server 编译通过
  * 语音消息 native <audio controls> 在不同浏览器高度略有差异（Chrome/Edge 32px、Safari 可能更高），已设 h-8 作为目标高度，可接受
  * 单条文字消息上限 5000 字（API 层 slice），与 textarea maxLength 一致
- 文案样例（陪伴向）：
  * 标题："和姐姐说说话" / "陪妹妹说说话"
  * 副标题："想说就说，姐姐都听着" / "你说的每一句，她都能看见"
  * placeholder："想说点什么，姐姐都听着呢…" / "给妹妹留句话吧，慢慢打也行…"
  * 空态："还没有消息，跟姐姐说句晚安吧" / "还没开始说话。给妹妹留句晚安吧"
  * 进度："正在把语音送出去…" / "正在发送…"
  * 错误："消息没能发出去" / "语音没能发出去" / "聊天记录暂时打不开，稍等一下再试"
  * 连接状态："已连接" / "重连中"

---
Task ID: SPRINT-2-Integration
Agent: main (Z.ai Code)
Task: Sprint 2 集成 + 端到端自检

Work Log:
- 补建遗漏的 /api/uploads/route.ts（multipart 上传，uuid 文件名，返回 url/mimeType/size），并给 /api/files/[filename] 与 /api/uploads 加 runtime=nodejs
- 启动 chat mini-service（mini-services/chat-service，bun --hot，端口 3003）后台常驻
- 清理子代理冒烟测试残留数据
- Agent Browser 端到端自检（关键发现：socket 必须经 Caddy:81 网关才通，直连 :3000 会因 XTransformPort 不被 Next 识别而显示"重连中"；改用 :81 后 socket"已连接"）
- 验证项：
  * 首页玻璃质感 + 宋体/Times 字体（VLM 确认：半透明卡片/高光边/背景透出、中文宋体数字Times、奶白浅绿浅灰无蓝紫渐变）
  * 底部 nav 切换：首页/错题/聊天可用，番茄/我的"即将"
  * 错题板块：拍照/上传图片/录音三入口齐全；curl 验证 upload→create→list 全链路 200/201；浏览器渲染缩略图+大图Dialog+删除按钮；VLM 确认视觉
  * 聊天板块：双会话（妹妹+姐姐）实时验证——姐姐发送文字，妹妹会话不刷新即时收到（socket.io 端到端打通）；语音消息上传+建库+audio播放器渲染+0:08时长显示
  * 控制台无 error/warn
- 清理测试数据，恢复干净初始态

Stage Summary:
- Sprint 2 全部交付：玻璃质感全局、宋体+Times 字体、错题记录(拍照/上传/录音/CRUD)、实时聊天(文字+语音/双向往来)
- 工程校验：ESLint 0 error 0 warning，dev:3000 + chat-service:3003 常驻，hydration 无 mismatch
- 关键架构决策：单路由 + 客户端 section 切换（useNavStore）；聊天 = socket 中继(3003) + 主应用 API 持久化(3000)；文件存储 uploads/ + /api/files 访问
- 待后续 Sprint：番茄钟、每日留言、心情记录、学习统计、姐姐后台、AI 总结
- 注意事项给后续：实时功能测试必须走 Caddy:81 而非直连 :3000
