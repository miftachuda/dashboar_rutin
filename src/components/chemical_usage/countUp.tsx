import { useEffect, useState } from "react";

interface CountUpProps {
  value: number | string;
  duration?: number;
  decimals?: number;
}

export function CountUp({ value, duration = 1, decimals = 2 }: CountUpProps) {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    const target = Number(value || 0);
    if (!Number.isFinite(target)) {
      setDisplayValue(0);
      return;
    }

    let frameId = 0;
    const start = performance.now();
    const from = displayValue;
    const durationMs = duration * 1000;

    const tick = (time: number) => {
      const progress = Math.min((time - start) / durationMs, 1);
      setDisplayValue(from + (target - from) * progress);

      if (progress < 1) frameId = requestAnimationFrame(tick);
    };

    frameId = requestAnimationFrame(tick);

    return () => cancelAnimationFrame(frameId);
  }, [value, duration]);

  return <span>{displayValue.toFixed(decimals)}</span>;
}
