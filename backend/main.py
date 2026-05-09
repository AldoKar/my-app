import os
import json
import base64
import asyncio
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
import google.generativeai as genai
from pydantic import BaseModel, Field
from dotenv import load_dotenv

# Cargar variables de entorno
load_dotenv("backend/.env")

# Configurar Gemini
api_key = os.environ.get("GEMINI_API_KEY")
if not api_key:
    print("[WARN] ADVERTENCIA: GEMINI_API_KEY no encontrada en el archivo .env")
genai.configure(api_key=api_key)

app = FastAPI(title="RhythmBot Multimodal API")

# Configuración de CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------
# SCHEMA DE RESPUESTA ESPERADA (Lo que le devolvemos al Front)
# ---------------------------------------------------------
class RhythmBotResponse(BaseModel):
    emotion: str = Field(description="Must be one of: energetic, calm, sad, happy, tense, neutral")
    servo_angle: int = Field(description="Angle 0-180 based on emotion intensity (e.g., 180 for very energetic)")
    bot_message: str = Field(description="A friendly, empathetic chat message responding to the user's vibe")
    song_recommendation: str = Field(description="Name and artist of a song that matches or elevates the mood")
    screen_color: str = Field(description="Hex color code (e.g., #FF0000) representing the mood to change the UI")

# Fallback seguro en caso de error
FALLBACK_RESPONSE = {
    "emotion": "neutral",
    "servo_angle": 90,
    "bot_message": "Hubo un pequeño cortocircuito en mis emociones, dame un segundo.",
    "song_recommendation": "Lofi Hip Hop Radio - Beats to Relax/Study to",
    "screen_color": "#CCCCCC"
}

@app.get("/health")
async def health_check():
    return {"status": "ok", "message": "RhythmBot Backend is alive!"}

@app.websocket("/ws/chat")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    print("[OK] Cliente Frontend conectado al WebSocket")
    
    # Inicializar el modelo con instrucciones claras
    model = genai.GenerativeModel(
        model_name="gemini-2.5-flash",
        system_instruction=(
            "Eres RhythmBot. Analiza con mucho detalle la expresión facial y "
            "el tono de voz. Sé muy sensible a los cambios de ánimo. Si ves "
            "una sonrisa o energía alta, clasifícala como 'energetic' o 'happy' "
            "de inmediato. No seas conservador, queremos respuestas vibrantes y emocionales."
        )
    )

    try:
        while True:
            # 1. Recibir JSON desde el frontend
            # Esperamos que el front mande: {"message": "hola", "image_b64": "...", "audio_b64": "..."}
            data = await websocket.receive_text()
            payload = json.loads(data)
            
            user_text = payload.get("message")
            image_b64 = payload.get("image_b64")
            audio_b64 = payload.get("audio_b64")
            
            print(f"[INFO] Recibido mensaje: {user_text}")
            if image_b64: print(f"[INFO] Imagen recibida ({len(image_b64)} bytes)")
            if audio_b64: print(f"[INFO] Audio recibido ({len(audio_b64)} bytes)")
            
            # 2. Armar los "parts" (el contenido multimodal) para Gemini
            prompt_parts = []
            if user_text:
                prompt_parts.append(user_text)
                
            if image_b64:
                try:
                    # Decodificar base64 a bytes
                    image_bytes = base64.b64decode(image_b64)
                    prompt_parts.append({"mime_type": "image/jpeg", "data": image_bytes})
                except Exception as e:
                    print(f"[ERROR] Error decodificando imagen: {e}")
                
            if audio_b64:
                try:
                    audio_bytes = base64.b64decode(audio_b64)
                    # Asumimos webm porque es lo estándar al grabar desde el navegador web
                    prompt_parts.append({"mime_type": "audio/webm", "data": audio_bytes})
                except Exception as e:
                    print(f"[ERROR] Error decodificando audio: {e}")

            # Si no enviaron nada, saltar
            if not prompt_parts:
                print("[WARN] No se recibieron partes para el prompt")
                await websocket.send_json({"error": "No data received"})
                continue

            try:
                # 3. Llamar a Gemini (async para no bloquear)
                print("[INFO] Llamando a Gemini...")
                response = await asyncio.to_thread(
                    model.generate_content,
                    prompt_parts,
                    generation_config=genai.GenerationConfig(
                        response_mime_type="application/json",
                        response_schema=RhythmBotResponse,
                        temperature=0.4
                    )
                )
                
                # 4. Enviar el JSON perfecto al frontend
                print(f"[OK] Respuesta de Gemini recibida: {response.text}")
                json_response = json.loads(response.text)
                await websocket.send_json(json_response)
                
            except Exception as e:
                print(f"[WARN] Error de Gemini: {e}")
                import traceback
                traceback.print_exc()
                await websocket.send_json(FALLBACK_RESPONSE)
                
    except WebSocketDisconnect:
        print("[DISCONNECT] Cliente desconectado")
    except Exception as e:
        print(f"[ERROR] Error critico: {e}")