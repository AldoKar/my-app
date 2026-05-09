"use client";

import { useState, useRef, useCallback } from "react";

export type SerialStatus = "disconnected" | "connecting" | "connected";

export function useSerialPort() {
  const [status, setStatus] = useState<SerialStatus>("disconnected");
  const [logs, setLogs] = useState<string[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const portRef = useRef<any>(null);
  const writerRef = useRef<WritableStreamDefaultWriter<Uint8Array> | null>(null);
  const readerRef = useRef<ReadableStreamDefaultReader<Uint8Array> | null>(null);
  const readingRef = useRef(false);

  const connect = useCallback(async () => {
    if (!("serial" in navigator)) {
      alert("Web Serial API no está soportada en este navegador. Usa Chrome o Edge.");
      return;
    }

    try {
      setStatus("connecting");

      // Abre el diálogo nativo de Chrome para seleccionar puerto
      const port = await (navigator as any).serial.requestPort();
      await port.open({ baudRate: 115200 });

      portRef.current = port;

      // Writer para enviar comandos
      const writer = port.writable.getWriter();
      writerRef.current = writer;

      // Reader para leer respuestas del ESP32
      const reader = port.readable.getReader();
      readerRef.current = reader;

      setStatus("connected");

      // Leer datos del ESP32 en background
      readingRef.current = true;
      (async () => {
        const decoder = new TextDecoder();
        let buffer = "";
        try {
          while (readingRef.current) {
            const { value, done } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");
            buffer = lines.pop() || "";
            for (const line of lines) {
              const trimmed = line.trim();
              if (trimmed) {
                setLogs((prev) => [...prev.slice(-50), trimmed]);
              }
            }
          }
        } catch (e) {
          // Reader cancelled on disconnect
        }
      })();
    } catch (err) {
      console.error("Serial connect error:", err);
      setStatus("disconnected");
    }
  }, []);

  const disconnect = useCallback(async () => {
    readingRef.current = false;
    try {
      if (readerRef.current) {
        await readerRef.current.cancel();
        readerRef.current.releaseLock();
        readerRef.current = null;
      }
      if (writerRef.current) {
        writerRef.current.releaseLock();
        writerRef.current = null;
      }
      if (portRef.current) {
        await portRef.current.close();
        portRef.current = null;
      }
    } catch (e) {
      console.error("Serial disconnect error:", e);
    }
    setStatus("disconnected");
  }, []);

  const sendCommand = useCallback(async (cmd: string) => {
    if (!writerRef.current) {
      console.warn("Serial port not connected");
      return;
    }
    try {
      const encoder = new TextEncoder();
      await writerRef.current.write(encoder.encode(cmd + "\n"));
      setLogs((prev) => [...prev.slice(-50), `→ ${cmd}`]);
    } catch (e) {
      console.error("Serial write error:", e);
    }
  }, []);

  return { status, logs, connect, disconnect, sendCommand };
}
