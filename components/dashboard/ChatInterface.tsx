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
  };

  return (
    <div className="flex flex-col h-[600px] bg-white border border-zinc-200 rounded-[32px] overflow-hidden shadow-sm">
      {/* Header */}
      <div className="px-6 py-4 border-b border-zinc-100 flex items-center gap-3 bg-zinc-50/50">
        <div className="w-10 h-10 bg-zinc-900 rounded-full flex items-center justify-center text-white">
          <Bot className="w-5 h-5" />
        </div>
        <div className="flex-1">
          <h2 className="font-semibold text-zinc-900">EmotiBot Assistant</h2>
          <p className="text-xs text-zinc-500 flex items-center gap-1">
            <span className={`w-2 h-2 rounded-full inline-block ${isProcessing ? "bg-yellow-500 animate-pulse" : "bg-green-500"}`}></span>
            {isProcessing ? "Procesando..." : "Online"}
          </p>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-zinc-50/30">
        {messages.map((msg, i) => (
          <div key={i} className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}>
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                msg.role === "user" ? "bg-blue-100 text-blue-600" : "bg-zinc-200 text-zinc-600"
              }`}
            >
              {msg.role === "user" ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
            </div>
            <div
              className={`px-4 py-3 rounded-2xl max-w-[80%] text-sm ${
                msg.role === "user"
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
            className={`shrink-0 flex items-center gap-2 px-4 py-3 rounded-full font-medium text-sm transition-all ${
              audioStatus === "recording"
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
