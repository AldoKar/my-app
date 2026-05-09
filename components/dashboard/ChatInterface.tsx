"use client";

import { useRef, useEffect } from "react";
import { Send, Bot, User, Mic, Loader2 } from "lucide-react";
import { useState } from "react";
import type { CaptureStatus } from "@/lib/useAudioCapture";

interface ChatInterfaceProps {
  messages: { role: string; text: string }[];
  onSendMessage: (text: string) => void;
  onListen: () => void;
  isProcessing: boolean;
  audioStatus: CaptureStatus;
  secondsLeft: number;
}

export default function ChatInterface({
  messages,
  onSendMessage,
  onListen,
  isProcessing,
  audioStatus,
  secondsLeft,
}: ChatInterfaceProps) {
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll al último mensaje
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isProcessing) return;
    onSendMessage(input);
    setInput("");

    if (!streamRef.current || !videoRef.current) {
      setMessages(prev => [...prev, { role: "bot", text: "⚠️ Error: No hay acceso a la cámara o el micrófono." }]);
      return;
    }

    setIsRecording(true);
    setStatus("Grabando tu vibra (5s)...");

    // 1. Capturar Foto (Canvas)
    const canvas = document.createElement("canvas");
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    canvas.getContext("2d")?.drawImage(videoRef.current, 0, 0);
    const imageB64Clean = canvas.toDataURL("image/jpeg", 0.5).split(",")[1];

    // 2. Grabar Audio (5 segundos)
    const mediaRecorder = new MediaRecorder(streamRef.current);
    const audioChunks: BlobPart[] = [];

    mediaRecorder.ondataavailable = e => audioChunks.push(e.data);

    mediaRecorder.onstop = () => {
      setStatus("Enviando a Gemini AI...");
      const reader = new FileReader();
      reader.readAsDataURL(new Blob(audioChunks, { type: "audio/webm" }));
      reader.onloadend = () => {
        const audioB64Clean = (reader.result as string).split(",")[1];

        // 3. Conectar a FastAPI WebSocket
        const ws = new WebSocket("ws://127.0.0.1:8000/ws/chat");

        ws.onopen = () => {
          ws.send(JSON.stringify({
            message: userMessage,
            image_b64: imageB64Clean,
            audio_b64: audioB64Clean
          }));
        };

        ws.onmessage = (event) => {
          const response = JSON.parse(event.data);

          setMessages(prev => [
            ...prev,
            { role: "bot", text: response.bot_message || "¡He procesado tu energía exitosamente!" }
          ]);

          if (onBotResponse) {
            onBotResponse(response);
          }

          setStatus(`Emoción detectada: ${response.emotion?.toUpperCase()}`);
          setIsRecording(false);
          ws.close();
        };

        ws.onerror = () => {
          setMessages(prev => [...prev, { role: "bot", text: "❌ Error de conexión con el backend de IA." }]);
          setStatus("Fallo de conexión");
          setIsRecording(false);
        };
      };
    };

    mediaRecorder.start();
    // Detener la grabación exactamente a los 5 segundos
    setTimeout(() => {
      mediaRecorder.stop();
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
              {isRecording ? <span className="text-red-500 font-medium animate-pulse">Grabando...</span> : status}
            </p>
          </div>
        </div>

        {/* Minicamara para validación visual silenciosa */}
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

      {/* Input Area */}
      <div className="p-4 bg-white border-t border-zinc-100">
        <div className="flex items-center gap-2">
          {/* Botón de Escuchar */}
          <button
            type="button"
            onClick={onListen}
            disabled={audioStatus !== "idle" || isProcessing}
            className={`shrink-0 flex items-center gap-2 px-4 py-3 rounded-full font-medium text-sm transition-all ${audioStatus === "recording"
                ? "bg-red-500 text-white animate-pulse"
                : audioStatus === "processing"
                  ? "bg-yellow-500 text-white"
                  : "bg-blue-50 text-blue-600 hover:bg-blue-100"
              } disabled:opacity-50`}
          >
            {audioStatus === "recording" ? (
              <>
                <Mic className="w-4 h-4" />
                {secondsLeft}s
              </>
            ) : audioStatus === "processing" ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Analizando
              </>
            ) : (
              <>
                <Mic className="w-4 h-4" />
                Escuchar
              </>
            )}
          </button>

          {/* Input de texto */}
          <form onSubmit={handleSend} className="relative flex-1 flex items-center">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Escribe un mensaje..."
              disabled={isProcessing}
              className="w-full pl-5 pr-12 py-3 bg-zinc-50 border border-zinc-200 rounded-full focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent transition-all disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={!input.trim() || isProcessing}
              className="absolute right-2 p-2 bg-zinc-900 text-white rounded-full hover:bg-zinc-800 disabled:opacity-50 disabled:hover:bg-zinc-900 transition-colors"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
