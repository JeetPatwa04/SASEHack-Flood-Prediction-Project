"use client";
import { useEffect, useState } from "react";

type Bubble = {
  id: number; size: number; left: number; duration: number; delay: number; drift: number; opacity: number;
};

export default function FloatingBubbles({ count = 18 }: { count?: number }) {
  const [bubbles, setBubbles] = useState<Bubble[]>([]);

  useEffect(() => {
    setBubbles(
      Array.from({ length: count }, (_, i) => ({
        id: i,
        size: 10 + Math.random() * 34,
        left: Math.random() * 100,
        duration: 14 + Math.random() * 16,
        delay: Math.random() * -20,
        drift: (Math.random() - 0.5) * 60,
        opacity: 0.15 + Math.random() * 0.35,
      }))
    );
  }, [count]);

  return (
    <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
      {bubbles.map((b) => (
        <span
          key={b.id}
          className="absolute rounded-full bg-white animate-bubble-rise"
          style={{
            width: b.size, height: b.size, left: `${b.left}%`, bottom: -60, opacity: b.opacity,
            animationDuration: `${b.duration}s`, animationDelay: `${b.delay}s`,
            // @ts-expect-error custom property used in keyframes
            "--drift": `${b.drift}px`,
          }}
        />
      ))}
    </div>
  );
}