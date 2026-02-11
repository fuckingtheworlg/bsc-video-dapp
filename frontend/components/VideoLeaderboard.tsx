"use client";

import { motion } from "framer-motion";
import { Trophy, Crown, Medal, ThumbsUp, Play } from "lucide-react";
import { FadeIn } from "./animations/FadeIn";

interface LeaderboardItem {
  rank: number;
  title: string;
  uploader: string;
  coverGradient: string;
  likePercent: number;
  likeCount: number;
}

const mockLeaderboard: LeaderboardItem[] = [];

function RankBadge({ rank }: { rank: number }) {
  if (rank === 1) return <Crown className="w-5 h-5 text-yellow-400 drop-shadow-[0_0_6px_rgba(250,204,21,0.5)]" />;
  if (rank === 2) return <Medal className="w-5 h-5 text-zinc-300 drop-shadow-[0_0_6px_rgba(161,161,170,0.5)]" />;
  if (rank === 3) return <Medal className="w-5 h-5 text-amber-600 drop-shadow-[0_0_6px_rgba(217,119,6,0.5)]" />;
  return <span className="text-sm font-mono text-zinc-500 w-5 text-center">{rank}</span>;
}

export function VideoLeaderboard() {
  return (
    <FadeIn className="flex-1 min-w-0">
      <div className="relative group h-full">
        <div className="absolute -inset-0.5 bg-gradient-to-r from-yellow-600/20 to-orange-600/20 rounded-2xl blur opacity-0 group-hover:opacity-100 transition duration-500" />
        <div className="relative h-full rounded-2xl border border-white/10 bg-black/40 backdrop-blur-xl overflow-hidden">
          {/* Header */}
          <div className="flex items-center gap-3 px-6 py-4 border-b border-white/10">
            <Trophy className="w-5 h-5 text-yellow-400" />
            <h3 className="text-lg font-bold text-white">排行榜</h3>
            <span className="text-xs text-zinc-500 ml-auto flex items-center gap-1">
              <ThumbsUp className="w-3 h-3" />
              按点赞
            </span>
          </div>

          {/* Leaderboard List */}
          <div className="divide-y divide-white/5">
            {mockLeaderboard.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 text-zinc-500">
                <Trophy className="w-8 h-8 mb-3 opacity-30" />
                <p className="text-sm">暂无排名，等待更多作品</p>
              </div>
            )}
            {mockLeaderboard.map((item, index) => (
              <motion.div
                key={item.rank}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1, duration: 0.4 }}
                className={`px-6 py-3.5 hover:bg-white/5 transition-colors duration-200 cursor-pointer ${
                  item.rank <= 3 ? "bg-white/[0.02]" : ""
                }`}
              >
                <div className="flex items-center gap-4">
                  {/* Rank */}
                  <div className="flex-shrink-0 w-6 flex justify-center">
                    <RankBadge rank={item.rank} />
                  </div>

                  {/* Video Cover Thumbnail */}
                  <div className={`relative flex-shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br ${item.coverGradient} shadow-lg overflow-hidden group/thumb`}>
                    <div className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 group-hover/thumb:opacity-100 transition-opacity">
                      <Play className="w-4 h-4 text-white fill-white" />
                    </div>
                  </div>

                  {/* Info */}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-white truncate">{item.title}</p>
                    <p className="text-xs font-mono text-zinc-500 mt-0.5">{item.uploader}</p>
                  </div>

                  {/* Stats */}
                  <div className="flex-shrink-0 text-right">
                    <p className="text-sm font-bold text-white">{item.likePercent}%</p>
                    <p className="text-xs text-zinc-500">{item.likeCount} 赞</p>
                  </div>
                </div>

                {/* Progress bar for top 3 */}
                {item.rank <= 3 && (
                  <div className="mt-2 ml-10 h-1 bg-white/5 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${item.likePercent * 5}%` }}
                      transition={{ delay: index * 0.15 + 0.3, duration: 0.8, ease: "easeOut" }}
                      className={`h-full bg-gradient-to-r ${item.coverGradient} rounded-full`}
                    />
                  </div>
                )}
              </motion.div>
            ))}
          </div>

          {/* Footer */}
          <div className="px-6 py-3 border-t border-white/10 text-center">
            <button className="text-sm text-blue-400 hover:text-blue-300 transition-colors">
              查看完整排行榜 →
            </button>
          </div>
        </div>
      </div>
    </FadeIn>
  );
}
