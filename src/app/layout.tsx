import type { Metadata, Viewport } from "next";
import { Tinos, Noto_Serif_SC } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { ThemeProvider } from "@/components/theme-provider";
import { AppShell } from "@/components/layout/app-shell";

/* 字体：宋体（中文）+ Times New Roman（数字/英文）。
   - Tinos：Times New Roman 的度量兼容开源替代（Linux/Android 无 Times 时回退）
   - Noto Serif SC：宋体风格的中文衬线（Linux/Android 无 SimSun 时回退）
   - 在 Mac/Windows 上，CSS 字体栈会优先使用本地 Times New Roman 与 Songti SC/SimSun。 */
const tinos = Tinos({
  variable: "--font-tinos",
  subsets: ["latin"],
  weight: ["400", "700"],
  style: ["normal", "italic"],
  display: "swap",
});

const notoSerifSC = Noto_Serif_SC({
  variable: "--font-noto-serif-sc",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "学习小岛 · 陪你高三",
  description:
    "一个只属于姐姐和妹妹的学习陪伴小岛。不是监督，而是陪伴。",
  keywords: ["学习小岛", "高三", "陪伴", "番茄钟", "学习记录"],
  authors: [{ name: "Study Island" }],
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "学习小岛",
  },
  icons: {
    icon: [
      { url: "/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f7f5ef" },
    { media: "(prefers-color-scheme: dark)", color: "#1f2622" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="zh-CN"
      suppressHydrationWarning
      className={`${tinos.variable} ${notoSerifSC.variable}`}
    >
      <body className="antialiased bg-background text-foreground">
        {/* 背景柔色斑 —— 让玻璃质感的磨砂有内容可透，不引入色块渐变到内容区 */}
        <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
          <div className="absolute -left-24 -top-24 h-72 w-72 rounded-full bg-leaf/10 blur-3xl" />
          <div className="absolute -right-32 top-1/3 h-80 w-80 rounded-full bg-cream/60 blur-3xl" />
          <div className="absolute bottom-0 left-1/3 h-72 w-72 rounded-full bg-leaf/8 blur-3xl" />
        </div>
        <ThemeProvider>
          <AppShell>{children}</AppShell>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
