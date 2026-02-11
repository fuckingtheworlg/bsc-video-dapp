"use client";

import { SeeshowLogo } from "@/components/SeeshowLogo";
import { Copy, Check } from "lucide-react";
import { useState } from "react";

export function Footer() {
  const [copied, setCopied] = useState(false);
  const displayCA = process.env.NEXT_PUBLIC_TOKEN_CA || "";
  const contractAddress = displayCA ? displayCA : "TBA";

  const handleCopy = () => {
    if (contractAddress === "TBA") return;
    navigator.clipboard.writeText(contractAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <footer className="relative z-10 border-t border-white/10 bg-black/60 backdrop-blur-xl">
      <div className="container mx-auto max-w-6xl px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-start">
          {/* Brand */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <SeeshowLogo size={32} className="text-white" />
              <span className="text-xl font-bold text-white">SEESHOW</span>
            </div>
            <p className="text-sm text-zinc-500 leading-relaxed max-w-xs">
              基于 BSC 的去中心化视频平台，通过 AI 创作与代币经济实现内容价值最大化。
            </p>
          </div>

          {/* CA */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider">合约地址 (CA)</h4>
            <div className="flex items-center gap-2">
              <div className="flex-1 px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 font-mono text-sm text-zinc-400 truncate">
                {contractAddress === "TBA" ? (
                  <span className="text-yellow-400/80 animate-pulse">即将公布...</span>
                ) : (
                  contractAddress
                )}
              </div>
              <button
                onClick={handleCopy}
                disabled={contractAddress === "TBA"}
                className="p-2.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              >
                {copied ? (
                  <Check className="w-4 h-4 text-green-400" />
                ) : (
                  <Copy className="w-4 h-4 text-zinc-400" />
                )}
              </button>
            </div>
          </div>

          {/* Social Links */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider">社交媒体</h4>
            <div className="flex flex-col gap-2">
              <a
                href="https://x.com/SEESHOWBNB/articles"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-3 px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all duration-300 group"
              >
                <svg className="w-5 h-5 text-zinc-400 group-hover:text-white transition-colors" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                </svg>
                <span className="text-sm text-zinc-400 group-hover:text-white transition-colors">@SEESHOWBNB</span>
              </a>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-10 pt-6 border-t border-white/5 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-xs text-zinc-600">© 2026 SEESHOW. All rights reserved.</p>
          <p className="text-xs text-zinc-600">Built on BNB Smart Chain</p>
        </div>
      </div>
    </footer>
  );
}
