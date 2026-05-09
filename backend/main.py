import os
import json
import base64
import hashlib
import hmac
import time
import asyncio
import httpx
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
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
    print("[WARN] ADVERTENCIA: GEMINI_API_KEY no encontrada en el archivo .env")
genai.configure(api_key=api_key)

# ACRCloud config
ACRCLOUD_HOST = os.environ.get("ACRCLOUD_HOST", "identify-us-west-2.acrcloud.com")
ACRCLOUD_ACCESS_KEY = os.environ.get("ACRCLOUD_ACCESS_KEY", "")
ACRCLOUD_ACCESS_SECRET = os.environ.get("ACRCLOUD_ACCESS_SECRET", "")

# Spotify API (client credentials)
SPOTIFY_CLIENT_ID = os.environ.get("SPOTIFY_CLIENT_ID", "")
SPOTIFY_CLIENT_SECRET = os.environ.get("SPOTIFY_CLIENT_SECRET", "")
_spotify_token_cache: dict[str, object] = {"access_token": None, "expires_at": 0.0}

app = FastAPI(title="Vybo API")

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
    video_b64: str | None = None


class TTSRequest(BaseModel):
    text: str = ""

class RhythmBotResponse(BaseModel):
    emotion: str = Field(description="Must be one of: energetic, calm, sad, happy, tense, neutral")
    mood_command: str = Field(description="ESP32 serial command. Must be one of: 'mood happy', 'mood sad', 'mood surprised', 'mood wink', 'mood neutral'")
    look_command: str = Field(description="ESP32 look command. Must be one of: 'look left', 'look right', 'look up', 'look down', 'look center'")
    display_text: str = Field(description="Texto corto en español (max 20 chars) para mostrar en la pantalla OLED. Si hay cancion detectada, pon un verso corto favorito de la letra.")
    bot_message: str = Field(description="A friendly, empathetic chat message in Spanish responding to the music vibe")
    screen_color: str = Field(description="Hex color code representing the mood")
    recommended_song: str | None = Field(description="Recommended song title if no song was detected")
    recommended_artist: str | None = Field(description="Recommended artist if no song was detected")

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
    "recommended_song": None,
    "recommended_artist": None,
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
    return {"status": "ok", "message": "Vybo Backend is alive!"}


async def _get_spotify_access_token() -> str | None:
    if not SPOTIFY_CLIENT_ID or not SPOTIFY_CLIENT_SECRET:
        return None

    now = time.time()
    cached_token = _spotify_token_cache.get("access_token")
    cached_expires = float(_spotify_token_cache.get("expires_at", 0))
    if cached_token and cached_expires - now > 30:
        return str(cached_token)

    auth_header = base64.b64encode(
        f"{SPOTIFY_CLIENT_ID}:{SPOTIFY_CLIENT_SECRET}".encode("utf-8")
    ).decode("utf-8")

    async with httpx.AsyncClient(timeout=6) as client:
        resp = await client.post(
            "https://accounts.spotify.com/api/token",
            data={"grant_type": "client_credentials"},
            headers={"Authorization": f"Basic {auth_header}"},
        )

    if resp.status_code != 200:
        print(f"⚠️ Spotify token error: {resp.status_code} {resp.text}")
        return None

    payload = resp.json()
    access_token = payload.get("access_token")
    expires_in = int(payload.get("expires_in", 0))
    if not access_token:
        return None

    _spotify_token_cache["access_token"] = access_token
    _spotify_token_cache["expires_at"] = now + expires_in
    return access_token


