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
    <nav className="sticky top-4 z-50 px-4">
      <div className="container mx-auto">
        <div className="h-16 flex items-center justify-between px-6 rounded-full border border-white/10 bg-black/40 backdrop-blur-xl shadow-lg supports-[backdrop-filter]:bg-black/40">
          <div className="flex items-center gap-8">
            <Link href="/" className="flex items-center gap-2 font-bold text-xl group">
              <div className="relative">
                <div className="absolute -inset-1 rounded-full bg-gradient-to-r from-blue-600 to-cyan-500 opacity-75 blur transition duration-500 group-hover:opacity-100" />
                <Video className="relative h-6 w-6 text-white" />
              </div>
              <span className="bg-gradient-to-r from-white to-white/70 bg-clip-text text-transparent group-hover:to-white transition-all">
                BSC Video
              </span>
            </Link>

            <div className="hidden md:flex items-center gap-6">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-2 text-sm font-medium transition-all duration-300 relative group py-1",
                    pathname === item.href
                      ? "text-white"
                      : "text-zinc-400 hover:text-white"
                  )}
                >
                  <item.icon className={cn(
                    "h-4 w-4 transition-colors",
                    pathname === item.href ? "text-blue-400" : "text-zinc-400 group-hover:text-white"
                  )} />
                  {item.name}
                  {pathname === item.href && (
                    <span className="absolute -bottom-1 left-0 w-full h-0.5 bg-blue-500 rounded-full shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
                  )}
                </Link>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-4">
            <Link href="/upload">
              <Button 
                variant="secondary" 
                size="sm" 
                className="hidden md:flex gap-2 rounded-full bg-white/10 hover:bg-white/20 text-white border border-white/10 backdrop-blur-sm transition-all duration-300 hover:scale-105 active:scale-95 hover:shadow-[0_0_20px_-5px_rgba(255,255,255,0.3)]"
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
      </div>
    </nav>
  );
}
