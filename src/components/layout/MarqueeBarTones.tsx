// MarqueeBarTones.tsx
import React, { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { gsap } from "gsap";

const MarqueeBarTones: React.FC = () => {
  const barRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (barRef.current) {
      gsap.fromTo(
        barRef.current,
        { opacity: 0, y: -12 },
        { opacity: 1, y: 0, duration: 0.7, ease: "power2.out", delay: 0.15 }
      );
    }
  }, []);

  const itemClass =
    "mx-8 whitespace-nowrap font-extrabold tracking-wider leading-none";

  return (
    <div ref={barRef} className="w-full bg-[#e53e30]">
      <hr className="border-t border-[#fbfbfb] opacity-80" />
      <div
        className="h-12 overflow-hidden relative flex items-center justify-center"
        style={{ fontFamily: "Montserrat, system-ui, sans-serif", color: "#fbfbfb" }}
      >
        <motion.div
          className="flex items-center"
          animate={{ x: ["0%", "-50%"] }}
          transition={{ duration: 40, ease: "linear", repeat: Infinity }}
        >
          {Array.from({ length: 24 }).map((_, i) => (
            <span
              key={`m1-${i}`}
              className={itemClass}
              style={{ transform: i % 2 ? "rotate(0.5deg)" : "rotate(-0.5deg)" }}
            >
              FOR THE WIN
            </span>
          ))}
          {Array.from({ length: 24 }).map((_, i) => (
            <span
              key={`m2-${i}`}
              className={itemClass}
              style={{ transform: i % 2 ? "rotate(0.5deg)" : "rotate(-0.5deg)" }}
            >
              FOR THE WIN
            </span>
          ))}
        </motion.div>
      </div>
      <hr className="border-t border-[#fbfbfb] opacity-80" />
    </div>
  );
};

export default MarqueeBarTones;
