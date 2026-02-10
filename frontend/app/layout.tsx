import type { Metadata, Viewport } from "next";
import { Inter, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { MeteorShower } from "@/components/MeteorShower";
import { Toaster } from "@/components/ui/sonner";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#000000',
};

export const metadata: Metadata = {
  title: "SEESHOW - Web3 视频与 AI 创作平台",
  description: "基于 BSC 的去中心化视频平台，通过 AI 创作与代币经济实现内容价值最大化。",
  openGraph: {
    title: "SEESHOW - Web3 视频与 AI 创作平台",
    description: "基于 BSC 的去中心化视频平台，燃烧代币上传视频，AI 辅助创作，点赞互动赚取收益。",
    type: "website",
    siteName: "SEESHOW",
  },
  twitter: {
    card: "summary_large_image",
    title: "SEESHOW",
    description: "基于 BSC 的去中心化视频平台",
    creator: "@SEESHOWBNB",
  },
  icons: {
    icon: "/logo.jpg",
    apple: "/logo.jpg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" suppressHydrationWarning className="dark">
      <body
        suppressHydrationWarning
        className={`${inter.variable} ${geistMono.variable} antialiased min-h-screen bg-black text-foreground relative selection:bg-blue-500/30 selection:text-blue-200`}
      >
        <div className="fixed inset-0 -z-50 bg-black">
          <div className="absolute inset-0 bg-[url('/grid.svg')] bg-[size:50px_50px] opacity-20 [mask-image:linear-gradient(to_bottom,white,transparent)]" />
          <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-blue-500/5 blur-[120px] animate-pulse" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-purple-500/5 blur-[120px] animate-pulse delay-1000" />
        </div>
        <MeteorShower />
        <Providers>
          <Navbar />
          <main className="min-h-[calc(100vh-4rem)] relative z-10">
            {children}
          </main>
          <Footer />
          <Toaster position="top-center" richColors />
        </Providers>
      </body>
    </html>
  );
}
