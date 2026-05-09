"use client";

import { useEffect, useState, useRef } from "react";
import { Mic, Video, Loader2 } from "lucide-react";

// Las emociones que puede devolver tu Backend FastAPI
type Emotion = "happy" | "angry" | "sad" | "confused" | "neutral" | "energetic" | "tense" | "calm";

const emotionColors: Record<Emotion, string> = {
  happy: "#facc15",
  angry: "#ef4444",
  sad: "#06b6d4",
  confused: "#a855f7",
  neutral: "#94a3b8",
  energetic: "#f97316",
  tense: "#f43f5e",
  calm: "#3b82f6",
};

const emotionGlows: Record<Emotion, string> = {
  happy: "drop-shadow(0 0 20px rgba(250,204,21,0.5))",
  angry: "drop-shadow(0 0 20px rgba(239,68,68,0.5))",
  sad: "drop-shadow(0 0 20px rgba(6,182,212,0.5))",
  confused: "drop-shadow(0 0 20px rgba(168,85,247,0.5))",
  neutral: "drop-shadow(0 0 20px rgba(148,163,184,0.5))",
  energetic: "drop-shadow(0 0 20px rgba(249,115,22,0.5))",
  tense: "drop-shadow(0 0 20px rgba(244,63,94,0.5))",
  calm: "drop-shadow(0 0 20px rgba(59,130,246,0.5))",
};

function getMouth(emotion: Emotion) {
  if (emotion === "happy" || emotion === "energetic") {
    return <path d="M60 95 Q80 115 100 95" stroke={emotionColors[emotion]} strokeWidth="3" fill="none" strokeLinecap="round" />;
  }
  if (emotion === "angry" || emotion === "tense") {
    return <path d="M60 105 Q80 90 100 105" stroke={emotionColors[emotion]} strokeWidth="3" fill="none" strokeLinecap="round" />;
  }
  if (emotion === "sad") {
    return <path d="M62 105 Q80 95 98 105" stroke={emotionColors[emotion]} strokeWidth="3" fill="none" strokeLinecap="round" />;
  }
  if (emotion === "confused") {
    return <path d="M60 100 L72 96 L84 103 L96 97" stroke={emotionColors[emotion]} strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" />;
  }
  // neutral / calm
  return <path d="M60 100 L100 100" stroke={emotionColors[emotion]} strokeWidth="3" fill="none" strokeLinecap="round" />;
}

function getEyebrows(emotion: Emotion) {
  const c = emotionColors[emotion];
  if (emotion === "happy" || emotion === "energetic") {
    return (
      <>
        <path d="M52 60 Q58 55 66 58" stroke={c} strokeWidth="2.5" fill="none" strokeLinecap="round" />
        <path d="M94 58 Q102 55 108 60" stroke={c} strokeWidth="2.5" fill="none" strokeLinecap="round" />
      </>
    );
  }
  if (emotion === "angry" || emotion === "tense") {
    return (
      <>
        <path d="M52 62 L68 55" stroke={c} strokeWidth="3" fill="none" strokeLinecap="round" />
        <path d="M92 55 L108 62" stroke={c} strokeWidth="3" fill="none" strokeLinecap="round" />
      </>
    );
  }
  if (emotion === "sad") {
    return (
      <>
        <path d="M52 56 Q60 62 68 58" stroke={c} strokeWidth="2.5" fill="none" strokeLinecap="round" />
        <path d="M92 58 Q100 62 108 56" stroke={c} strokeWidth="2.5" fill="none" strokeLinecap="round" />
      </>
    );
  }
  // neutral, calm, confused
  return (
    <>
      <path d="M52 58 L68 58" stroke={c} strokeWidth="2.5" fill="none" strokeLinecap="round" />
      <path d="M92 62 L108 55" stroke={c} strokeWidth="2.5" fill="none" strokeLinecap="round" />
    </>
  );
}

