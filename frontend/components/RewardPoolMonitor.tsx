"use client";

import { useRoundInfo } from "@/hooks/useRoundInfo";
import { useTokenSymbol } from "@/hooks/useTokenSymbol";
import { FadeIn } from "./animations/FadeIn";
import { Coins, Clock, Users, Trophy } from "lucide-react";
import { useEffect, useState } from "react";
import { formatEther } from "viem";

export function RewardPoolMonitor() {
  const { roundData, currentRoundId } = useRoundInfo();
  const tokenSymbol = useTokenSymbol();
  const [timeLeft, setTimeLeft] = useState<string>("--:--");
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!roundData) return;

    const updateTimer = () => {
      const now = Math.floor(Date.now() / 1000);
      const end = Number(roundData.endTime);
      const remaining = Math.max(0, end - now);
      
      const m = Math.floor(remaining / 60);
      const s = remaining % 60;
      setTimeLeft(`${m}:${s.toString().padStart(2, "0")}`);

      // Calculate progress
      const start = Number(roundData.startTime);
      const totalDuration = end - start;
      const elapsed = now - start;
      const newProgress = totalDuration > 0 
        ? Math.min(100, Math.max(0, (elapsed / totalDuration) * 100))
        : 0;
      
      setProgress(newProgress);
    };

    updateTimer(); // Initial update
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [roundData]);

  const poolAmount = roundData ? Number(formatEther(roundData.rewardPool)).toFixed(0) : "0";
  const participantCount = roundData ? Number(roundData.participantCount) : 0;

  return (
    <FadeIn className="w-full max-w-4xl mx-auto my-12">
      <div className="relative group">
        <div className="absolute -inset-1 bg-gradient-to-r from-purple-600 to-blue-600 rounded-2xl blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200" />
        <div className="relative p-6 bg-black/50 ring-1 ring-white/10 rounded-2xl backdrop-blur-xl">
          <div className="flex flex-col md:flex-row items-center justify-between gap-8">
            
            {/* Pool Amount */}
            <div className="flex items-center gap-4">
              <div className="p-4 rounded-2xl bg-gradient-to-br from-yellow-500/20 to-orange-500/20 border border-yellow-500/20 shadow-[0_0_15px_-3px_rgba(234,179,8,0.3)]">
                <Coins className="w-8 h-8 text-yellow-400" />
              </div>
              <div>
                <h3 className="text-zinc-400 text-sm font-medium mb-1">当前轮次奖励池</h3>
                <div className="text-4xl font-bold text-white tracking-tight flex items-baseline gap-2">
                  {poolAmount}
                  <span className="text-lg text-zinc-500 font-normal">{tokenSymbol}</span>
                </div>
              </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-x-12 gap-y-4 w-full md:w-auto">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-zinc-400 text-sm">
                  <Clock className="w-4 h-4 text-blue-400" />
                  <span>剩余时间</span>
                </div>
                <p className="text-2xl font-mono font-medium text-white">{timeLeft}</p>
              </div>

              <div className="space-y-1">
                <div className="flex items-center gap-2 text-zinc-400 text-sm">
                  <Users className="w-4 h-4 text-purple-400" />
                  <span>参与人数</span>
                </div>
                <p className="text-2xl font-mono font-medium text-white">{participantCount}</p>
              </div>

              <div className="space-y-1 col-span-2 border-t border-white/10 pt-4 mt-2">
                <div className="flex items-center gap-2 text-zinc-500 text-xs mb-1">
                  <Trophy className="w-3 h-3" />
                  <span>当前轮次 #{currentRoundId?.toString()}</span>
                </div>
                <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-1000"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </FadeIn>
  );
}
