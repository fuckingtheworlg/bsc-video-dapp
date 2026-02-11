"use client";

import { motion } from "framer-motion";
import { Flame, Wand2, Coins, TrendingUp, Zap, ShieldCheck } from "lucide-react";
import { FadeIn } from "./animations/FadeIn";

const features = [
  {
    title: "燃烧上传机制",
    description: "通过燃烧 50,000 SEESHOW 代币获取上传许可，有效控制内容质量并减少代币流通量，实现通缩模型。",
    icon: Flame,
    className: "md:col-span-2",
    gradient: "from-orange-500/20 to-red-500/20",
    textGradient: "from-orange-400 to-red-400",
    iconColor: "text-orange-400",
    bg: "bg-orange-500/5"
  },
  {
    title: "AI 智能创作",
    description: "集成火山引擎 Seedance AI 模型，一键生成高质量视频与封面，释放您的无限创意。",
    icon: Wand2,
    className: "md:col-span-1",
    gradient: "from-blue-500/20 to-cyan-500/20",
    textGradient: "from-blue-400 to-cyan-400",
    iconColor: "text-blue-400",
    bg: "bg-blue-500/5"
  },
  {
    title: "智能税收分红",
    description: "3% 交易税自动拆分：80% 注入奖励池回馈生态参与者，20% 用于市场推广，确保持续发展。",
    icon: Coins,
    className: "md:col-span-1",
    gradient: "from-yellow-500/20 to-amber-500/20",
    textGradient: "from-yellow-400 to-amber-400",
    iconColor: "text-yellow-400",
    bg: "bg-yellow-500/5"
  },
  {
    title: "互动赚取收益",
    description: "参与点赞即可瓜分奖池。每轮（45分钟）前三名视频创作者及所有点赞参与者均可获得代币奖励。",
    icon: TrendingUp,
    className: "md:col-span-2",
    gradient: "from-purple-500/20 to-pink-500/20",
    textGradient: "from-purple-400 to-pink-400",
    iconColor: "text-purple-400",
    bg: "bg-purple-500/5"
  }
];

export function FeatureShowcase() {
  return (
    <section className="py-32 px-4 container mx-auto relative overflow-hidden">
      {/* Abstract Background Shapes */}
      <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/3 w-[800px] h-[800px] bg-blue-500/5 rounded-full blur-3xl opacity-50 pointer-events-none" />
      <div className="absolute bottom-0 left-0 translate-y-1/2 -translate-x-1/3 w-[600px] h-[600px] bg-purple-500/5 rounded-full blur-3xl opacity-50 pointer-events-none" />

      <FadeIn className="text-center mb-20 relative z-10">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-sm text-zinc-400 backdrop-blur-sm mb-6">
          <Zap className="w-4 h-4 text-yellow-400" />
          <span>核心玩法</span>
        </div>
        <h2 className="text-4xl md:text-5xl font-bold text-white mb-6 tracking-tight">
          构建可持续的
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400 mx-2">
            去中心化经济
          </span>
        </h2>
        <p className="text-xl text-zinc-400 max-w-2xl mx-auto leading-relaxed">
          通过创新的代币经济模型，将平台收益公平地分配给每一位创作者和策展人。
        </p>
      </FadeIn>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto relative z-10">
        {features.map((feature, i) => (
          <FadeIn 
            key={i} 
            delay={i * 0.1} 
            className={`${feature.className} group relative overflow-hidden rounded-[2rem] border border-white/10 ${feature.bg} p-8 transition-all duration-500 hover:border-white/20 hover:shadow-2xl hover:shadow-blue-900/10 hover:-translate-y-1`}
          >
            {/* Hover Gradient Overlay */}
            <div className={`absolute inset-0 bg-gradient-to-br ${feature.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
            
            <div className="relative z-10 flex flex-col h-full justify-between gap-8">
              <div className="flex items-start justify-between">
                <div className="group-hover:scale-110 transition-transform duration-500">
                  <feature.icon className={`w-12 h-12 ${feature.iconColor}`} />
                </div>
                {i === 0 && (
                  <div className="px-3 py-1 rounded-full bg-orange-500/20 border border-orange-500/30 text-orange-300 text-xs font-medium">
                    通缩销毁
                  </div>
                )}
                {i === 3 && (
                  <div className="px-3 py-1 rounded-full bg-purple-500/20 border border-purple-500/30 text-purple-300 text-xs font-medium">
                    高收益
                  </div>
                )}
              </div>
              
              <div>
                <h3 className={`text-2xl font-bold mb-3 bg-gradient-to-r ${feature.textGradient} bg-clip-text text-transparent`}>
                  {feature.title}
                </h3>
                <p className="text-zinc-400 leading-relaxed group-hover:text-zinc-300 transition-colors text-lg">
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