@app.get("/api/spotify/search")
async def spotify_search(song: str | None = None, artist: str | None = None, query: str | None = None):
    token = await _get_spotify_access_token()
    if not token:
        return {"track_id": None, "embed_url": None, "error": "spotify_not_configured"}

    if query:
        search_query = query
    else:
        parts = []
        if song:
            parts.append(f"track:{song}")
        if artist:
            parts.append(f"artist:{artist}")
        search_query = " ".join(parts).strip()

    if not search_query:
        return {"track_id": None, "embed_url": None, "error": "missing_query"}

    async with httpx.AsyncClient(timeout=6) as client:
        resp = await client.get(
            "https://api.spotify.com/v1/search",
            params={"q": search_query, "type": "track", "limit": 1},
            headers={"Authorization": f"Bearer {token}"},
        )

    if resp.status_code != 200:
        print(f"⚠️ Spotify search error: {resp.status_code} {resp.text}")
        return {"track_id": None, "embed_url": None, "error": "search_failed"}

    payload = resp.json()
    items = payload.get("tracks", {}).get("items", [])
    if not items:
        return {"track_id": None, "embed_url": None, "error": "no_results"}

    track_id = items[0].get("id")
    if not track_id:
        return {"track_id": None, "embed_url": None, "error": "no_track_id"}

    return {
        "track_id": track_id,
        "embed_url": f"https://open.spotify.com/embed/track/{track_id}",
    }


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
            "Eres Vybo, un robot físico con pantalla OLED que muestra expresiones faciales "
            "y servomotores que mueven su cabeza. Tu trabajo es analizar canciones y sus letras "
            "para decidir qué emoción expresar físicamente.\n\n"
            "REGLAS IMPORTANTES:\n"
            "- mood_command DEBE ser exactamente uno de: 'mood happy', 'mood sad', 'mood surprised', 'mood wink', 'mood neutral'\n"
            "- look_command DEBE ser exactamente uno de: 'look left', 'look right', 'look up', 'look down', 'look center'\n"
            "- display_text DEBE tener maximo 40 caracteres (pantalla OLED 128x64 con textSize 2, 10 chars por linea, 4 lineas).\n"
            "- Si detectaste una cancion, en display_text PON UN VERSO CORTO FAVORITO de la letra (max 40 chars). Ejemplo: 'Is this the real life' o 'Let it be'. Debe ser un fragmento icónico de la canción.\n"
            "- Si NO hay cancion, escribe una frase corta representativa (ej: 'Que onda!', 'Temazo', 'Bailando').\n"
            "- NUNCA dejes display_text vacio ni uses puntos suspensivos (...).\n"
            "- NO uses acentos ni caracteres especiales (ñ, ¿, ¡, tildes) en display_text, ya que la pantalla OLED no los soporta. Reemplaza letras acentuadas por su version sin acento.\n"
            "- En bot_message, actua como mi mejor amigo. No des respuestas roboticas ni digas 'pensando'. Se muy conversador! Si detectaste una cancion, banda o letra, CUENTAME UN DATO CURIOSO (fun fact) fascinante sobre la banda, la cancion o su contexto historico. Habla en español de forma super natural y relajada.\n"
            "- Elige emociones vibrantes, no seas conservador. Si la cancion es alegre, pon 'mood happy'.\n"
            "- IMPORTANTE: Si recibes un video, evalua la expresion facial y lenguaje corporal del usuario. Menciona en bot_message lo que ves en el video y usa eso para ajustar el mood.\n"
            "- Si NO se detecta cancion en el audio, recomienda una cancion y artista en los campos recommended_song y recommended_artist. Si SI se detecta cancion, deja recommended_song y recommended_artist como null."
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

    # Si mandaron video, subir con File API
    video_file = None
    temp_video_path = None
    if req.video_b64:
        import tempfile
        video_bytes = base64.b64decode(req.video_b64)
        
        with tempfile.NamedTemporaryFile(delete=False, suffix=".webm") as temp_video:
            temp_video.write(video_bytes)
            temp_video_path = temp_video.name
            
        print(f"🎬 Subiendo video a Gemini File API...")
        video_file = genai.upload_file(path=temp_video_path, mime_type="video/webm")
        
        # Esperar procesamiento
        while video_file.state.name == "PROCESSING":
            print("⏳ Procesando video en Gemini...")
            time.sleep(2)
            video_file = genai.get_file(video_file.name)
            
        if video_file.state.name == "FAILED":
            print("❌ Error procesando el video en Gemini")
        else:
            prompt_parts.append(video_file)

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
        if detected_song:
            json_response["recommended_song"] = None
            json_response["recommended_artist"] = None
        else:
            json_response["recommended_song"] = json_response.get("recommended_song") or None
            json_response["recommended_artist"] = json_response.get("recommended_artist") or None

        print(f"✅ {json_response.get('emotion')} → {json_response.get('mood_command')}")
        return json_response

    except Exception as e:
        print(f"⚠️ Error de Gemini: {e}")
        fallback = {**FALLBACK_RESPONSE}
        fallback["bot_message"] = f"Hubo un pequeño cortocircuito en mis emociones. (Detalle técnico: {str(e)})"
        fallback["detected_song"] = detected_song
        fallback["detected_artist"] = detected_artist
        fallback["current_lyric"] = current_lyric
        fallback["recommended_song"] = None
        fallback["recommended_artist"] = None
        return fallback
    finally:
        # Limpieza de archivos de video
        if video_file:
            try:
                genai.delete_file(video_file.name)
                print("🧹 Video borrado de Gemini")
            except Exception as e:
                print(f"Error borrando de Gemini: {e}")
        if temp_video_path and os.path.exists(temp_video_path):
            try:
                os.remove(temp_video_path)
            except Exception:
                pass


