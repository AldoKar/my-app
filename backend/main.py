import os
import json
import base64
import hashlib
import hmac
import time
import asyncio
import httpx
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import google.generativeai as genai
from pydantic import BaseModel, Field
from dotenv import load_dotenv
import sys
import io

# Forzar salida en UTF-8 para evitar errores de Unicode en Windows al imprimir emojis
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8')
# Cargar variables de entorno
load_dotenv()

# Configurar Gemini
api_key = os.environ.get("GEMINI_API_KEY")
if not api_key:
    print("⚠️ ADVERTENCIA: GEMINI_API_KEY no encontrada en el archivo .env")
genai.configure(api_key=api_key)

# ACRCloud config
ACRCLOUD_HOST = os.environ.get("ACRCLOUD_HOST", "identify-us-west-2.acrcloud.com")
ACRCLOUD_ACCESS_KEY = os.environ.get("ACRCLOUD_ACCESS_KEY", "")
ACRCLOUD_ACCESS_SECRET = os.environ.get("ACRCLOUD_ACCESS_SECRET", "")

app = FastAPI(title="RhythmBot API")

# Configuración de CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------
# SCHEMAS
# ---------------------------------------------------------
class AnalyzeRequest(BaseModel):
    message: str = ""
    audio_b64: str | None = None

class RhythmBotResponse(BaseModel):
    emotion: str = Field(description="Must be one of: energetic, calm, sad, happy, tense, neutral")
    mood_command: str = Field(description="ESP32 serial command. Must be one of: 'mood happy', 'mood sad', 'mood surprised', 'mood wink', 'mood neutral'")
    look_command: str = Field(description="ESP32 look command. Must be one of: 'look left', 'look right', 'look up', 'look down', 'look center'")
    display_text: str = Field(description="Texto corto en español (max 15 chars) para mostrar en la pantalla OLED")
    bot_message: str = Field(description="A friendly, empathetic chat message in Spanish responding to the music vibe")
    screen_color: str = Field(description="Hex color code representing the mood")

FALLBACK_RESPONSE = {
    "emotion": "neutral",
    "mood_command": "mood neutral",
    "look_command": "look center",
    "display_text": "...",
    "bot_message": "Hubo un pequeño cortocircuito en mis emociones, dame un segundo.",
    "screen_color": "#CCCCCC",
    "detected_song": None,
    "detected_artist": None,
    "current_lyric": None,
}


# ---------------------------------------------------------
# ACRCloud: Identificar canción a partir de audio
# ---------------------------------------------------------
async def identify_song(audio_bytes: bytes) -> dict | None:
    if not ACRCLOUD_ACCESS_KEY or not ACRCLOUD_ACCESS_SECRET:
        print("⚠️ ACRCloud keys no configuradas, saltando identificación")
        return None

    timestamp = str(int(time.time()))
    string_to_sign = (
        "POST\n/v1/identify\n"
        + ACRCLOUD_ACCESS_KEY + "\naudio\n1\n"
        + timestamp
    )
    sign = base64.b64encode(
        hmac.new(
            ACRCLOUD_ACCESS_SECRET.encode("utf-8"),
            string_to_sign.encode("utf-8"),
            digestmod=hashlib.sha1,
        ).digest()
    ).decode("utf-8")

    data = {
        "access_key": ACRCLOUD_ACCESS_KEY,
        "sample_bytes": str(len(audio_bytes)),
        "timestamp": timestamp,
        "signature": sign,
        "data_type": "audio",
        "signature_version": "1",
    }
    files = {"sample": ("audio.webm", audio_bytes, "audio/webm")}

    try:
        async with httpx.AsyncClient(timeout=5) as client:
            resp = await client.post(
                f"https://{ACRCLOUD_HOST}/v1/identify",
                data=data,
                files=files,
            )
            result = resp.json()

        status_code = result.get("status", {}).get("code", -1)
        if status_code != 0:
            print(f"🎵 ACRCloud no reconoció la canción (code={status_code})")
            return None

        music = result["metadata"]["music"][0]
        return {
            "title": music.get("title", "Desconocida"),
            "artist": music.get("artists", [{}])[0].get("name", "Desconocido"),
            "album": music.get("album", {}).get("name", ""),
            "play_offset_ms": music.get("play_offset_ms", 0),
        }
    except Exception as e:
        print(f"⚠️ Error en ACRCloud: {e}")
        return None


# ---------------------------------------------------------
# LRCLIB: Obtener lyrics sincronizados
# ---------------------------------------------------------
async def get_synced_lyric(title: str, artist: str, offset_ms: int) -> str | None:
    try:
        async with httpx.AsyncClient(timeout=4) as client:
            resp = await client.get(
                "https://lrclib.net/api/get",
                params={"track_name": title, "artist_name": artist},
            )
            if resp.status_code != 200:
                return None
            data = resp.json()

        synced = data.get("syncedLyrics")
        if not synced:
            plain = data.get("plainLyrics", "")
            lines = [l.strip() for l in plain.split("\n") if l.strip()]
            return lines[0] if lines else None

        offset_sec = offset_ms / 1000.0
        best_line = ""
        best_time = -1.0

        for line in synced.split("\n"):
            line = line.strip()
            if not line or not line.startswith("["):
                continue
            try:
                bracket_end = line.index("]")
                ts_str = line[1:bracket_end]
                parts = ts_str.split(":")
                ts_sec = float(parts[0]) * 60 + float(parts[1])
                text = line[bracket_end + 1:].strip()
                if text and ts_sec <= offset_sec and ts_sec > best_time:
                    best_time = ts_sec
                    best_line = text
            except (ValueError, IndexError):
                continue

        return best_line if best_line else None
    except Exception as e:
        print(f"⚠️ Error en LRCLIB: {e}")
        return None


