"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Activity, Upload, Heart, Clock } from "lucide-react";
import { FadeIn } from "./animations/FadeIn";

interface ActivityItem {
  id: number;
  type: "upload" | "like";
  address: string;
  title: string;
  timeAgo: string;
}

const mockActivities: ActivityItem[] = [];

export function LiveActivityFeed() {
  return (
    <FadeIn className="flex-1 min-w-0">
      <div className="relative group h-full">
        <div className="absolute -inset-0.5 bg-gradient-to-r from-green-600/20 to-emerald-600/20 rounded-2xl blur opacity-0 group-hover:opacity-100 transition duration-500" />
        <div className="relative h-full rounded-2xl border border-white/10 bg-black/40 backdrop-blur-xl overflow-hidden">
          {/* Header */}
          <div className="flex items-center gap-3 px-6 py-4 border-b border-white/10">
            <div className="relative">
              <Activity className="w-5 h-5 text-green-400" />
              <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-green-400 rounded-full animate-pulse" />
            </div>
            <h3 className="text-lg font-bold text-white">实时动态</h3>
            <span className="text-xs text-zinc-500 ml-auto">LIVE</span>
          </div>

          {/* Activity List */}
          <div className="divide-y divide-white/5 max-h-[420px] overflow-y-auto scrollbar-hide">
            {mockActivities.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 text-zinc-500">
                <Activity className="w-8 h-8 mb-3 opacity-30" />
                <p className="text-sm">暂无动态，等待第一位创作者</p>
              </div>
            )}
            {mockActivities.map((item, index) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.08, duration: 0.4 }}
                className="px-6 py-4 hover:bg-white/5 transition-colors duration-200 cursor-default"
              >
                <div className="flex items-start gap-3">
                  <div className={`mt-0.5 p-1.5 rounded-lg ${item.type === "upload" ? "bg-blue-500/20" : "bg-pink-500/20"}`}>
                    {item.type === "upload" ? (
                      <Upload className="w-3.5 h-3.5 text-blue-400" />
                    ) : (
                      <Heart className="w-3.5 h-3.5 text-pink-400" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-zinc-300 leading-relaxed">
                      <span className="font-mono text-blue-400 text-xs">{item.address}</span>
                      {" "}
                      <span className="text-zinc-500">
                        {item.type === "upload" ? "提交了新作品" : "点赞了"}
                      </span>
                      {" "}
                      <span className="text-white font-medium">&ldquo;{item.title}&rdquo;</span>
                    </p>
                    <div className="flex items-center gap-1 mt-1.5 text-zinc-600 text-xs">
                      <Clock className="w-3 h-3" />
                      <span>{item.timeAgo}</span>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </FadeIn>
  );
}
