"use client";

import Image from "next/image";

export function SeeshowLogo({ size = 28, className = "" }: { size?: number; className?: string }) {
  return (
    <Image
      src="/logo.jpg"
      alt="SEESHOW"
      width={size}
      height={size}
      className={`rounded-full object-cover ${className}`}
    />
  );
}