export default function RobotFace() {
  const [currentEmotion, setCurrentEmotion] = useState<Emotion>("neutral");
  const [isRecording, setIsRecording] = useState(false);
  const [statusText, setStatusText] = useState("Inactivo");
  const [botMessage, setBotMessage] = useState("");
  
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Inicializar cámara y audio al montar
  useEffect(() => {
    navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      .then(stream => {
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
        setStatusText("Cámara lista. Presiona para escanear.");
      })
      .catch(err => {
        console.error("Error media:", err);
        setStatusText("Error: No hay acceso a cámara/micro.");
      });

    return () => {
      // Limpiar stream al desmontar
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
      }
    };
  }, []);

  const handleScan = () => {
    if (!streamRef.current || !videoRef.current) return;
    setIsRecording(true);
    setStatusText("Analizando tu energía (5s)...");

    // 1. Capturar foto
    const canvas = document.createElement("canvas");
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    canvas.getContext("2d")?.drawImage(videoRef.current, 0, 0);
    const imageB64Clean = canvas.toDataURL("image/jpeg", 0.5).split(",")[1];

    // 2. Grabar audio por 5 seg
    const mediaRecorder = new MediaRecorder(streamRef.current);
    const audioChunks: BlobPart[] = [];
    
    mediaRecorder.ondataavailable = e => audioChunks.push(e.data);
    mediaRecorder.onstop = () => {
      setStatusText("Procesando con IA...");
      const reader = new FileReader();
      reader.readAsDataURL(new Blob(audioChunks, { type: "audio/webm" }));
      reader.onloadend = () => {
        const audioB64Clean = (reader.result as string).split(",")[1];
        
        // 3. Conectar a FastAPI
        const ws = new WebSocket("ws://127.0.0.1:8000/ws/chat");
        ws.onopen = () => {
          ws.send(JSON.stringify({
            message: "Analiza mi emoción en base a esta foto y audio.",
            image_b64: imageB64Clean,
            audio_b64: audioB64Clean
          }));
        };

        ws.onmessage = (event) => {
          const response = JSON.parse(event.data);
          // FastAPI response: { emotion, servo_angle, bot_message, song_recommendation, screen_color }
          if (response.emotion && emotionColors[response.emotion as Emotion]) {
            setCurrentEmotion(response.emotion as Emotion);
          } else {
            setCurrentEmotion("confused");
          }
          if (response.bot_message) setBotMessage(response.bot_message);
          
          setStatusText(`Conectado! Canción sugerida: ${response.song_recommendation || ""}`);
          setIsRecording(false);
          ws.close();
        };

        ws.onerror = () => {
          setStatusText("Error conectando a FastAPI. ¿Está corriendo uvicorn?");
          setIsRecording(false);
        };
      };
    };

    mediaRecorder.start();
    setTimeout(() => {
      mediaRecorder.stop();
    }, 5000);
  };

  const color = emotionColors[currentEmotion];

  return (
    <div className="flex flex-col items-center justify-center space-y-6">
      
      {/* Visualización de cámara Oculta/Pequeña para que funcione el canvas */}
      <video 
        ref={videoRef} 
        autoPlay 
        muted 
        playsInline
        className="w-32 h-24 rounded-lg border-2 border-zinc-700 bg-black object-cover shadow-lg"
      />

      <div className="relative flex items-center justify-center">
        {/* Glow behind the face */}
        <div
          className="absolute w-48 h-48 rounded-full animate-pulse-glow transition-colors duration-700"
          style={{ background: color, opacity: 0.2, filter: "blur(60px)" }}
        />

        <svg
          viewBox="0 0 160 140"
          className="w-56 h-56 md:w-72 md:h-72 transition-all duration-700"
          style={{ filter: emotionGlows[currentEmotion] }}
        >
          {/* Head outline */}
          <rect x="20" y="15" width="120" height="110" rx="24" fill="none" stroke={color} strokeWidth="2.5" className="transition-all duration-700" />
          {/* Screen inner area */}
          <rect x="30" y="25" width="100" height="90" rx="16" fill="rgba(15,23,42,0.8)" stroke={color} strokeWidth="1" opacity="0.5" className="transition-all duration-700" />
          {/* Scan line effect */}
          <rect x="30" y="25" width="100" height="4" rx="2" fill={color} opacity="0.15" className="animate-scan-line" />

          {/* Eyes */}
          <g className={isRecording ? "animate-pulse" : "animate-blink"} style={{ transformOrigin: "60px 75px" }}>
            <ellipse cx="60" cy="75" rx="8" ry="9" fill={color} className="transition-all duration-700" />
            <ellipse cx="60" cy="73" rx="3" ry="3" fill="#0b1120" />
          </g>
          <g className={isRecording ? "animate-pulse" : "animate-blink"} style={{ transformOrigin: "100px 75px", animationDelay: "0.3s" }}>
            <ellipse cx="100" cy="75" rx="8" ry="9" fill={color} className="transition-all duration-700" />
            <ellipse cx="100" cy="73" rx="3" ry="3" fill="#0b1120" />
          </g>

          {/* Eyebrows & Mouth */}
          <g className="transition-all duration-700">{getEyebrows(currentEmotion)}</g>
          <g className="transition-all duration-700">{getMouth(currentEmotion)}</g>

          {/* Antenna */}
          <line x1="80" y1="15" x2="80" y2="2" stroke={color} strokeWidth="2" className="transition-all duration-700" />
          <circle cx="80" cy="2" r="4" fill={color} className="transition-all duration-700 animate-pulse" />
        </svg>

        {/* Emotion label */}
        <div
          className="absolute -bottom-2 px-3 py-1 rounded-full text-xs font-semibold tracking-widest uppercase transition-all duration-700"
          style={{ background: \`\${color}22\`, color: color, border: \`1px solid \${color}44\` }}
        >
          {currentEmotion}
        </div>
      </div>

      {/* Controles */}
      <div className="flex flex-col items-center max-w-sm text-center">
        <button 
          onClick={handleScan}
          disabled={isRecording}
          className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 text-white font-medium px-6 py-3 rounded-full flex items-center gap-2 transition-all active:scale-95 shadow-md mb-3"
        >
          {isRecording ? <Loader2 className="w-5 h-5 animate-spin" /> : <Mic className="w-5 h-5" />}
          {isRecording ? "Grabando vibra (5s)..." : "Analizar mi Energía"}
        </button>
        <p className="text-sm font-medium text-zinc-500">{statusText}</p>
        
        {botMessage && (
          <div className="mt-4 p-4 bg-zinc-100 rounded-xl text-zinc-800 text-sm italic shadow-sm border border-zinc-200">
            "{botMessage}"
          </div>
        )}
      </div>

    </div>
  );
}
