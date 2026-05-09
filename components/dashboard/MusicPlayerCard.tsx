"use client";

import { Disc3, Music2, Quote } from "lucide-react";

export default function MusicPlayerCard() {
  // Dummy data para visualización
  const currentSong = "Happy";
  const currentArtist = "Pharrell Williams";
  const lastLyric = "Because I'm happy... Clap along if you feel like a room without a roof";

  return (
    <div className="bg-white border border-zinc-200 rounded-[32px] p-6 shadow-sm flex flex-col gap-6 relative overflow-hidden">
      {/* Elemento de fondo sutil */}
      <div className="absolute top-0 right-0 p-8 opacity-[0.03] pointer-events-none">
        <Music2 className="w-32 h-32" />
      </div>

      <div className="flex items-center gap-4 relative z-10">
        <div className="w-16 h-16 rounded-2xl bg-zinc-100 flex items-center justify-center shrink-0">
          <Disc3 className="w-8 h-8 text-zinc-400 animate-[spin_4s_linear_infinite]" />
        </div>
        <div>
          <p className="text-xs font-bold tracking-widest text-zinc-400 uppercase mb-1">Now Playing</p>
          <h3 className="font-semibold text-zinc-900 text-lg leading-tight">{currentSong}</h3>
          <p className="text-sm text-zinc-500">{currentArtist}</p>
        </div>
      </div>

      <div className="bg-zinc-50 rounded-2xl p-4 border border-zinc-100 relative z-10">
        <Quote className="w-4 h-4 text-zinc-300 mb-2" />
        <p className="text-zinc-700 italic text-sm leading-relaxed">
          "{lastLyric}"
        </p>
      </div>
    </div>
  );
}
