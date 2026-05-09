"use client";

import { useState, useCallback } from "react";
import ChatInterface from "@/components/dashboard/ChatInterface";
import RobotStatusCard from "@/components/dashboard/RobotStatusCard";
import MusicPlayerCard from "@/components/dashboard/MusicPlayerCard";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useSerialPort } from "@/lib/useSerialPort";
import { useAudioCapture } from "@/lib/useAudioCapture";

// Tipos compartidos
export interface SongInfo {
  song: string | null;
  artist: string | null;
  lyric: string | null;
}

export interface BotResponse {
  emotion: string;
  mood_command: string;
  look_command: string;
  display_text: string;
  bot_message: string;
  screen_color: string;
  detected_song: string | null;
  detected_artist: string | null;
  current_lyric: string | null;
}

export default function Dashboard() {
  // Estado compartido
  const serial = useSerialPort();
  const audio = useAudioCapture();
  const [songInfo, setSongInfo] = useState<SongInfo>({ song: null, artist: null, lyric: null });
  const [messages, setMessages] = useState<{ role: string; text: string }[]>([
    { role: "bot", text: "¡Hola! Soy EmotiBot. Conecta el robot y presiona \"🎤 Escuchar\" para que analice la música del ambiente." },
  ]);
  const [isProcessing, setIsProcessing] = useState(false);
  // Función central: enviar datos al backend y procesar respuesta
  const sendToBackend = useCallback(
    async (payload: { message?: string; audio_b64?: string }) => {
      try {
        const res = await fetch("http://127.0.0.1:8000/api/analyze", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        });

        if (!res.ok) {
          throw new Error("Error en la respuesta del servidor");
        }

        const response: BotResponse = await res.json();

        // Actualizar info de la canción
        setSongInfo({
          song: response.detected_song,
          artist: response.detected_artist,
          lyric: response.current_lyric,
        });

        // Agregar mensaje del bot al chat
        setMessages((prev) => [...prev, { role: "bot", text: response.bot_message }]);

        // Enviar comandos al ESP32 si está conectado
        if (serial.status === "connected") {
          if (response.mood_command) serial.sendCommand(response.mood_command);
          setTimeout(() => {
            if (response.look_command) serial.sendCommand(response.look_command);
          }, 300);
          setTimeout(() => {
            if (response.display_text) {
              serial.sendCommand(`text ${response.display_text}`);
              // Limpiar la pantalla OLED después de 5 segundos
              setTimeout(() => {
                serial.sendCommand(`text  `);
              }, 5000);
            }
          }, 600);
        }

        return response;
      } catch (error) {
        console.error(error);
        setMessages((prev) => [
          ...prev,
          { role: "bot", text: "❌ No pude conectarme al backend. Asegúrate de que esté corriendo (uvicorn main:app --reload)" },
        ]);
        return null;
      }
    },
    [serial]
  );

  // Handler: Escuchar ambiente (grabar audio → enviar al backend)
  const handleListen = useCallback(async () => {
    if (audio.status !== "idle") return;
    setIsProcessing(true);
    setMessages((prev) => [...prev, { role: "user", text: "🎤 Escuchando el ambiente por 5 segundos..." }]);

    try {
      const audioB64 = await audio.startCapture(5);
      setMessages((prev) => [...prev, { role: "user", text: "🔄 Analizando audio con ACRCloud y Gemini..." }]);
      await sendToBackend({ audio_b64: audioB64 });
    } catch (err) {
      setMessages((prev) => [...prev, { role: "bot", text: "Error capturando audio. Revisa los permisos del micrófono." }]);
    }
    setIsProcessing(false);
  }, [audio, sendToBackend]);

  // Handler: Enviar mensaje de texto
  const handleSendMessage = useCallback(
    async (text: string) => {
      setMessages((prev) => [...prev, { role: "user", text }]);
      setIsProcessing(true);
      await sendToBackend({ message: text });
      setIsProcessing(false);
    },
    [sendToBackend]
  );

  return (
    <div className="bg-zinc-50 min-h-screen font-sans text-zinc-900 pb-24">
      {/* Navbar Minimalista */}
      <nav className="bg-white border-b border-zinc-200 px-6 py-4 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-4">
          <Link href="/" className="p-2 -ml-2 rounded-full hover:bg-zinc-100 text-zinc-500 transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="font-semibold text-lg tracking-tight">EmotiBot Panel</h1>
        </div>
      </nav>

      {/* Main Content Layout */}
      <main className="max-w-6xl mx-auto px-6 pt-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Columna Izquierda: Chat */}
          <div className="lg:col-span-8">
            <h2 className="text-2xl font-medium tracking-tight mb-6 text-zinc-800">Conversación</h2>
            <ChatInterface
              messages={messages}
              onSendMessage={handleSendMessage}
              onListen={handleListen}
              isProcessing={isProcessing}
              audioStatus={audio.status}
              secondsLeft={audio.secondsLeft}
            />
          </div>

          {/* Columna Derecha: Tarjetas */}
          <div className="lg:col-span-4 space-y-6">
            <h2 className="text-2xl font-medium tracking-tight mb-6 text-zinc-800">Estado del Sistema</h2>
            <RobotStatusCard
              status={serial.status}
              onConnect={serial.connect}
              onDisconnect={serial.disconnect}
            />
            <MusicPlayerCard
              songName={songInfo.song}
              artistName={songInfo.artist}
              currentLyric={songInfo.lyric}
            />
          </div>
        </div>
      </main>
    </div>
  );
}
