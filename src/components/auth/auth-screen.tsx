"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Leaf } from "lucide-react";
import { GlassCard } from "@/components/ui/glass-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useAuthStore } from "@/store/auth-store";
import { cn } from "@/lib/utils";

/**
 * 登录/注册页。
 *
 * 两种模式：
 *   - login：用户名 + 密钥
 *   - register：选角色（姐姐/妹妹）+ 用户名 + 密钥 + 显示名
 *     妹妹还需填配对码（姐姐注册后把码告诉她）
 *
 * 注册姐姐成功后显示配对码，提示她告诉妹妹。
 */
type Mode = "login" | "register";

export function AuthScreen() {
  const [mode, setMode] = useState<Mode>("login");
  return (
    <div className="relative flex min-h-screen items-center justify-center px-4 py-10">
      {/* 背景色斑（与主界面一致） */}
      <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -left-24 -top-24 h-72 w-72 rounded-full bg-leaf/10 blur-3xl" />
        <div className="absolute -right-32 top-1/3 h-80 w-80 rounded-full bg-cream/60 blur-3xl" />
        <div className="absolute bottom-0 left-1/3 h-72 w-72 rounded-full bg-leaf/8 blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md"
      >
        <GlassCard variant="strong" sheen pad="lg">
          {/* 顶部 logo + 标题 */}
          <div className="mb-6 flex flex-col items-center gap-2 text-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-leaf-soft/60 text-leaf">
              <Leaf className="h-7 w-7" />
            </span>
            <h1 className="text-2xl font-semibold text-foreground">学习小岛</h1>
            <p className="text-sm text-muted-foreground">
              一个只属于姐姐和妹妹的小岛
            </p>
          </div>

          {/* 模式切换 */}
          <div className="mb-5 grid grid-cols-2 gap-1 rounded-xl bg-muted/40 p-1">
            <ModeTab active={mode === "login"} onClick={() => setMode("login")}>
              登录
            </ModeTab>
            <ModeTab
              active={mode === "register"}
              onClick={() => setMode("register")}
            >
              注册
            </ModeTab>
          </div>

          {mode === "login" ? <LoginForm /> : <RegisterForm />}
        </GlassCard>
      </motion.div>
    </div>
  );
}

