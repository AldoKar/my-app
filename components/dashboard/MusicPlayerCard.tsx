"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Disc3, Music2, Quote } from "lucide-react";

interface MusicPlayerCardProps {
  songName: string | null;
  artistName: string | null;
  currentLyric: string | null;
  emotion?: string | null;
  source?: "detected" | "recommended" | null;
}

export default function MusicPlayerCard({
  songName,
  artistName,
  currentLyric,
  emotion,
  source,
}: MusicPlayerCardProps) {
  const isPlaying = !!songName;
  const recommendationQuery = useMemo(
    () => [songName, artistName].filter(Boolean).join(" "),
    [songName, artistName],
  );
  const [spotifyEmbedSrc, setSpotifyEmbedSrc] = useState<string | null>(null);
  const [embedStatus, setEmbedStatus] = useState<
    "idle" | "loading" | "ready" | "error"
  >("idle");
  const lastAnnouncedRef = useRef<string | null>(null);
  const headerLabel =
    source === "recommended" ? "Recomendacion IA" : "Vibra Actual";

  useEffect(() => {
    let isActive = true;
    if (!recommendationQuery) {
      setSpotifyEmbedSrc(null);
      setEmbedStatus("idle");
      return;
    }

    const loadEmbed = async () => {
      try {
        setEmbedStatus("loading");
        const params = new URLSearchParams();
        if (songName) params.set("song", songName);
        if (artistName) params.set("artist", artistName || "");
        if (!songName) params.set("query", recommendationQuery);

        const res = await fetch(
          `http://127.0.0.1:8000/api/spotify/search?${params.toString()}`,
        );
        if (!res.ok) {
          throw new Error("spotify_search_failed");
        }

        const data: { embed_url?: string | null } = await res.json();
        if (!isActive) return;

        if (data.embed_url) {
          const embedUrl = data.embed_url.includes("?")
            ? `${data.embed_url}&autoplay=1`
            : `${data.embed_url}?autoplay=1`;
          setSpotifyEmbedSrc(embedUrl);
          setEmbedStatus("ready");
        } else {
          setSpotifyEmbedSrc(null);
          setEmbedStatus("error");
        }
      } catch (error) {
        if (!isActive) return;
        setSpotifyEmbedSrc(null);
        setEmbedStatus("error");
      }
    };

    loadEmbed();
    return () => {
      isActive = false;
    };
  }, [recommendationQuery, songName, artistName]);

  useEffect(() => {
    const key = `${songName || ""}|${artistName || ""}`;
    if (!songName || key === lastAnnouncedRef.current) return;
    lastAnnouncedRef.current = key;

    const announce = async () => {
      const message = `Ey, esta te va a encantar: ${songName}${artistName ? ` de ${artistName}` : ""}.`;
      try {
        const res = await fetch("http://127.0.0.1:8000/api/tts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: message }),
        });
        if (!res.ok) throw new Error("tts_failed");
        const data: { audio_base64?: string | null } = await res.json();
        if (!data.audio_base64) throw new Error("tts_no_audio");

        const binaryString = atob(data.audio_base64);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i += 1) {
          bytes[i] = binaryString.charCodeAt(i);
        }

        const int16Array = new Int16Array(bytes.buffer);
        const audioContext = new (
          window.AudioContext || (window as any).webkitAudioContext
        )({
          sampleRate: 24000,
        });
        const audioBuffer = audioContext.createBuffer(
          1,
          int16Array.length,
          24000,
        );
        const channelData = audioBuffer.getChannelData(0);
        for (let i = 0; i < int16Array.length; i += 1) {
          channelData[i] = int16Array[i] / 32768.0;
        }
        const source = audioContext.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(audioContext.destination);
        source.start();
      } catch (error) {
        if ("speechSynthesis" in window) {
          const utterance = new SpeechSynthesisUtterance(message);
          utterance.lang = "es-ES";
          window.speechSynthesis.cancel();
          window.speechSynthesis.speak(utterance);
        }
      }
    };

    announce();
  }, [songName, artistName]);

  return (
    <div className="bg-white border border-zinc-200 rounded-[32px] p-6 shadow-sm flex flex-col gap-6 relative overflow-hidden">
      {/* Elemento de fondo sutil */}
      <div className="absolute top-0 right-0 p-8 opacity-[0.03] pointer-events-none">
        <Music2 className="w-32 h-32" />
      </div>

      <div className="flex items-center gap-4 relative z-10">
        <div
          className={`w-16 h-16 rounded-2xl flex items-center justify-center shrink-0 ${isPlaying ? "bg-blue-50" : "bg-zinc-100"}`}
        >
          <Disc3
            className={`w-8 h-8 ${
              isPlaying
                ? "text-blue-500 animate-[spin_4s_linear_infinite]"
                : "text-zinc-300"
            }`}
          />
        </div>
        <div>
          <p className="text-xs font-bold tracking-widest text-zinc-400 uppercase mb-1">
            {isPlaying ? headerLabel : "Esperando..."}
          </p>
          <h3 className="font-semibold text-zinc-900 text-sm md:text-base leading-tight pr-4">
            {songName || "Sin canción"}
          </h3>
          <p className="text-sm text-zinc-500 mb-2">
            {artistName || "Presiona Escuchar"}
          </p>
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
            Envíale un mensaje a Vybo para que escuche tu entorno y te
            recomiende algo.
          </p>
        </div>
      )}

      {isPlaying && (
        <div className="bg-zinc-50 rounded-2xl border border-zinc-100 relative z-10 overflow-hidden">
          <div className="px-4 pt-4 pb-2">
            <p className="text-[11px] uppercase tracking-widest font-semibold text-zinc-400">
              Opcion recomendada
            </p>
          </div>
          <div className="px-3 pb-3">
            {embedStatus === "loading" && (
              <div className="text-sm text-zinc-500">Cargando preview...</div>
            )}
            {embedStatus === "ready" && spotifyEmbedSrc && (
              <iframe
                src={spotifyEmbedSrc}
                width="100%"
                height="352"
                frameBorder="0"
                allow="autoplay; encrypted-media"
                scrolling="no"
                className="block w-full rounded-xl"
                title="Spotify preview"
              />
            )}
            {embedStatus === "error" && (
              <div className="text-sm text-zinc-500">
                No se encontro el track en Spotify.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
