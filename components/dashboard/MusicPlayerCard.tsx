"use client";

import { Disc3, Music2, Quote } from "lucide-react";

interface MusicPlayerCardProps {
  songRecommendation?: string;
  emotion?: string;
}

export default function MusicPlayerCard({ songRecommendation, emotion }: MusicPlayerCardProps) {
  // Parsing simple de la recomendación de Gemini
  // Si Gemini devuelve "Canción - Artista", lo separamos, si no, mostramos todo.
  const isDummy = !songRecommendation;
  const displayTitle = songRecommendation || "Esperando lectura...";
  
  return (
    <div className="bg-white border border-zinc-200 rounded-[32px] p-6 shadow-sm flex flex-col gap-6 relative overflow-hidden">
      {/* Elemento de fondo sutil */}
      <div className="absolute top-0 right-0 p-8 opacity-[0.03] pointer-events-none">
        <Music2 className="w-32 h-32" />
      </div>

      <div className="flex items-center gap-4 relative z-10">
        <div className="w-16 h-16 rounded-2xl bg-zinc-100 flex items-center justify-center shrink-0">
          <Disc3 className={`w-8 h-8 text-zinc-400 ${!isDummy ? "animate-[spin_4s_linear_infinite] text-blue-500" : ""}`} />
        </div>
        <div>
          <p className="text-xs font-bold tracking-widest text-zinc-400 uppercase mb-1">
            {isDummy ? "Vibra Actual" : "Sugerencia de IA"}
          </p>
          <h3 className="font-semibold text-zinc-900 text-sm md:text-base leading-tight pr-4">
            {displayTitle}
          </h3>
          {emotion && (
            <p className="text-xs text-blue-600 mt-1 uppercase tracking-wider font-semibold">
              Mood: {emotion}
            </p>
          )}
        </div>
      </div>

      <div className="bg-zinc-50 rounded-2xl p-4 border border-zinc-100 relative z-10">
        <Quote className="w-4 h-4 text-zinc-300 mb-2" />
        <p className="text-zinc-700 italic text-sm leading-relaxed">
          {isDummy 
            ? "Envíale un mensaje a EmotiBot para que escuche tu entorno y te recomiende algo." 
            : "¡Esta es la canción perfecta para el ambiente y la vibra que acabo de analizar en tu rostro y entorno!"}
        </p>
      </div>
    </div>
  );
}