function ModeTab({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-lg py-2 text-sm font-medium transition-colors",
        active
          ? "bg-background text-leaf shadow-sm"
          : "text-muted-foreground hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}

/* ---------------------------- 登录表单 ---------------------------- */

function LoginForm() {
  const { toast } = useToast();
  const fetchMe = useAuthStore((s) => s.fetchMe);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = (await res.json()) as { ok: boolean; error?: string };
      if (!res.ok || !data.ok) {
        setError(data.error ?? "登录失败，再试一次");
        return;
      }
      await fetchMe();
      toast({ description: "欢迎回到小岛" });
    } catch {
      setError("网络似乎抖了一下，再试一次");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Field
        id="login-username"
        label="用户名"
        value={username}
        onChange={setUsername}
        placeholder="字母数字下划线"
        autoComplete="username"
      />
      <Field
        id="login-password"
        label="密钥"
        type="password"
        value={password}
        onChange={setPassword}
        placeholder="至少 6 位"
        autoComplete="current-password"
      />
      {error && <p className="text-xs text-destructive">{error}</p>}
      <Button
        type="submit"
        disabled={loading || !username || !password}
        className="w-full bg-leaf text-primary-foreground hover:bg-leaf/90"
      >
        {loading ? "正在登录…" : "登录小岛"}
      </Button>
    </form>
  );
}

/* ---------------------------- 注册表单 ---------------------------- */

function RegisterForm() {
  const { toast } = useToast();
  const fetchMe = useAuthStore((s) => s.fetchMe);
  const [role, setRole] = useState<"sister" | "younger">("sister");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [pairCode, setPairCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generatedPairCode, setGeneratedPairCode] = useState<string | null>(
    null,
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username,
          password,
          displayName,
          role,
          pairCode: role === "younger" ? pairCode.toUpperCase() : undefined,
        }),
      });
      const data = (await res.json()) as {
        ok: boolean;
        error?: string;
        pairCode?: string;
      };
      if (!res.ok || !data.ok) {
        setError(data.error ?? "注册失败，再试一次");
        return;
      }
      if (role === "sister" && data.pairCode) {
        // 姐姐注册成功，显示配对码，但不立即跳转（让她记住码）
        setGeneratedPairCode(data.pairCode);
        await fetchMe();
      } else {
        // 妹妹注册成功，直接登录
        await fetchMe();
        toast({ description: "配对成功，欢迎加入小岛" });
      }
    } catch {
      setError("网络似乎抖了一下，再试一次");
    } finally {
      setLoading(false);
    }
  }

  // 姐姐注册成功后的配对码展示
  if (generatedPairCode) {
    return (
      <div className="space-y-4 text-center">
        <p className="text-sm text-muted-foreground">注册成功啦！</p>
        <div className="rounded-2xl bg-leaf-soft/40 p-5">
          <p className="text-xs text-muted-foreground">你的小岛配对码</p>
          <p className="font-num mt-2 text-3xl font-bold tracking-[0.3em] text-leaf">
            {generatedPairCode}
          </p>
        </div>
        <p className="text-sm leading-relaxed text-muted-foreground">
          把这个码告诉妹妹，她注册时填入就能和你的小岛关联啦。
        </p>
        <Button
          type="button"
          onClick={() => toast({ description: "已进入小岛" })}
          className="w-full bg-leaf text-primary-foreground hover:bg-leaf/90"
        >
          进入小岛
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* 角色选择 */}
      <div className="space-y-2">
        <Label className="text-sm text-foreground">我是</Label>
        <div className="grid grid-cols-2 gap-2">
          <RoleOption
            active={role === "sister"}
            onClick={() => setRole("sister")}
            emoji="🌷"
            label="姐姐"
            hint="创建小岛"
          />
          <RoleOption
            active={role === "younger"}
            onClick={() => setRole("younger")}
            emoji="🌱"
            label="妹妹"
            hint="加入小岛"
          />
        </div>
      </div>

      <Field
        id="reg-username"
        label="用户名"
        value={username}
        onChange={setUsername}
        placeholder="3-20 位字母数字下划线"
        autoComplete="username"
      />
      <Field
        id="reg-password"
        label="密钥"
        type="password"
        value={password}
        onChange={setPassword}
        placeholder="至少 6 位"
        autoComplete="new-password"
      />
      <Field
        id="reg-displayName"
        label="显示名"
        value={displayName}
        onChange={setDisplayName}
        placeholder="比如：姐姐 / 妹妹 / 昵称"
      />

      {role === "younger" && (
        <Field
          id="reg-pairCode"
          label="配对码"
          value={pairCode}
          onChange={setPairCode}
          placeholder="姐姐给你的 6 位码"
          uppercase
        />
      )}

      {role === "sister" && (
        <p className="rounded-lg bg-leaf-soft/30 px-3 py-2 text-xs leading-relaxed text-muted-foreground">
          姐姐注册后会生成一个配对码，把它告诉妹妹，她就能加入你的小岛。
        </p>
      )}

      {error && <p className="text-xs text-destructive">{error}</p>}

      <Button
        type="submit"
        disabled={loading || !username || !password || !displayName}
        className="w-full bg-leaf text-primary-foreground hover:bg-leaf/90"
      >
        {loading ? "正在注册…" : role === "sister" ? "创建小岛" : "加入小岛"}
      </Button>
    </form>
  );
}

function RoleOption({
  active,
  onClick,
  emoji,
  label,
  hint,
}: {
  active: boolean;
  onClick: () => void;
  emoji: string;
  label: string;
  hint: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "flex flex-col items-center gap-0.5 rounded-xl border px-3 py-3 transition-colors",
        active
          ? "border-leaf bg-leaf-soft text-leaf"
          : "border-border bg-background/40 text-muted-foreground hover:border-leaf/40",
      )}
    >
      <span className="text-2xl" aria-hidden>
        {emoji}
      </span>
      <span className="text-sm font-medium">{label}</span>
      <span className="text-[10px]">{hint}</span>
    </button>
  );
}

function Field({
  id,
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  autoComplete,
  uppercase,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  autoComplete?: string;
  uppercase?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-sm text-foreground">
        {label}
      </Label>
      <Input
        id={id}
        type={type}
        value={value}
        onChange={(e) =>
          onChange(uppercase ? e.target.value.toUpperCase() : e.target.value)
        }
        placeholder={placeholder}
        autoComplete={autoComplete}
        className="bg-background/60"
      />
    </div>
  );
}
