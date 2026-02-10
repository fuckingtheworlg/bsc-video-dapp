"use client";

import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles, Play } from "lucide-react";
import Link from "next/link";
import { FadeIn } from "./animations/FadeIn";
import { TextReveal } from "./animations/TextReveal";

export function Hero() {
  return (
    <section className="relative min-h-[80vh] flex flex-col justify-center items-center text-center px-4 py-20 overflow-hidden">
      {/* Background Elements */}
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-purple-900/20 via-black to-black" />
      <div className="absolute top-0 left-0 w-full h-full bg-[url('/grid.svg')] bg-center [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))]" />
      
      {/* Floating Orbs */}
      <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse delay-1000" />

      <div className="max-w-5xl mx-auto space-y-8 relative z-10">
        <FadeIn delay={0.2} className="flex justify-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-sm text-zinc-300 backdrop-blur-sm">
            <Sparkles className="w-4 h-4 text-yellow-400" />
            <span>Web3 Video & AI Creation Platform</span>
          </div>
        </FadeIn>

        <div className="space-y-4">
          <h1 className="text-5xl md:text-7xl font-bold tracking-tight">
            <div className="flex flex-col items-center gap-2">
              <TextReveal text="Create, Watch & Earn" className="bg-gradient-to-r from-white via-blue-100 to-zinc-400 bg-clip-text text-transparent" />
              <span className="text-4xl md:text-6xl text-zinc-500 font-medium">on Binance Smart Chain</span>
            </div>
          </h1>
          
          <FadeIn delay={0.4} className="max-w-2xl mx-auto">
            <p className="text-xl text-zinc-400 leading-relaxed">
              The next generation of decentralized video sharing. Burn tokens to upload, 
              use AI to create content, and earn rewards from every transaction.
            </p>
          </FadeIn>
        </div>

        <FadeIn delay={0.6} className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-8">
          <Link href="/create">
            <Button size="lg" className="h-14 px-8 rounded-full text-lg bg-white text-black hover:bg-zinc-200 transition-all hover:scale-105">
              <Sparkles className="mr-2 h-5 w-5" />
              Create AI Video
            </Button>
          </Link>
          <Link href="#explore">
            <Button size="lg" variant="outline" className="h-14 px-8 rounded-full text-lg border-white/20 hover:bg-white/10 transition-all hover:scale-105">
              <Play className="mr-2 h-5 w-5" />
              Start Watching
            </Button>
          </Link>
        </FadeIn>
      </div>
    </section>
  );
}
