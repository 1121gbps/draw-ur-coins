// src/components/ScrollingCoins.tsx
"use client";

import Image from "next/image";
import { useEffect, useState, useMemo } from "react";

type Coin = { name: string; src: string };

type Props = {
  height?: number;
  gap?: number;
  durationSec?: number;
  reverse?: boolean;
  rows?: 1 | 2;
};

export default function ScrollingCoins({
  height = 72,
  gap = 24,
  durationSec = 30,
  reverse = false,
  rows = 1,
}: Props) {
  const [coins, setCoins] = useState<Coin[]>([]);

  useEffect(() => {
    fetch("/api/coins")
      .then((r) => r.json())
      .then((data: Coin[]) => setCoins(data))
      .catch(() => setCoins([]));
  }, []);

  const doubled = useMemo(() => [...coins, ...coins], [coins]);

  if (!coins.length) return null;

  const Strip = ({ offset = 0 }: { offset?: number }) => (
    <div
      className="flex items-center"
      style={{
        height,
        gap,
        width: "200%",
      }}
    >
      {doubled.map((c, i) => (
        <div
          key={`${c.name}-${i}-${offset}`}
          className="shrink-0 flex items-center justify-center rounded-full/25"
          style={{ height, width: height, opacity: 0.9 }}
          title={c.name}
        >
          <Image
            src={c.src}
            alt={c.name}
            width={height}
            height={height}
            sizes={`${height}px`}
            priority={false}
            loading="lazy"
            quality={85}
            className="object-contain rounded-full"
          />
        </div>
      ))}
    </div>
  );

  return (
    <div className="w-full overflow-hidden pointer-events-none select-none">
      {/* Row 1 */}
      <div
        className="coin-marquee flex"
        style={{
          animationDuration: `${durationSec}s`,
          animationDirection: reverse ? "reverse" : "normal",
        }}
      >
        <Strip />
      </div>

      {/* Optional Row 2 with slight variations for a parallax feel */}
      {rows === 2 && (
        <div
          className="coin-marquee mt-3 flex"
          style={{
            animationDuration: `${durationSec * 1.2}s`,
            animationDirection: reverse ? "normal" : "reverse",
          }}
        >
          <Strip offset={1} />
        </div>
      )}
    </div>
  );
}
