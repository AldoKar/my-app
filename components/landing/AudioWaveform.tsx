"use client";

import { useEffect, useRef } from "react";

export default function AudioWaveform() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;

    const BAR_COUNT = 40;
    const phases = Array.from({ length: BAR_COUNT }, () => Math.random() * Math.PI * 2);
    const speeds = Array.from({ length: BAR_COUNT }, () => 0.02 + Math.random() * 0.04);
    const colors = ["#facc15", "#ef4444", "#06b6d4", "#a855f7"];

    const animate = () => {
      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);

      const barWidth = w / BAR_COUNT;
      const gap = 2;

      for (let i = 0; i < BAR_COUNT; i++) {
        phases[i] += speeds[i];
        const amplitude = (Math.sin(phases[i]) * 0.5 + 0.5) * (h * 0.7) + h * 0.1;
        const x = i * barWidth + gap;
        const barW = barWidth - gap * 2;
        const y = (h - amplitude) / 2;

        const color = colors[i % colors.length];
        ctx.fillStyle = color;
        ctx.globalAlpha = 0.7;
        ctx.beginPath();
        ctx.roundRect(x, y, barW, amplitude, 2);
        ctx.fill();
      }

      ctx.globalAlpha = 1;
      animRef.current = requestAnimationFrame(animate);
    };

    animate();
    return () => cancelAnimationFrame(animRef.current);
  }, []);

  return (
    <canvas
      ref={canvasRef}
      width={320}
      height={60}
      className="w-full max-w-xs h-12 opacity-60"
    />
  );
}
