"use client";

import { useState } from "react";
import { Send, Bot, User } from "lucide-react";

export default function ChatInterface() {
  const [messages, setMessages] = useState([
    { role: "bot", text: "¡Hola! Estoy listo para escuchar la música y detectar las emociones. Conecta el robot para empezar." }
  ]);
  const [input, setInput] = useState("");

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    setMessages([...messages, { role: "user", text: input }]);
    setInput("");
    
    // Simulate bot response after a short delay
    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        { role: "bot", text: "Aún no tengo un modelo de IA conectado para responder, pero sigo analizando el audio." }
      ]);
    }, 1000);
  };

  return (
    <div className="flex flex-col h-[600px] bg-white border border-zinc-200 rounded-[32px] overflow-hidden shadow-sm">
      {/* Header */}
      <div className="px-6 py-4 border-b border-zinc-100 flex items-center gap-3 bg-zinc-50/50">
        <div className="w-10 h-10 bg-zinc-900 rounded-full flex items-center justify-center text-white">
          <Bot className="w-5 h-5" />
        </div>
        <div>
          <h2 className="font-semibold text-zinc-900">EmotiBot Assistant</h2>
          <p className="text-xs text-zinc-500 flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-green-500 inline-block"></span> Online
          </p>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-zinc-50/30">
        {messages.map((msg, i) => (
          <div key={i} className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${msg.role === "user" ? "bg-blue-100 text-blue-600" : "bg-zinc-200 text-zinc-600"}`}>
              {msg.role === "user" ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
            </div>
            <div className={`px-4 py-3 rounded-2xl max-w-[80%] text-sm ${msg.role === "user" ? "bg-zinc-900 text-white rounded-tr-sm" : "bg-white border border-zinc-200 text-zinc-700 rounded-tl-sm shadow-sm"}`}>
              {msg.text}
            </div>
          </div>
        ))}
      </div>

      {/* Input Area */}
      <div className="p-4 bg-white border-t border-zinc-100">
        <form onSubmit={handleSend} className="relative flex items-center">
          <input 
            type="text" 
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Escribe un mensaje al robot..."
            className="w-full pl-6 pr-14 py-4 bg-zinc-50 border border-zinc-200 rounded-full focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent transition-all"
          />
          <button 
            type="submit"
            disabled={!input.trim()}
            className="absolute right-2 p-2 bg-zinc-900 text-white rounded-full hover:bg-zinc-800 disabled:opacity-50 disabled:hover:bg-zinc-900 transition-colors"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
