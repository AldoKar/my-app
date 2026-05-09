"use client";

import { useEffect, useState } from "react";

type Emotion = "happy" | "angry" | "sad" | "confused";

const emotions: Emotion[] = ["happy", "angry", "sad", "confused"];

const emotionColors: Record<Emotion, string> = {
  happy: "#facc15",
  angry: "#ef4444",
  sad: "#06b6d4",
  confused: "#a855f7",
};

const emotionGlows: Record<Emotion, string> = {
  happy: "drop-shadow(0 0 20px rgba(250,204,21,0.5))",
  angry: "drop-shadow(0 0 20px rgba(239,68,68,0.5))",
  sad: "drop-shadow(0 0 20px rgba(6,182,212,0.5))",
  confused: "drop-shadow(0 0 20px rgba(168,85,247,0.5))",
};

function getMouth(emotion: Emotion) {
  switch (emotion) {
    case "happy":
      return (
        <path
          d="M60 95 Q80 115 100 95"
          stroke={emotionColors.happy}
          strokeWidth="3"
          fill="none"
          strokeLinecap="round"
        />
      );
    case "angry":
      return (
        <path
          d="M60 105 Q80 90 100 105"
          stroke={emotionColors.angry}
          strokeWidth="3"
          fill="none"
          strokeLinecap="round"
        />
      );
    case "sad":
      return (
        <path
          d="M62 105 Q80 95 98 105"
          stroke={emotionColors.sad}
          strokeWidth="3"
          fill="none"
          strokeLinecap="round"
        />
      );
    case "confused":
      return (
        <path
          d="M60 100 L72 96 L84 103 L96 97"
          stroke={emotionColors.confused}
          strokeWidth="3"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      );
  }
}

function getEyebrows(emotion: Emotion) {
  switch (emotion) {
    case "happy":
      return (
        <>
          <path d="M52 60 Q58 55 66 58" stroke={emotionColors.happy} strokeWidth="2.5" fill="none" strokeLinecap="round" />
          <path d="M94 58 Q102 55 108 60" stroke={emotionColors.happy} strokeWidth="2.5" fill="none" strokeLinecap="round" />
        </>
      );
    case "angry":
      return (
        <>
          <path d="M52 62 L68 55" stroke={emotionColors.angry} strokeWidth="3" fill="none" strokeLinecap="round" />
          <path d="M92 55 L108 62" stroke={emotionColors.angry} strokeWidth="3" fill="none" strokeLinecap="round" />
        </>
      );
    case "sad":
      return (
        <>
          <path d="M52 56 Q60 62 68 58" stroke={emotionColors.sad} strokeWidth="2.5" fill="none" strokeLinecap="round" />
          <path d="M92 58 Q100 62 108 56" stroke={emotionColors.sad} strokeWidth="2.5" fill="none" strokeLinecap="round" />
        </>
      );
    case "confused":
      return (
        <>
          <path d="M52 58 L68 58" stroke={emotionColors.confused} strokeWidth="2.5" fill="none" strokeLinecap="round" />
          <path d="M92 62 L108 55" stroke={emotionColors.confused} strokeWidth="2.5" fill="none" strokeLinecap="round" />
        </>
      );
  }
}

export default function RobotFace() {
  const [emotionIndex, setEmotionIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setEmotionIndex((prev) => (prev + 1) % emotions.length);
    }, 2500);
    return () => clearInterval(interval);
  }, []);

  const emotion = emotions[emotionIndex];
  const color = emotionColors[emotion];

  return (
    <div className="relative flex items-center justify-center">
      {/* Glow behind the face */}
      <div
        className="absolute w-48 h-48 rounded-full animate-pulse-glow transition-colors duration-700"
        style={{ background: color, opacity: 0.2, filter: "blur(60px)" }}
      />

      <svg
        viewBox="0 0 160 140"
        className="w-56 h-56 md:w-72 md:h-72 transition-all duration-700"
        style={{ filter: emotionGlows[emotion] }}
      >
        {/* Head outline */}
        <rect
          x="20"
          y="15"
          width="120"
          height="110"
          rx="24"
          fill="none"
          stroke={color}
          strokeWidth="2.5"
          className="transition-all duration-700"
        />

        {/* Screen inner area */}
        <rect
          x="30"
          y="25"
          width="100"
          height="90"
          rx="16"
          fill="rgba(15,23,42,0.8)"
          stroke={color}
          strokeWidth="1"
          opacity="0.5"
          className="transition-all duration-700"
        />

        {/* Scan line effect */}
        <rect
          x="30"
          y="25"
          width="100"
          height="4"
          rx="2"
          fill={color}
          opacity="0.15"
          className="animate-scan-line"
        />

        {/* Eyes */}
        <g className="animate-blink" style={{ transformOrigin: "60px 75px" }}>
          <ellipse cx="60" cy="75" rx="8" ry="9" fill={color} className="transition-all duration-700" />
          <ellipse cx="60" cy="73" rx="3" ry="3" fill="#0b1120" />
        </g>
        <g className="animate-blink" style={{ transformOrigin: "100px 75px", animationDelay: "0.3s" }}>
          <ellipse cx="100" cy="75" rx="8" ry="9" fill={color} className="transition-all duration-700" />
          <ellipse cx="100" cy="73" rx="3" ry="3" fill="#0b1120" />
        </g>

        {/* Eyebrows */}
        <g className="transition-all duration-700">
          {getEyebrows(emotion)}
        </g>

        {/* Mouth */}
        <g className="transition-all duration-700">
          {getMouth(emotion)}
        </g>

        {/* Antenna */}
        <line x1="80" y1="15" x2="80" y2="2" stroke={color} strokeWidth="2" className="transition-all duration-700" />
        <circle cx="80" cy="2" r="4" fill={color} className="transition-all duration-700 animate-pulse" />
      </svg>

      {/* Emotion label */}
      <div
        className="absolute -bottom-2 px-3 py-1 rounded-full text-xs font-semibold tracking-widest uppercase transition-all duration-700"
        style={{
          background: `${color}22`,
          color: color,
          border: `1px solid ${color}44`,
        }}
      >
        {emotion === "happy" && "😊 Feliz"}
        {emotion === "angry" && "😡 Enojado"}
        {emotion === "sad" && "😢 Triste"}
        {emotion === "confused" && "😵 Confuso"}
      </div>
    </div>
  );
}
