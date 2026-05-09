"use client";

import { useState } from "react";
import { Cpu, Wifi, WifiOff } from "lucide-react";

export default function RobotStatusCard() {
  const [isConnected, setIsConnected] = useState(false);

  const handleConnect = async () => {
    // Aquí irá la lógica de Web Serial API en el futuro
    try {
      if ("serial" in navigator) {
        // Dummy simulation
        setIsConnected(true);
      } else {
        alert("Web Serial API no está soportada en este navegador. Usa Chrome o Edge.");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDisconnect = () => {
    setIsConnected(false);
  };

  return (
    <div className="bg-white border border-zinc-200 rounded-[32px] p-6 shadow-sm">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-zinc-900 flex items-center gap-2">
            <Cpu className="w-5 h-5 text-zinc-500" />
            ESP32 Status
          </h3>
          <p className="text-sm text-zinc-500 mt-1">
            {isConnected ? "Conectado vía Web Serial" : "Esperando conexión..."}
          </p>
        </div>
        <div className={`p-2 rounded-full ${isConnected ? "bg-green-100 text-green-600" : "bg-zinc-100 text-zinc-400"}`}>
          {isConnected ? <Wifi className="w-5 h-5" /> : <WifiOff className="w-5 h-5" />}
        </div>
      </div>

      {isConnected ? (
        <button 
          onClick={handleDisconnect}
          className="w-full py-3 px-4 bg-red-50 text-red-600 font-medium rounded-2xl hover:bg-red-100 transition-colors"
        >
          Desconectar
        </button>
      ) : (
        <button 
          onClick={handleConnect}
          className="w-full py-3 px-4 bg-zinc-900 text-white font-medium rounded-2xl hover:bg-zinc-800 transition-colors"
        >
          Conectar Robot
        </button>
      )}
    </div>
  );
}
