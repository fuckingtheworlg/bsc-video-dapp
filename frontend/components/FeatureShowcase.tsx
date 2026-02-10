"use client";

import { motion } from "framer-motion";
import { Flame, Wand2, Coins, TrendingUp } from "lucide-react";
import { FadeIn } from "./animations/FadeIn";

const features = [
  {
    title: "Burn to Upload",
    description: "Quality control mechanism. Burn 50,000 VIDE tokens to get an upload permit. This reduces supply and ensures high-quality content.",
    icon: Flame,
    className: "md:col-span-2",
    gradient: "from-orange-500/20 to-red-500/20",
    textGradient: "from-orange-400 to-red-400"
  },
  {
    title: "AI Generation",
    description: "Create stunning videos and images using our integrated Volcengine Seedance AI model.",
    icon: Wand2,
    className: "md:col-span-1",
    gradient: "from-blue-500/20 to-cyan-500/20",
    textGradient: "from-blue-400 to-cyan-400"
  },
  {
    title: "Smart Tax System",
    description: "3% transaction tax is automatically split: 80% to Reward Pool for creators, 20% to Marketing.",
    icon: Coins,
    className: "md:col-span-1",
    gradient: "from-yellow-500/20 to-amber-500/20",
    textGradient: "from-yellow-400 to-amber-400"
  },
  {
    title: "Watch-to-Earn",
    description: "Like videos to earn rewards. Top 3 videos share the pool, and participants get rewarded too.",
    icon: TrendingUp,
    className: "md:col-span-2",
    gradient: "from-purple-500/20 to-pink-500/20",
    textGradient: "from-purple-400 to-pink-400"
  }
];

export function FeatureShowcase() {
  return (
    <section className="py-24 px-4 container mx-auto">
      <FadeIn className="text-center mb-16">
        <h2 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-white to-zinc-400 bg-clip-text text-transparent mb-4">
          How It Works
        </h2>
        <p className="text-zinc-400 max-w-2xl mx-auto">
          A sustainable economic model designed to reward creators and curators.
        </p>
      </FadeIn>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto">
        {features.map((feature, i) => (
          <FadeIn 
            key={i} 
            delay={i * 0.1} 
            className={`${feature.className} group relative overflow-hidden rounded-3xl border border-white/10 bg-white/5 p-8 transition-all hover:bg-white/10 hover:border-white/20`}
          >
            <div className={`absolute inset-0 bg-gradient-to-br ${feature.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
            
            <div className="relative z-10 flex flex-col h-full justify-between gap-6">
              <div className={`w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center border border-white/10 group-hover:scale-110 transition-transform duration-300`}>
                <feature.icon className={`w-6 h-6 bg-gradient-to-br ${feature.textGradient} bg-clip-text text-transparent stroke-current`} />
              </div>
              
              <div>
                <h3 className={`text-xl font-bold mb-2 bg-gradient-to-br ${feature.textGradient} bg-clip-text text-transparent`}>
                  {feature.title}
                </h3>
                <p className="text-zinc-400 leading-relaxed group-hover:text-zinc-300 transition-colors">
                  {feature.description}
                </p>
              </div>
            </div>
          </FadeIn>
        ))}
      </div>
    </section>
  );
}