@app.post("/api/tts")
async def text_to_speech(req: TTSRequest):
    if not req.text.strip():
        return {"audio_base64": None, "error": "missing_text"}

    try:
        tts_model = genai.GenerativeModel(model_name="gemini-3.1-flash-tts-preview")
        response = await asyncio.to_thread(
            tts_model.generate_content,
            [
                "Habla en espanol con energia altisima, muy amigable y carismatica, "
                "como un DJ super alegre que contagia vibra. "
                f"Mensaje: {req.text}"
            ],
            generation_config=genai.GenerationConfig(
                response_modalities=["AUDIO"],
                speech_config={
                    "voice_config": {
                        "prebuilt_voice_config": {"voice_name": "Puck"}
                    }
                },
            ),
        )

        audio_part = None
        if response.candidates:
            content = response.candidates[0].content
            if content and content.parts:
                audio_part = content.parts[0]

        audio_data = getattr(getattr(audio_part, "inline_data", None), "data", None)
        if not audio_data:
            return {"audio_base64": None, "error": "no_audio"}

        return {"audio_base64": audio_data}
    except Exception as e:
        print(f"⚠️ Error de TTS: {e}")
        return {"audio_base64": None, "error": "tts_failed"}

# ---------------------------------------------------------
# WEBSOCKET ENDPOINT
# ---------------------------------------------------------
@app.websocket("/ws/chat")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    print("[INFO] Cliente WebSocket conectado")
    
    model = genai.GenerativeModel(
        model_name="gemini-1.5-flash",
        system_instruction=(
            "Eres Vybo, un robot físico con pantalla OLED que muestra expresiones faciales "
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

    try:
        while True:
            data = await websocket.receive_text()
            payload = json.loads(data)
            
            prompt_parts = []
            
            # Analizar audio si existe
            detected_song = None
            detected_artist = None
            current_lyric = None
            
            if payload.get("audio_b64"):
                audio_bytes = base64.b64decode(payload["audio_b64"])
                song_info = await identify_song(audio_bytes)
                
                if song_info:
                    detected_song = song_info["title"]
                    detected_artist = song_info["artist"]
                    play_offset = song_info["play_offset_ms"]
                    lyric = await get_synced_lyric(detected_song, detected_artist, play_offset)
                    if lyric:
                        current_lyric = lyric
                    
                    context = f"Se detectó la canción '{detected_song}' del artista '{detected_artist}'."
                    if current_lyric:
                        context += f"\nLa letra en este momento dice: \"{current_lyric}\""
                    prompt_parts.append(context)
                else:
                    prompt_parts.append({"mime_type": "audio/webm", "data": audio_bytes})

            # Añadir imagen si existe
            if payload.get("image_b64"):
                prompt_parts.append({"mime_type": "image/jpeg", "data": base64.b64decode(payload["image_b64"])})

            # Añadir mensaje de texto
            if payload.get("message"):
                prompt_parts.append(payload["message"])

            if not prompt_parts:
                await websocket.send_json({"error": "No data received"})
                continue

            try:
                response = await asyncio.to_thread(
                    model.generate_content,
                    prompt_parts,
                    generation_config=genai.GenerationConfig(
                        response_mime_type="application/json",
                        response_schema=RhythmBotResponse,
                        temperature=0.4
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
                
                await websocket.send_json(json_response)
                
            except Exception as e:
                import traceback
                traceback.print_exc()
                fallback = {**FALLBACK_RESPONSE}
                fallback["bot_message"] = f"Hubo un pequeño cortocircuito en mis emociones. (Detalle técnico: {str(e)})"
                await websocket.send_json(fallback)
                
    except WebSocketDisconnect:
        print("[DISCONNECT] Cliente desconectado")
    except Exception as e:
        print(f"⚠️ Error general WebSocket: {e}")