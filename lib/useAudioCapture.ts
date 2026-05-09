"use client";

import { useState, useRef, useCallback } from "react";

export type CaptureStatus = "idle" | "recording" | "processing";

export function useAudioCapture() {
  const [status, setStatus] = useState<CaptureStatus>("idle");
  const [secondsLeft, setSecondsLeft] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const startCapture = useCallback((durationSec: number = 10): Promise<string> => {
    return new Promise(async (resolve, reject) => {
      try {
        // Solicitar permiso del micrófono
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        streamRef.current = stream;

        const mediaRecorder = new MediaRecorder(stream);
        mediaRecorderRef.current = mediaRecorder;
        const chunks: Blob[] = [];

        mediaRecorder.ondataavailable = (e) => chunks.push(e.data);

        mediaRecorder.onstop = () => {
          setStatus("processing");
          const blob = new Blob(chunks, { type: "audio/webm" });

          // Convertir a base64
          const reader = new FileReader();
          reader.readAsDataURL(blob);
          reader.onloadend = () => {
            const fullB64 = reader.result as string;
            const cleanB64 = fullB64.split(",")[1];

            // Limpiar stream del micrófono
            stream.getTracks().forEach((t) => t.stop());
            streamRef.current = null;

            setStatus("idle");
            setSecondsLeft(0);
            resolve(cleanB64);
          };
          reader.onerror = () => {
            setStatus("idle");
            reject(new Error("Error convirtiendo audio a base64"));
          };
        };

        // Iniciar grabación
        setStatus("recording");
        setSecondsLeft(durationSec);
        mediaRecorder.start();

        // Countdown timer
        let remaining = durationSec;
        timerRef.current = setInterval(() => {
          remaining--;
          setSecondsLeft(remaining);
          if (remaining <= 0 && timerRef.current) {
            clearInterval(timerRef.current);
          }
        }, 1000);

        // Detener después de N segundos
        setTimeout(() => {
          if (mediaRecorder.state === "recording") {
            mediaRecorder.stop();
          }
          if (timerRef.current) {
            clearInterval(timerRef.current);
          }
        }, durationSec * 1000);
      } catch (err) {
        setStatus("idle");
        reject(err);
      }
    });
  }, []);

  const cancelCapture = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.stop();
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
    }
    setStatus("idle");
    setSecondsLeft(0);
  }, []);

  return { status, secondsLeft, startCapture, cancelCapture };
}
