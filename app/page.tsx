import { Mic, Zap, Cpu, Monitor, Play, ArrowRight } from "lucide-react";
import HardwareScene from "@/components/landing/HardwareScene";
import Link from "next/link";

export default function Home() {
  return (
    <div className="bg-white min-h-screen font-sans text-zinc-900 pb-24">
      {/* Hero Section */}
      <section className="flex flex-col items-center justify-center px-6 pt-24 text-center min-h-screen relative">
        <div className="relative z-10">
          <h1 className="text-6xl sm:text-7xl md:text-8xl font-semibold tracking-tighter text-zinc-900 mb-6 pointer-events-none">
            Tu Música.<br className="hidden sm:block" /> Su Emoción.
          </h1>
          <p className="text-xl md:text-2xl text-zinc-500 max-w-2xl mx-auto font-normal tracking-tight mb-12 pointer-events-none">
            El Robot que Siente el Ritmo
          </p>
          <Link 
            href="/dashboard"
            className="inline-flex items-center gap-2 bg-zinc-900 text-white px-8 py-4 rounded-full font-medium text-lg hover:bg-zinc-800 transition-transform hover:scale-105 active:scale-95"
          >
            Get Started
            <ArrowRight className="w-5 h-5" />
          </Link>
        </div>

      </section>

      {/* Container */}
      <main className="max-w-6xl mx-auto px-6">
        
        {/* Section Title */}
        <h2 className="text-3xl md:text-4xl font-medium tracking-tight mb-12 text-zinc-800 text-center md:text-left">
          El flujo de EmotiBot en acción
        </h2>

        {/* Two large cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Card 1: Listening */}
          <div className="bg-[#6B8AF2] rounded-[32px] p-10 md:p-12 text-white flex flex-col justify-between overflow-hidden relative min-h-[500px]">
             {/* Content */}
             <div>
               <h2 className="text-3xl font-medium mb-4 leading-tight">
                 El navegador{" "}
                 <span className="inline-flex items-center bg-white/20 px-3 py-1 rounded-full text-sm font-medium gap-1 transform -translate-y-1">
                   <Mic className="w-4 h-4"/> escucha
                 </span>{" "}
                 el entorno
               </h2>
               <p className="text-blue-100 text-lg max-w-sm">
                 Graba 10 segundos de audio y usa ACRCloud para identificar la canción y el minuto exacto.
               </p>
             </div>
             
             {/* Visuals (Waveform mockup) */}
             <div className="mt-12">
               <div className="text-center font-bold text-5xl tracking-widest mb-2">00:10</div>
               <div className="text-center text-red-300 text-sm font-medium flex items-center justify-center gap-2 mb-8">
                 <span className="w-2 h-2 rounded-full bg-red-400 animate-pulse"></span> Grabando
               </div>
               
               {/* Waveform bars */}
               <div className="flex items-end justify-center gap-1.5 h-16 opacity-80">
                  {/* Generated bars for mockup */}
                  <div className="w-1.5 bg-white/60 rounded-full h-4"></div>
                  <div className="w-1.5 bg-white/60 rounded-full h-8"></div>
                  <div className="w-1.5 bg-white/80 rounded-full h-12"></div>
                  <div className="w-1.5 bg-white rounded-full h-16"></div>
                  <div className="w-1.5 bg-white/80 rounded-full h-10"></div>
                  <div className="w-1.5 bg-white/60 rounded-full h-14"></div>
                  <div className="w-1.5 bg-white/40 rounded-full h-6"></div>
                  <div className="w-1.5 bg-white/60 rounded-full h-9"></div>
                  <div className="w-1.5 bg-white/80 rounded-full h-14"></div>
                  <div className="w-1.5 bg-white rounded-full h-12"></div>
                  <div className="w-1.5 bg-white/60 rounded-full h-7"></div>
                  <div className="w-1.5 bg-white/40 rounded-full h-4"></div>
                  <div className="w-1.5 bg-white/60 rounded-full h-8"></div>
                  <div className="w-1.5 bg-white/80 rounded-full h-12"></div>
                  <div className="w-1.5 bg-white/60 rounded-full h-9"></div>
                  <div className="w-1.5 bg-white/40 rounded-full h-5"></div>
                  <div className="w-1.5 bg-white/60 rounded-full h-3"></div>
               </div>
             </div>
          </div>

          {/* Card 2: Reacting */}
          <div className="bg-[#F4F4F5] rounded-[32px] p-10 md:p-12 text-zinc-900 flex flex-col justify-between overflow-hidden relative min-h-[500px]">
             {/* Content */}
             <div>
               <h2 className="text-3xl font-medium mb-4 leading-tight">
                 El ESP32{" "}
                 <span className="inline-flex items-center bg-white border border-zinc-200 px-3 py-1 rounded-full text-sm font-medium gap-1 shadow-sm transform -translate-y-1">
                   <Zap className="w-4 h-4"/> reacciona
                 </span>{" "}
                 al instante
               </h2>
               <p className="text-zinc-500 text-lg max-w-sm">
                 La IA procesa la emoción y envía comandos por Web Serial API a la pantalla OLED.
               </p>
             </div>

             {/* Visuals (Dark terminal/screen mockup) */}
             <div className="mt-12 bg-[#2A2A2A] rounded-2xl p-6 text-white shadow-xl relative z-10">
                <div className="flex justify-between items-center mb-6">
                  <div className="text-xs text-zinc-400">Terminal — Conexión Serial</div>
                  <div className="bg-blue-600 text-white text-[10px] uppercase tracking-wider px-2 py-1 rounded font-bold">Activo</div>
                </div>
                
                <p className="text-sm text-zinc-300 leading-relaxed mb-6 font-mono">
                  &gt; Analizando huella de audio...<br />
                  &gt; Canción detectada: "Happy" - Pharrell Williams<br />
                  &gt; Emoción inferida: FELICIDAD<br />
                  &gt; Enviando comando a SSD1306...
                </p>

                <div className="flex items-center gap-2 text-xs text-zinc-400 mb-4 uppercase tracking-widest font-bold">
                  <Cpu className="w-3.5 h-3.5"/> Ejecutando
                </div>
                
                <div className="bg-[#3A3A3A] rounded-xl p-4 flex items-center gap-4 border border-white/5">
                  <div className="bg-white/10 p-2 rounded-lg">
                    <Monitor className="w-5 h-5 text-white"/>
                  </div>
                  <div>
                    <div className="text-sm font-medium">Dibujar expresión de felicidad</div>
                    <div className="text-xs text-zinc-400 mt-0.5">0 latencia perceptible</div>
                  </div>
                  <Play className="w-4 h-4 ml-auto text-blue-400"/>
                </div>
             </div>
          </div>
        </div>

        {/* 3D Hardware Scene Section */}
        <div className="mt-32">
          <h2 className="text-3xl md:text-4xl font-medium tracking-tight mb-8 text-zinc-800 text-center">
            Componentes del Sistema
          </h2>
          <p className="text-center text-zinc-500 mb-12 max-w-2xl mx-auto">
            Explora los componentes físicos de EmotiBot en 3D interactivo.
          </p>
          <div className="bg-zinc-50 rounded-[32px] border border-zinc-200 overflow-hidden">
            <HardwareScene />
          </div>
        </div>

        {/* Assembly Procedure Section */}
        <div className="mt-32 pb-32">
          <h2 className="text-3xl md:text-4xl font-medium tracking-tight mb-8 text-zinc-800 text-center">
            Procedimiento de Armado
          </h2>
          <div className="max-w-3xl mx-auto space-y-8 text-zinc-600 text-lg leading-relaxed">
            <div className="bg-zinc-50 p-8 rounded-3xl border border-zinc-100">
              <h3 className="text-xl font-semibold text-zinc-900 mb-4">Paso 1. Conexiones Base</h3>
              <p>
                Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.
              </p>
            </div>
            <div className="bg-zinc-50 p-8 rounded-3xl border border-zinc-100">
              <h3 className="text-xl font-semibold text-zinc-900 mb-4">Paso 2. Ensamblaje Físico</h3>
              <p>
                Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.
              </p>
            </div>
            <div className="bg-zinc-50 p-8 rounded-3xl border border-zinc-100">
              <h3 className="text-xl font-semibold text-zinc-900 mb-4">Paso 3. Calibración</h3>
              <p>
                Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo.
              </p>
            </div>
          </div>
        </div>

      </main>
    </div>
  );
}
