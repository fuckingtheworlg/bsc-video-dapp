"use client";

import { Button } from "@/components/ui/button";
import { ArrowRight, Play, Sparkles, Copy } from "lucide-react";
import Link from "next/link";
import { FadeIn } from "./animations/FadeIn";
import { TextReveal } from "./animations/TextReveal";
import { SeeshowLogo } from "./SeeshowLogo";

export function Hero() {
  return (
    <section className="relative min-h-[85vh] flex items-center overflow-hidden pt-20 pb-32">
      {/* Stripe-like Slanted Background */}
      <div className="absolute inset-0 -z-20 bg-black" />
      <div className="absolute inset-0 -z-10 bg-gradient-to-br from-purple-900/20 via-blue-900/10 to-transparent skew-y-[-3deg] transform origin-top-left scale-110 translate-y-[-10%]" />
      
      {/* Grid Pattern */}
      <div className="absolute inset-0 -z-10 bg-[url('/grid.svg')] bg-[size:50px_50px] opacity-20 [mask-image:linear-gradient(to_bottom,white,transparent)]" />

      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-8 items-center">
          
          {/* Left Column: Text */}
          <div className="max-w-2xl">
            <FadeIn delay={0.1}>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-sm font-medium mb-6">
                <Sparkles className="w-4 h-4" />
                <span>Web3 视频与 AI 创作平台</span>
              </div>
            </FadeIn>
            
            <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-white mb-6 leading-[1.1]">
              <TextReveal text="创造、观看" className="block" />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">
                并获得收益
              </span>
            </h1>

            <FadeIn delay={0.3}>
              <p className="text-lg md:text-xl text-zinc-400 mb-8 leading-relaxed max-w-lg">
                基于币安智能链（BSC）的下一代去中心化视频平台。
                <br />
                燃烧代币上传视频，使用 AI 辅助创作，通过点赞互动赚取被动收入。
              </p>
            </FadeIn>

            <FadeIn delay={0.4} className="flex flex-wrap gap-4">
              <Link href="/create">
                <Button size="lg" className="h-14 px-8 rounded-full text-base font-semibold bg-white text-black hover:bg-zinc-100 transition-all hover:scale-105 shadow-[0_0_20px_-5px_rgba(255,255,255,0.3)]">
                  开始 AI 创作
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <Link href="#explore">
                <Button size="lg" variant="outline" className="h-14 px-8 rounded-full text-base font-semibold border-white/20 text-white hover:bg-white/10 transition-all hover:scale-105">
                  <Play className="mr-2 h-4 w-4" />
                  浏览视频
                </Button>
              </Link>
            </FadeIn>

            {/* CA + Twitter Banner */}
            <FadeIn delay={0.5} className="flex flex-wrap items-center gap-3 mt-2">
              <div
                className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 backdrop-blur-sm cursor-pointer hover:bg-white/10 transition-all"
                onClick={() => {
                  const ca = process.env.NEXT_PUBLIC_TOKEN_CA || "";
                  if (ca) {
                    navigator.clipboard.writeText(ca);
                  }
                }}
                title={process.env.NEXT_PUBLIC_TOKEN_CA || "即将公布"}
              >
                <span className="text-xs text-zinc-500 font-medium">CA:</span>
                {process.env.NEXT_PUBLIC_TOKEN_CA ? (
                  <span className="text-xs text-yellow-400/80 font-mono">
                    {process.env.NEXT_PUBLIC_TOKEN_CA.slice(0, 6)}...{process.env.NEXT_PUBLIC_TOKEN_CA.slice(-4)}
                  </span>
                ) : (
                  <span className="text-xs text-yellow-400/80 font-mono animate-pulse">即将公布</span>
                )}
              </div>
              <a
                href="https://x.com/SEESHOWBNB/articles"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 backdrop-blur-sm transition-all duration-300 group"
              >
                <svg className="w-4 h-4 text-zinc-400 group-hover:text-white transition-colors" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                <span className="text-xs text-zinc-400 group-hover:text-white transition-colors">@SEESHOWBNB</span>
              </a>
            </FadeIn>
          </div>

          {/* Right Column: Visual/Mockup */}
          <div className="relative lg:h-[600px] flex items-center justify-center">
            <FadeIn delay={0.5} className="relative w-full max-w-lg aspect-square lg:aspect-auto lg:h-full">
              {/* Abstract Floating Elements */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] bg-gradient-to-br from-blue-500/10 to-purple-500/10 rounded-full blur-3xl animate-pulse" />
              
              {/* Main Card Mockup */}
              <div className="absolute top-[10%] left-[5%] right-[5%] bottom-[10%] bg-zinc-900/80 backdrop-blur-xl border border-white/10 rounded-3xl shadow-2xl overflow-hidden transform rotate-[-6deg] hover:rotate-0 transition-all duration-700 ease-out z-10">
                <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent" />
                
                {/* Mock UI Content */}
                <div className="p-6 space-y-6">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-r from-blue-500 to-purple-500" />
                    <div className="space-y-2">
                      <div className="h-4 w-32 bg-white/20 rounded-full" />
                      <div className="h-3 w-20 bg-white/10 rounded-full" />
                    </div>
                  </div>
                  <div className="aspect-video w-full rounded-xl bg-gradient-to-br from-zinc-800 to-zinc-900 border border-white/5 flex items-center justify-center relative overflow-hidden group">
                     <div className="absolute inset-0 bg-gradient-to-tr from-blue-500/20 to-purple-500/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                     <Play className="w-16 h-16 text-white/20 group-hover:text-white/80 transition-all duration-500 transform group-hover:scale-110" />
                  </div>
                  <div className="flex justify-between items-center">
                     <div className="space-y-2">
                        <div className="h-4 w-48 bg-white/20 rounded-full" />
                        <div className="h-3 w-32 bg-white/10 rounded-full" />
                     </div>
                     <div className="px-4 py-2 rounded-lg bg-white/10 border border-white/10 text-white font-mono text-sm">
                        +150 SEESHOW
                     </div>
                  </div>
                </div>
              </div>

              {/* Floating Badge 1 */}
              <div className="hidden md:block absolute top-[20%] right-[-5%] bg-zinc-900/90 backdrop-blur-md border border-white/10 p-4 rounded-2xl shadow-xl transform rotate-[12deg] animate-float z-20">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-500/20 rounded-lg">
                    <Sparkles className="w-5 h-5 text-green-400" />
                  </div>
                  <div>
                    <div className="text-xs text-zinc-400">创作收益</div>
                    <div className="text-sm font-bold text-white">+ 2,400.00 SEESHOW</div>
                  </div>
                </div>
              </div>

              {/* Floating Badge 2 */}
              <div className="hidden md:block absolute bottom-[20%] left-[-5%] bg-zinc-900/90 backdrop-blur-md border border-white/10 p-4 rounded-2xl shadow-xl transform rotate-[-8deg] animate-float-delayed z-20">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-500/20 rounded-lg">
                    <Play className="w-5 h-5 text-purple-400" />
                  </div>
                  <div>
                    <div className="text-xs text-zinc-400">观看时长</div>
                    <div className="text-sm font-bold text-white">12.5 小时</div>
                  </div>
                </div>
              </div>

            </FadeIn>
          </div>
        </div>
      </div>
    </section>
  );
}
