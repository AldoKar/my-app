"use client";

import { Disc3, Music2, Quote } from "lucide-react";

interface MusicPlayerCardProps {
  songName: string | null;
  artistName: string | null;
  currentLyric: string | null;
  emotion?: string | null;
}

export default function MusicPlayerCard({ songName, artistName, currentLyric, emotion }: MusicPlayerCardProps) {
  const isPlaying = !!songName;

  return (
    <div className="bg-white border border-zinc-200 rounded-[32px] p-6 shadow-sm flex flex-col gap-6 relative overflow-hidden">
      {/* Elemento de fondo sutil */}
      <div className="absolute top-0 right-0 p-8 opacity-[0.03] pointer-events-none">
        <Music2 className="w-32 h-32" />
      </div>

      <div className="flex items-center gap-4 relative z-10">
        <div className={`w-16 h-16 rounded-2xl flex items-center justify-center shrink-0 ${isPlaying ? "bg-blue-50" : "bg-zinc-100"}`}>
          <Disc3
            className={`w-8 h-8 ${isPlaying ? "text-blue-500 animate-[spin_4s_linear_infinite]" : "text-zinc-300"
              }`}
          />
        </div>
        <div>
          <p className="text-xs font-bold tracking-widest text-zinc-400 uppercase mb-1">
            {isPlaying ? "Vibra Actual" : "Esperando..."}
          </p>
          <h3 className="font-semibold text-zinc-900 text-sm md:text-base leading-tight pr-4">
            {songName || "Sin canción"}
          </h3>
          <p className="text-sm text-zinc-500 mb-2">{artistName || "Presiona Escuchar"}</p>
          {emotion && (
            <p className="inline-block px-2 py-1 bg-blue-100 rounded-md text-xs text-blue-600 uppercase tracking-wider font-semibold">
              Mood: {emotion}
            </p>
          )}
        </div>
      </div>

      {currentLyric && (
        <div className="bg-zinc-50 rounded-2xl p-4 border border-zinc-100 relative z-10">
          <Quote className="w-4 h-4 text-zinc-300 mb-2" />
          <p className="text-zinc-700 italic text-sm leading-relaxed">
            &ldquo;{currentLyric}&rdquo;
          </p>
        </div>
      )}

      {!currentLyric && !isPlaying && (
        <div className="bg-zinc-50 rounded-2xl p-4 border border-zinc-100 relative z-10">
          <p className="text-zinc-400 text-sm text-center">
            Graba audio para detectar la canción y sus lyrics
          </p>
        </div>
      )}
      {!isPlaying && (
        <div className="bg-zinc-50 rounded-2xl p-4 border border-zinc-100 relative z-10">
          <Quote className="w-4 h-4 text-zinc-300 mb-2" />
          <p className="text-zinc-700 italic text-sm leading-relaxed">
            Envíale un mensaje a EmotiBot para que escuche tu entorno y te recomiende algo.
          </p>
        </div>
      )}
    </div>
  );
}