# ---------------------------------------------------------
# ENDPOINTS
# ---------------------------------------------------------
@app.get("/health")
async def health_check():
    return {"status": "ok", "message": "RhythmBot Backend is alive!"}


@app.post("/api/analyze")
async def analyze(req: AnalyzeRequest):
    """
    Endpoint simple: recibe mensaje y/o audio en base64,
    devuelve el análisis completo en un solo JSON.
    """
    # Inicializar modelo Gemini
    model = genai.GenerativeModel(
        model_name="gemini-2.5-flash",
        system_instruction=(
            "Eres RhythmBot, un robot físico con pantalla OLED que muestra expresiones faciales "
            "y servomotores que mueven su cabeza. Tu trabajo es analizar canciones y sus letras "
            "para decidir qué emoción expresar físicamente.\n\n"
            "REGLAS IMPORTANTES:\n"
            "- mood_command DEBE ser exactamente uno de: 'mood happy', 'mood sad', 'mood surprised', 'mood wink', 'mood neutral'\n"
            "- look_command DEBE ser exactamente uno de: 'look left', 'look right', 'look up', 'look down', 'look center'\n"
            "- display_text DEBE tener máximo 15 caracteres (es una pantalla OLED de 128x64) y DEBE estar en español.\n"
            "- NUNCA dejes display_text vacío ni uses puntos suspensivos (...). Escribe una palabra o frase corta representativa (ej: 'Genial!', 'Temazo', 'Bailando').\n"
            "- NO uses acentos ni caracteres especiales (ñ, ¿, ¡) en display_text, ya que la pantalla OLED no los soporta.\n"
            "- En bot_message, actúa como mi mejor amigo. No des respuestas robóticas ni digas 'pensando'. ¡Sé muy conversador! Si detectaste una canción, banda o letra, CUÉNTAME UN DATO CURIOSO (fun fact) fascinante sobre la banda, la canción o su contexto histórico. Habla en español de forma súper natural y relajada.\n"
            "- Elige emociones vibrantes, no seas conservador. Si la canción es alegre, pon 'mood happy'."
        ),
    )

    # 1. Si hay audio, intentar identificar la canción
    detected_song = None
    detected_artist = None
    current_lyric = None

    if req.audio_b64:
        audio_bytes = base64.b64decode(req.audio_b64)
        song_info = await identify_song(audio_bytes)

        if song_info:
            detected_song = song_info["title"]
            detected_artist = song_info["artist"]
            play_offset = song_info["play_offset_ms"]
            print(f"🎵 Canción: {detected_song} - {detected_artist} ({play_offset}ms)")

            lyric = await get_synced_lyric(detected_song, detected_artist, play_offset)
            if lyric:
                current_lyric = lyric
                print(f"📝 Lyric: {current_lyric}")

    # 2. Construir prompt para Gemini
    prompt_parts = []

    if detected_song:
        context = f"Se detectó la canción '{detected_song}' del artista '{detected_artist}'."
        if current_lyric:
            context += f"\nLa letra en este momento dice: \"{current_lyric}\""
        context += (
            "\n\nBasándote en el significado emocional de esta canción y esta letra, "
            "decide qué emoción debe expresar el robot y genera los comandos apropiados."
        )
        prompt_parts.append(context)
    elif req.message:
        prompt_parts.append(req.message)
    else:
        prompt_parts.append(
            "No se detectó ninguna canción. El ambiente está en silencio. "
            "El robot debería estar en modo neutral y curioso."
        )

    # Si mandaron audio pero ACRCloud no lo reconoció, enviarlo directo a Gemini
    if req.audio_b64 and not detected_song:
        audio_bytes = base64.b64decode(req.audio_b64)
        prompt_parts.append({"mime_type": "audio/webm", "data": audio_bytes})

    # 3. Llamar a Gemini
    try:
        response = await asyncio.to_thread(
            model.generate_content,
            prompt_parts,
            generation_config=genai.GenerationConfig(
                response_mime_type="application/json",
                response_schema=RhythmBotResponse,
                temperature=0.4,
            ),
            safety_settings={
                genai.types.HarmCategory.HARM_CATEGORY_HARASSMENT: genai.types.HarmBlockThreshold.BLOCK_NONE,
                genai.types.HarmCategory.HARM_CATEGORY_HATE_SPEECH: genai.types.HarmBlockThreshold.BLOCK_NONE,
                genai.types.HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT: genai.types.HarmBlockThreshold.BLOCK_NONE,
                genai.types.HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT: genai.types.HarmBlockThreshold.BLOCK_NONE,
            }
        )

        json_response = json.loads(response.text)
        json_response["detected_song"] = detected_song
        json_response["detected_artist"] = detected_artist
        json_response["current_lyric"] = current_lyric

        print(f"✅ {json_response.get('emotion')} → {json_response.get('mood_command')}")
        return json_response

    except Exception as e:
        print(f"⚠️ Error de Gemini: {e}")
        fallback = {**FALLBACK_RESPONSE}
        fallback["bot_message"] = f"Hubo un pequeño cortocircuito en mis emociones. (Detalle técnico: {str(e)})"
        fallback["detected_song"] = detected_song
        fallback["detected_artist"] = detected_artist
        fallback["current_lyric"] = current_lyric
        return fallback