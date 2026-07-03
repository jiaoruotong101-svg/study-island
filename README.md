# 学习小岛 · Study Island

> 一个只属于姐姐和妹妹的学习陪伴小岛。不是监督，而是陪伴。

## 功能

- 🏠 **首页**：可编辑问候 + 每日语录 + 今日概览
- ✅ **今日任务**：自主规划 + 番茄钟联动 + 创建/完成时间记录
- 📸 **错题记录**：拍照 / 上传图片 / 录音
- ⏱️ **番茄钟**：可自定义时长（默认 25/5/15），为任务计时
- 💬 **实时聊天**：文字 + 语音消息（socket.io 实时）
- 📝 **每日留言**：给彼此留小纸条（按日期归档）
- 🌿 **心情记录**：5 治愈系心情 + 时间线
- 📊 **学习统计**：概览 + 专注趋势图 + 心情/科目分布
- 🌷 **姐姐后台**：陪伴仪表盘 + AI 陪伴总结
- 👤 **我的**：身份管理 + 外观设置 + 配对码

## 技术栈

- **前端**：Next.js 16 + TypeScript + Tailwind CSS 4 + shadcn/ui
- **数据库**：Supabase Postgres
- **文件存储**：Supabase Storage
- **实时通信**：socket.io（独立 chat-service）
- **AI**：z-ai-web-dev-sdk（LLM 陪伴总结）
- **状态**：Zustand
- **图表**：recharts

## 架构

```
study-island/
├── src/                      # 主应用（Next.js）
│   ├── app/                  # 页面 + API routes
│   │   ├── api/              # 17 个 API（auth/tasks/mistakes/chat/...）
│   │   └── page.tsx          # 单路由 section 切换
│   ├── components/           # UI 组件（按板块组织）
│   ├── lib/                  # supabase client / auth / 工具
│   └── store/                # Zustand stores
├── mini-services/
│   └── chat-service/         # socket.io 中继（独立部署）
├── prisma/schema.prisma      # 数据模型（文档用，实际用 Supabase）
└── supabase-schema.sql       # Supabase 建表 SQL
```

## 本地开发

### 前置要求

- Node.js ≥ 20
- Bun ≥ 1.3
- Supabase 项目（[创建指南](https://supabase.com)）

### 步骤

```bash
# 1. 安装主应用依赖
bun install

# 2. 安装 chat-service 依赖
cd mini-services/chat-service && bun install && cd ../..

# 3. 配置环境变量
cp .env.example .env
# 编辑 .env 填入你的 Supabase 凭据

# 4. 在 Supabase SQL Editor 执行 supabase-schema.sql 建表

# 5. 在 Supabase Storage 创建 public bucket "study-island-uploads"

# 6. 启动
bun run dev                    # 终端1：主应用 :3000
cd mini-services/chat-service && bun run dev  # 终端2：chat-service :3003
```

打开 http://localhost:3000 → 注册姐姐账号开始用。

## 部署

### 主应用 → Vercel

1. 推代码到 GitHub
2. Vercel Import 该仓库
3. 配置环境变量（见 `.env.example`）
4. Install Command 改为 `bun install`
5. Deploy

### chat-service → Railway

Vercel 不能跑长连接，chat-service 部署到 Railway：

1. Railway New Project → Deploy from GitHub repo
2. Root Directory: `mini-services/chat-service`
3. Start Command: `bun run start`
4. 添加环境变量 `NEXT_PUBLIC_CHAT_SERVICE_URL`（主应用 Vercel 配置）= Railway 给的域名

### 不需要实时功能？

可跳过 chat-service 部署。聊天/留言/问候会变成"刷新才看到"，其他功能不受影响。

## 环境变量

| 变量 | 说明 |
|---|---|
| `DATABASE_URL` | Supabase Postgres 直连串 |
| `SUPABASE_URL` | Supabase 项目 URL |
| `SUPABASE_ANON_KEY` | Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service_role key（服务端） |
| `SI_SIGN_KEY` | Cookie 签名密钥（随机串） |
| `SUPABASE_BUCKET` | Storage 桶名（默认 study-island-uploads） |
| `NEXT_PUBLIC_CHAT_SERVICE_URL` | 生产环境 chat-service URL（Vercel 用） |

## 首次使用

1. 姐姐注册 → 拿到配对码
2. 妹妹注册 → 输入配对码 → 关联
3. 两人各自登录 → 共享同一套数据

## 设计理念

- **陪伴而非监督**：所有文案温暖鼓励，禁用催促/警告/排名
- **治愈系视觉**：奶白/浅绿/浅灰，玻璃质感，宋体中文 + Times 数字
- **多对隔离**：不同家庭数据互不可见

## License

私有项目，仅供个人使用。
