"use client";

import { useEffect, useState } from "react";

interface Meteor {
  id: number;
  top: number;
  left: number;
  delay: number;
  duration: number;
  size: number;
}

export function MeteorShower() {
  const [meteors, setMeteors] = useState<Meteor[]>([]);

  useEffect(() => {
    // Respect prefers-reduced-motion
    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (motionQuery.matches) return;

    // Fewer meteors on mobile for performance
    const isMobile = window.innerWidth < 768;
    const count = isMobile ? 6 : 12;
    const items: Meteor[] = Array.from({ length: count }, (_, i) => ({
      id: i,
      top: Math.random() * 60 - 10,
      left: Math.random() * 100,
      delay: Math.random() * 8,
      duration: 1.5 + Math.random() * 2,
      size: 1 + Math.random() * 2,
    }));
    setMeteors(items);
  }, []);

  if (meteors.length === 0) return null;

  return (
    <div className="fixed inset-0 -z-40 overflow-hidden pointer-events-none">
      {meteors.map((m) => (
        <div
          key={m.id}
          className="absolute animate-meteor will-change-transform"
          style={{
            top: `${m.top}%`,
            left: `${m.left}%`,
            animationDelay: `${m.delay}s`,
            animationDuration: `${m.duration}s`,
          }}
        >
          <div
            className="relative"
            style={{
              width: `${m.size}px`,
              height: `${m.size}px`,
            }}
          >
            {/* Meteor head */}
            <div
              className="absolute rounded-full bg-white shadow-[0_0_4px_1px_rgba(255,255,255,0.6)]"
              style={{ width: `${m.size}px`, height: `${m.size}px` }}
            />
            {/* Meteor tail */}
            <div
              className="absolute top-0 left-0 origin-top-left -rotate-45"
              style={{
                width: `${60 + m.size * 20}px`,
                height: `${m.size * 0.5}px`,
                background: `linear-gradient(to right, rgba(255,255,255,0.6), transparent)`,
                borderRadius: "9999px",
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
