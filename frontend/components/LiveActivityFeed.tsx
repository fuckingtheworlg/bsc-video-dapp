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

const mockActivities: ActivityItem[] = [
  { id: 1, type: "like", address: "0x7c84...3df7", title: "giao!", timeAgo: "1分钟前" },
  { id: 2, type: "upload", address: "0xed0b...7424", title: "giao!", timeAgo: "2分钟前" },
  { id: 3, type: "like", address: "0xa3f2...9b12", title: "华山论剑", timeAgo: "3分钟前" },
  { id: 4, type: "like", address: "0x2d9f...e531", title: "giao!", timeAgo: "4分钟前" },
  { id: 5, type: "upload", address: "0x5c18...07e0", title: "华山论剑", timeAgo: "5分钟前" },
  { id: 6, type: "like", address: "0xf1b3...a092", title: "你告诉我2025", timeAgo: "7分钟前" },
  { id: 7, type: "like", address: "0x8e71...c4a8", title: "CZ开着小汽车", timeAgo: "9分钟前" },
  { id: 8, type: "upload", address: "0x5201...d00e", title: "你告诉我2025", timeAgo: "12分钟前" },
  { id: 9, type: "like", address: "0x3b22...f8c1", title: "华山论剑", timeAgo: "15分钟前" },
  { id: 10, type: "like", address: "0x91d4...2a67", title: "giao!", timeAgo: "18分钟前" },
];

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
