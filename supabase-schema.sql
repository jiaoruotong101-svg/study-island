-- 学习小岛 · Supabase 建表 SQL
-- 通过 Supabase SQL Editor 执行，或用 service_role key 调 /rest/v1/rpc

-- 配对
create table if not exists "Pair" (
  id text primary key,
  code text unique not null,
  "createdBy" text not null,
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now()
);

-- 账号
create table if not exists "Account" (
  id text primary key,
  username text unique not null,
  "passwordHash" text not null,
  "displayName" text not null,
  role text not null,
  "pairId" text not null,
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now()
);

-- 首页留言
create table if not exists "HomeQuote" (
  id text primary key,
  content text not null,
  "authorRole" text not null,
  "pairId" text unique not null,
  "updatedAt" timestamptz not null default now()
);

-- 首页问候
create table if not exists "HomeGreeting" (
  id text primary key,
  heading text not null,
  subtitle text not null,
  "authorRole" text not null,
  "pairId" text unique not null,
  "updatedAt" timestamptz not null default now()
);

-- 错题
create table if not exists "MistakeRecord" (
  id text primary key,
  type text not null,
  "filePath" text not null,
  "mimeType" text not null,
  duration int,
  note text,
  subject text,
  "createdBy" text not null,
  "pairId" text not null,
  "createdAt" timestamptz not null default now()
);

-- 聊天消息
create table if not exists "ChatMessage" (
  id text primary key,
  "senderRole" text not null,
  type text not null,
  content text,
  "filePath" text,
  duration int,
  "pairId" text not null,
  "createdAt" timestamptz not null default now()
);

-- 任务
create table if not exists "Task" (
  id text primary key,
  title text not null,
  subject text,
  "estimatedPomodoros" int not null default 1,
  "completedPomodoros" int not null default 0,
  done boolean not null default false,
  "completedAt" timestamptz,
  "createdBy" text not null,
  "taskDate" text not null,
  "pairId" text not null,
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now()
);

-- 专注会话
create table if not exists "FocusSession" (
  id text primary key,
  role text not null,
  "taskId" text,
  "durationMinutes" int not null,
  type text not null,
  "pairId" text not null,
  "completedAt" timestamptz not null default now()
);

-- 心情
create table if not exists "MoodEntry" (
  id text primary key,
  role text not null,
  mood text not null,
  note text,
  "pairId" text not null,
  "createdAt" timestamptz not null default now()
);

-- 每日留言
create table if not exists "DailyNote" (
  id text primary key,
  "authorRole" text not null,
  content text not null,
  "noteDate" text not null,
  "pairId" text not null,
  "createdAt" timestamptz not null default now()
);

-- 索引（按 pairId 查询频繁）
create index if not exists idx_account_pair on "Account"("pairId");
create index if not exists idx_mistake_pair on "MistakeRecord"("pairId", "createdAt");
create index if not exists idx_chat_pair on "ChatMessage"("pairId", "createdAt");
create index if not exists idx_task_pair on "Task"("pairId", "taskDate");
create index if not exists idx_focus_pair on "FocusSession"("pairId", "completedAt");
create index if not exists idx_mood_pair on "MoodEntry"("pairId", "createdAt");
create index if not exists idx_note_pair on "DailyNote"("pairId", "noteDate");
