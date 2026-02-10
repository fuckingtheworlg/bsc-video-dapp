"use client";

import Link from "next/link";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { Home, User, Upload, Wand2, Menu, X } from "lucide-react";
import { SeeshowLogo } from "@/components/SeeshowLogo";
import { Button } from "@/components/ui/button";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useState, useEffect, useRef } from "react";

export function Navbar() {
  const pathname = usePathname();
  const [hidden, setHidden] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const lastScrollY = useRef(0);

  useEffect(() => {
    const handleScroll = () => {
      const currentY = window.scrollY;
      if (currentY > lastScrollY.current && currentY > 80) {
        setHidden(true);
      } else {
        setHidden(false);
      }
      lastScrollY.current = currentY;
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const navItems = [
    { name: "首页", href: "/", icon: Home },
    { name: "AI 创作", href: "/create", icon: Wand2 },
    { name: "个人中心", href: "/profile", icon: User },
  ];

  return (
    <nav className={cn(
      "sticky top-4 z-50 px-4 transition-all duration-300",
      hidden ? "-translate-y-24 opacity-0" : "translate-y-0 opacity-100"
    )}>
      <div className="container mx-auto">
        <div className="h-16 flex items-center justify-between px-6 rounded-full border border-white/10 bg-black/40 backdrop-blur-xl shadow-lg supports-[backdrop-filter]:bg-black/40">
          <div className="flex items-center gap-8">
            <Link href="/" className="flex items-center gap-2 font-bold text-xl group">
              <div className="relative">
                <div className="absolute -inset-1 rounded-full bg-gradient-to-r from-blue-600 to-cyan-500 opacity-75 blur transition duration-500 group-hover:opacity-100" />
                <SeeshowLogo size={28} className="relative text-white" />
              </div>
              <span className="bg-gradient-to-r from-white to-white/70 bg-clip-text text-transparent group-hover:to-white transition-all">
                SEESHOW
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

          <div className="flex items-center gap-2 md:gap-4">
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
            <a
              href="https://x.com/SEESHOWBNB/articles"
              target="_blank"
              rel="noopener noreferrer"
              className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-400 hover:text-white text-sm transition-all duration-300"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
              <span>Twitter</span>
            </a>
            <div className="transition-transform duration-300 hover:scale-105">
              <ConnectButton showBalance={false} chainStatus="icon" accountStatus="avatar" />
            </div>
            {/* Mobile menu toggle */}
            <button
              className="md:hidden p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile dropdown menu */}
      {mobileMenuOpen && (
        <div className="md:hidden container mx-auto mt-2 px-4 animate-slide-up">
          <div className="rounded-2xl border border-white/10 bg-black/80 backdrop-blur-xl p-4 space-y-2 shadow-xl">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all",
                  pathname === item.href
                    ? "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                    : "text-zinc-400 hover:text-white hover:bg-white/5"
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.name}
              </Link>
            ))}
            <Link
              href="/upload"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-zinc-400 hover:text-white hover:bg-white/5 transition-all"
            >
              <Upload className="h-4 w-4" />
              上传视频
            </Link>
            <a
              href="https://x.com/SEESHOWBNB/articles"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-zinc-400 hover:text-white hover:bg-white/5 transition-all"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
              Twitter
            </a>
          </div>
        </div>
      )}
    </nav>
  );
}
