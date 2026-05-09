"use client";

import ChatInterface from "@/components/dashboard/ChatInterface";
import RobotStatusCard from "@/components/dashboard/RobotStatusCard";
import MusicPlayerCard from "@/components/dashboard/MusicPlayerCard";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useState } from "react";

export default function Dashboard() {
  const [songRecommendation, setSongRecommendation] = useState<string>("");
  const [emotion, setEmotion] = useState<string>("");

  const handleBotResponse = (response: any) => {
    if (response.song_recommendation) {
      setSongRecommendation(response.song_recommendation);
    }
    if (response.emotion) {
      setEmotion(response.emotion);
    }
  };

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
          
          {/* Columna Izquierda: Chat (Toma más espacio) */}
          <div className="lg:col-span-8">
            <h2 className="text-2xl font-medium tracking-tight mb-6 text-zinc-800">
              Conversación
            </h2>
            <ChatInterface onBotResponse={handleBotResponse} />
          </div>

          {/* Columna Derecha: Tarjetas de Estado e Info */}
          <div className="lg:col-span-4 space-y-6">
            <h2 className="text-2xl font-medium tracking-tight mb-6 text-zinc-800">
              Estado del Sistema
            </h2>
            
            {/* Robot Connection */}
            <RobotStatusCard />

            {/* Music Info */}
            <MusicPlayerCard songRecommendation={songRecommendation} emotion={emotion} />
          </div>

        </div>
      </main>
    </div>
  );
}
