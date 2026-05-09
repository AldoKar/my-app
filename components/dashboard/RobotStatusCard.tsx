"use client";

import { Cpu, Wifi, WifiOff } from "lucide-react";
import type { SerialStatus } from "@/lib/useSerialPort";

interface RobotStatusCardProps {
  status: SerialStatus;
  onConnect: () => void;
  onDisconnect: () => void;
}

export default function RobotStatusCard({ status, onConnect, onDisconnect }: RobotStatusCardProps) {
  return (
    <div className="bg-white border border-zinc-200 rounded-[32px] p-6 shadow-sm">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-zinc-900 flex items-center gap-2">
            <Cpu className="w-5 h-5 text-zinc-500" />
            ESP32 Status
          </h3>
          <p className="text-sm text-zinc-500 mt-1">
            {status === "connected"
              ? "Conectado vía Web Serial"
              : status === "connecting"
              ? "Conectando..."
              : "Esperando conexión..."}
          </p>
        </div>
        <div
          className={`p-2 rounded-full ${
            status === "connected" ? "bg-green-100 text-green-600" : "bg-zinc-100 text-zinc-400"
          }`}
        >
          {status === "connected" ? <Wifi className="w-5 h-5" /> : <WifiOff className="w-5 h-5" />}
        </div>
      </div>

      {status === "connected" ? (
        <button
          onClick={onDisconnect}
          className="w-full py-3 px-4 bg-red-50 text-red-600 font-medium rounded-2xl hover:bg-red-100 transition-colors"
        >
          Desconectar
        </button>
      ) : (
        <button
          onClick={onConnect}
          disabled={status === "connecting"}
          className="w-full py-3 px-4 bg-zinc-900 text-white font-medium rounded-2xl hover:bg-zinc-800 transition-colors disabled:opacity-50"
        >
          {status === "connecting" ? "Conectando..." : "Conectar Robot"}
        </button>
      )}
    </div>
  );
}
