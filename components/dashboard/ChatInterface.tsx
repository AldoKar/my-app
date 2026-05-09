"use client";

import { useRef, useEffect, useState } from "react";
import { Bot, User, Mic, Loader2, Video } from "lucide-react";

interface ChatInterfaceProps {
  messages: { role: string; text: string }[];
  onRecord: (videoB64: string, audioB64: string) => void;
  isProcessing: boolean;
}

export default function ChatInterface({
  messages,
  onRecord,
  isProcessing,
}: ChatInterfaceProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [status, setStatus] = useState("Online");
  const [countdown, setCountdown] = useState(0);
  const streamRef = useRef<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Solicitar permisos de cámara/micrófono al cargar
  useEffect(() => {
    navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      .then(stream => {
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      })
      .catch(err => {
        console.error("Error accessing media devices.", err);
        setStatus("Sin camara/microfono");
      });
  }, []);

  // Auto-scroll al último mensaje
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleRecord = () => {
    if (isRecording || isProcessing || !streamRef.current) return;

    setIsRecording(true);
    setCountdown(5);
    setStatus("Grabando...");

    // Countdown visual
    const countdownInterval = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(countdownInterval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    // Grabar video (incluye audio)
    const mediaRecorder = new MediaRecorder(streamRef.current, { mimeType: "video/webm" });
    const videoChunks: BlobPart[] = [];

    // Grabar audio por separado para ACRCloud
    const audioStream = new MediaStream(streamRef.current.getAudioTracks());
    const audioRecorder = new MediaRecorder(audioStream, { mimeType: "audio/webm" });
    const audioChunks: BlobPart[] = [];

    mediaRecorder.ondataavailable = e => {
      if (e.data.size > 0) videoChunks.push(e.data);
    };
    audioRecorder.ondataavailable = e => {
      if (e.data.size > 0) audioChunks.push(e.data);
    };

    mediaRecorder.onstop = () => {
      setStatus("Analizando...");

      // Convertir video a Base64
      const videoReader = new FileReader();
      videoReader.readAsDataURL(new Blob(videoChunks, { type: "video/webm" }));
      videoReader.onloadend = () => {
        const videoB64 = (videoReader.result as string).split(",")[1];

        // Convertir audio a Base64
        const audioReader = new FileReader();
        audioReader.readAsDataURL(new Blob(audioChunks, { type: "audio/webm" }));
        audioReader.onloadend = () => {
          const audioB64 = (audioReader.result as string).split(",")[1];
          setIsRecording(false);
          setStatus("Online");
          onRecord(videoB64, audioB64);
        };
      };
    };

    mediaRecorder.start();
    audioRecorder.start();

    setTimeout(() => {
      mediaRecorder.stop();
      audioRecorder.stop();
    }, 5000);
  };

  return (
    <div className="flex flex-col h-[600px] bg-white border border-zinc-200 rounded-[32px] overflow-hidden shadow-sm">
      {/* Header */}
      <div className="px-6 py-4 border-b border-zinc-100 flex items-center justify-between bg-zinc-50/50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-zinc-900 rounded-full flex items-center justify-center text-white relative">
            <Bot className="w-5 h-5" />
            <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-green-500 border-2 border-white"></span>
          </div>
          <div>
            <h2 className="font-semibold text-zinc-900">RhythmBot Assistant</h2>
            <p className="text-xs text-zinc-500 flex items-center gap-1">
              {isRecording ? <span className="text-red-500 font-medium animate-pulse">Grabando... {countdown}s</span> : status}
            </p>
          </div>
        </div>

        {/* Minicamara */}
        <div className="relative">
          <video
            ref={videoRef}
            autoPlay
            muted
            playsInline
            className="w-16 h-16 rounded-xl object-cover bg-zinc-200 border border-zinc-300"
          />
          {isRecording && <div className="absolute top-1 right-1 w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>}
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-zinc-50/30">
        {messages.map((msg, i) => (
          <div key={i} className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}>
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${msg.role === "user" ? "bg-blue-100 text-blue-600" : "bg-zinc-200 text-zinc-600"
                }`}
            >
              {msg.role === "user" ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
            </div>
            <div
              className={`px-4 py-3 rounded-2xl max-w-[80%] text-sm ${msg.role === "user"
                  ? "bg-zinc-900 text-white rounded-tr-sm"
                  : "bg-white border border-zinc-200 text-zinc-700 rounded-tl-sm shadow-sm"
                }`}
            >
              {msg.text}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Record Button */}
      <div className="p-4 bg-white border-t border-zinc-100">
        <button
          type="button"
          onClick={handleRecord}
          disabled={isRecording || isProcessing}
          className={`w-full flex items-center justify-center gap-3 px-6 py-4 rounded-full font-semibold text-base transition-all ${
            isRecording
              ? "bg-red-500 text-white animate-pulse"
              : isProcessing
                ? "bg-amber-500 text-white"
                : "bg-zinc-900 text-white hover:bg-zinc-800 hover:scale-[1.02] active:scale-[0.98]"
          } disabled:opacity-70`}
        >
          {isRecording ? (
            <>
              <Video className="w-5 h-5" />
              Grabando... {countdown}s
            </>
          ) : isProcessing ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Analizando con IA...
            </>
          ) : (
            <>
              <Mic className="w-5 h-5" />
              Grabar
            </>
          )}
        </button>
      </div>
    </div>
  );
}
