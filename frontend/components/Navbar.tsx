"use client";

import Link from "next/link";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { Video, Home, User, Upload, Sparkles, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export function Navbar() {
  const pathname = usePathname();

  const navItems = [
    { name: "首页", href: "/", icon: Home },
    { name: "AI 创作", href: "/create", icon: Wand2 },
    { name: "个人中心", href: "/profile", icon: User },
  ];

  return (
    <nav className="border-b border-white/10 bg-black/20 backdrop-blur-xl supports-[backdrop-filter]:bg-black/20 sticky top-0 z-50">
      <div className="container flex h-16 items-center justify-between px-4">
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center gap-2 font-bold text-xl group">
            <div className="relative">
              <div className="absolute -inset-1 rounded-full bg-gradient-to-r from-blue-600 to-cyan-500 opacity-75 blur transition duration-500 group-hover:opacity-100" />
              <Video className="relative h-6 w-6 text-white" />
            </div>
            <span className="bg-gradient-to-r from-white to-white/70 bg-clip-text text-transparent group-hover:to-white transition-all">
              BSC 视频 DApp
            </span>
          </Link>

          <div className="hidden md:flex items-center gap-6">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-2 text-sm font-medium transition-all duration-300",
                  pathname === item.href
                    ? "text-blue-400 drop-shadow-[0_0_8px_rgba(96,165,250,0.5)]"
                    : "text-zinc-400 hover:text-white hover:drop-shadow-[0_0_8px_rgba(255,255,255,0.3)]"
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.name}
              </Link>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-4">
          <Link href="/upload">
            <Button 
              variant="secondary" 
              size="sm" 
              className="hidden md:flex gap-2 bg-white/10 hover:bg-white/20 text-white border border-white/10 backdrop-blur-sm transition-all duration-300 hover:scale-105 active:scale-95"
            >
              <Upload className="h-4 w-4" />
              上传视频
            </Button>
          </Link>
          <div className="transition-transform duration-300 hover:scale-105">
            <ConnectButton showBalance={false} chainStatus="icon" accountStatus="avatar" />
          </div>
        </div>
      </div>
    </nav>
  );
}
