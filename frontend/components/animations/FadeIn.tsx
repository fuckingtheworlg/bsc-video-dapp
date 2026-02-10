"use client";

import { motion, useInView } from "framer-motion";
import { useRef } from "react";

interface FadeInProps {
  children: React.ReactNode;
  delay?: number;
  duration?: number;
  className?: string;
  direction?: "up" | "down" | "left" | "right" | "none";
}

export function FadeIn({ 
  children, 
  delay = 0, 
  duration = 0.5, 
  className = "",
  direction = "up"
}: FadeInProps) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-10%" });

  const getVariants = () => {
    const distance = 20;
    const initial = { opacity: 0, y: 0, x: 0 };
    
    switch (direction) {
      case "up":
        initial.y = distance;
        break;
      case "down":
        initial.y = -distance;
        break;
      case "left":
        initial.x = distance;
        break;
      case "right":
        initial.x = -distance;
        break;
    }

    return {
      hidden: initial,
      visible: { 
        opacity: 1, 
        y: 0, 
        x: 0,
        transition: {
          duration,
          delay,
          ease: "easeOut" as const
        }
      }
    };
  };

  return (
    <motion.div
      ref={ref}
      initial="hidden"
      animate={isInView ? "visible" : "hidden"}
      variants={getVariants()}
      className={className}
    >
      {children}
    </motion.div>
  );
}
