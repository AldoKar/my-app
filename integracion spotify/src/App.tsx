import { useState, useEffect, useRef } from 'react';
import { GoogleGenAI } from "@google/genai";
import { motion, AnimatePresence } from 'motion/react';
import { 
  Music, 
  Camera, 
  Send, 
  LogOut, 
  Disc, 
  Mic2, 
  RefreshCw,
  LayoutGrid,
  Heart,
  Volume2
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { SpotifyTokens, UserProfile, Track, ChatMessage } from './types.ts';
import { DJ_SYSTEM_PROMPT, MOOD_PROMPT } from './constants.ts';

// Constants
const AI_MODEL = "gemini-2.5-flash";

let activeAudioSource: AudioBufferSourceNode | null = null;
let globalAudioContext: AudioContext | null = null;

let globalResumeMic: (() => void) | null = null;

export default function App() {
  const [tokens, setTokens] = useState<SpotifyTokens | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: 'dj', content: "Yo! I'm GrooveEye, your personal AI DJ. Hook me up with your Spotify and let's get this party started!" }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [currentMood, setCurrentMood] = useState<string | null>(null);
  const [recommendations, setRecommendations] = useState<Track[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);
  
  const handleSendMessageRef = useRef<any>(null);
  useEffect(() => {
    handleSendMessageRef.current = handleSendMessage;
    globalResumeMic = () => {
      if (recognitionRef.current && recognitionRef.current.isActive) {
         recognitionRef.current.isPausedByDJ = false;
         try { recognitionRef.current.start(); } catch(e) {}
         setIsListening(true);
      }
    };
  }, [messages, tokens, isLoading, input, currentMood]);

  // Initialize Speech Recognition
  useEffect(() => {
    if ('webkitSpeechRecognition' in window) {
      const SpeechRecognition = (window as any).webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = false;
      recognition.lang = 'en-US';

      recognition.onstart = () => setIsListening(true);
      recognition.onend = () => {
        setIsListening(false);
        if (recognitionRef.current?.isActive && !recognitionRef.current?.isPausedByDJ) {
           // Restart after a brief moment to avoid rapid loops if permissions are denied
           setTimeout(() => {
             if (recognitionRef.current?.isActive && !recognitionRef.current?.isPausedByDJ) {
               try { recognitionRef.current.start(); } catch(e) {}
             }
           }, 500);
        }
      };

      recognition.onresult = async (event: any) => {
        const current = event.resultIndex;
        let transcript = event.results[current][0].transcript.trim();
        console.log("Heard:", transcript);
        
        if (transcript) {
           let command = transcript;
           // Check if it's a wake word command or if they just spoke while it's active
           const wakeMatch = transcript.match(/^(?:hey\s+)?(?:groove|prove|grob|truth)\b/i);
           if (wakeMatch) {
             command = transcript.substring(wakeMatch[0].length).trim();
             if (!command) command = "what's up?";
           }

           // Temporarily stop microphone so it doesn't pick up the TTS DJ voice
           if (recognitionRef.current) {
               recognitionRef.current.isPausedByDJ = true;
           }
           recognition.stop();
           
           let mood: string | undefined = undefined;
           if (videoRef.current && canvasRef.current) {
             mood = await analyzeMoodSilent() || undefined;
           }
           
           if (handleSendMessageRef.current) {
               await handleSendMessageRef.current(command, mood);
           }
           
           // It will be restarted by onend because isActive is still true
        }
      };
      
      recognitionRef.current = recognition;
    }
    
    // Force load voices
    if ('speechSynthesis' in window) {
      window.speechSynthesis.onvoiceschanged = () => {
        window.speechSynthesis.getVoices();
      };
    }
  }, []);

  const toggleListening = () => {
    if (!recognitionRef.current) return;
    if (isListening || recognitionRef.current.isActive) {
      recognitionRef.current.isActive = false;
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      recognitionRef.current.isActive = true;
      setIsListening(true);
      try { recognitionRef.current.start(); } catch(e) {}
    }
  };

  const speakText = async (text: string) => {
    // Cancel browser TTS if it's active
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    
    // Cancel playing Gemini TTS
    if (activeAudioSource) {
      try {
        activeAudioSource.stop();
        activeAudioSource.disconnect();
      } catch (e) {}
      activeAudioSource = null;
    }

    const cleanText = text.replace(/[*_~`#🎵🎧]/g, '').replace(/\[SYSTEM:[^\]]*\]/g, '');
    if (!cleanText.trim()) {
       globalResumeMic?.();
       return;
    }

    try {
      const response = await ai.models.generateContent({
        model: "gemini-3.1-flash-tts-preview",
        contents: [{ parts: [{ text: `Say enthusiastically like a cool friendly DJ: ${cleanText}` }] }],
        config: {
          responseModalities: ['AUDIO'] as any,
          speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: { voiceName: 'Puck' }, // Puck has a energetic friendly voice
              },
          },
        },
      });

      const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (base64Audio) {
        const binaryString = atob(base64Audio);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }
        
        const int16Array = new Int16Array(bytes.buffer);
        if (!globalAudioContext) {
           globalAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
        }
        const audioBuffer = globalAudioContext.createBuffer(1, int16Array.length, 24000);
        const channelData = audioBuffer.getChannelData(0);
        
        for (let i = 0; i < int16Array.length; i++) {
            channelData[i] = int16Array[i] / 32768.0;
        }
        
        const source = globalAudioContext.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(globalAudioContext.destination);
        
        // Save the active reference to allow cancellation later
        activeAudioSource = source;
        
        source.onended = () => {
          if (activeAudioSource === source) {
             activeAudioSource = null;
          }
          globalResumeMic?.();
        };
        
        source.start();
      } else {
        globalResumeMic?.();
      }
    } catch (err) {
      console.error("Gemini TTS failed, falling back to browser TTS", err);
      if ('speechSynthesis' in window) {
         const utterance = new SpeechSynthesisUtterance(cleanText);
         const voices = window.speechSynthesis.getVoices();
         let bestVoice = voices.find(v => v.name.includes('Google UK English Male'))
                      || voices.find(v => v.name.includes('Google US English')) 
                      || voices.find(v => v.lang === 'en-US' && v.name.includes('Male'))
                      || voices[0];
         utterance.voice = bestVoice || null;
         utterance.rate = 1.05;
         utterance.onend = () => {
             globalResumeMic?.();
         };
         utterance.onerror = () => {
             globalResumeMic?.();
         };
         window.speechSynthesis.speak(utterance);
      } else {
         globalResumeMic?.();
      }
    }
  };

  const analyzeMoodSilent = async () => {
    if (!videoRef.current || !canvasRef.current) return null;
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (video.videoWidth === 0) return null;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d')?.drawImage(video, 0, 0);
    const base64Image = canvas.toDataURL('image/jpeg').split(',')[1];
    
    setIsAnalyzing(true);
    try {
        const response = await ai.models.generateContent({
            model: AI_MODEL,
            contents: [
            { parts: [
                { inlineData: { mimeType: "image/jpeg", data: base64Image } },
                { text: MOOD_PROMPT }
            ]}
            ]
        });
        const mood = response.text || "Uncertain vibe";
        setCurrentMood(mood);
        return mood;
    } catch (e: any) {
        if (e?.status === 429 || e?.message?.includes("quota") || e?.message?.includes("429")) {
          console.warn("Silent mood analysis skipped: Rate limit exceeded.");
        } else {
          console.error("Silent mood analysis error:", e);
        }
        return null;
    } finally {
        setIsAnalyzing(false);
    }
  };

  const [activeTrack, setActiveTrack] = useState<Track | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Initialize Gemini
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

  // Handle Spotify Result from popup
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'OAUTH_AUTH_SUCCESS') {
        const { payload } = event.data;
        setTokens(payload);
        fetchProfile(payload.access_token);
        setMessages(prev => [...prev, { role: 'dj', content: "Spotify linked! I'm scanning your library now... looking good, champ. What's the vibe today?" }]);
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const fetchProfile = async (token: string) => {
    try {
      const res = await fetch('https://api.spotify.com/v1/me', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setUserProfile(data);
    } catch (err) {
      console.error('Error fetching profile:', err);
    }
  };

  const startSpotifyAuth = async () => {
    try {
      const res = await fetch('/api/auth/url');
      const { url } = await res.json();
      const width = 600, height = 700;
      const left = (window.innerWidth / 2) - (width / 2);
      const top = (window.innerHeight / 2) - (height / 2);
      window.open(url, 'spotify_auth', `width=${width},height=${height},top=${top},left=${left}`);
    } catch (err) {
      console.error('Auth error:', err);
    }
  };

  const analyzeMood = async () => {
    if (!videoRef.current || !canvasRef.current) return;
    setIsAnalyzing(true);

    try {
      const canvas = canvasRef.current;
      const video = videoRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      canvas.getContext('2d')?.drawImage(video, 0, 0);
      
      const base64Image = canvas.toDataURL('image/jpeg').split(',')[1];
      
      const response = await ai.models.generateContent({
        model: AI_MODEL,
        contents: [
          { parts: [
            { inlineData: { mimeType: "image/jpeg", data: base64Image } },
            { text: MOOD_PROMPT }
          ]}
        ]
      });

      const mood = response.text || "Uncertain vibe";
      setCurrentMood(mood);
      
      // Tell the DJ about the mood
      const djResponse = await ai.models.generateContent({
        model: AI_MODEL,
        contents: [
          { role: 'user', parts: [{ text: `[SYSTEM: USER MOOD DETECTED: ${mood}] Respond to this new mood vibe visually.` }] }
        ],
        config: { systemInstruction: DJ_SYSTEM_PROMPT }
      });

      if (djResponse.text) {
        setMessages(prev => [...prev, { role: 'dj', content: djResponse.text! }]);
      }
      
      // Auto-get recommendations based on mood if connected
      if (tokens) {
        getRecommendations(mood);
      }

    } catch (err: any) {
      if (err?.status === 429 || err?.message?.includes("quota") || err?.message?.includes("429")) {
        setMessages(prev => [...prev, { role: 'dj', content: "Whoa, hold up! My AI circuits are running too hot (Rate Limit Exceeded). Give me a minute to cool off before we drop the next beat in this mood analysis!"}]);
      } else {
        console.error('Mood analysis error:', err);
      }
    } finally {
      setIsAnalyzing(false);
    }
  };

  const getRecommendations = async (moodOrQuery: string, isQuery: boolean = false) => {
    if (!tokens) return;
    setIsLoading(true);
    try {
      // 1. Ask Gemini for 5 song ideas based on mood or direct user query
      const prompt = isQuery 
        ? `The user wants music fitting this request: "${moodOrQuery}". Suggest 5 real, popular original songs that perfectly match this intent. Avoid remixes unless specifically requested. Return a JSON array of objects with "track" and "artist" properties. Example: [{"track": "Stronger", "artist": "Kanye West"}]`
        : `Based on this mood: "${moodOrQuery}", suggest 5 real, popular original songs that fit. Return a JSON array of objects with "track" and "artist" properties. Example: [{"track": "Bohemian Rhapsody", "artist": "Queen"}]`;
      
      const searchResponse = await ai.models.generateContent({
        model: AI_MODEL,
        contents: [{ text: prompt }]
      });

      let songs: { track: string; artist: string }[] = [];
      try {
        const text = searchResponse.text || '';
        const jsonMatch = text.match(/\[.*\]/s);
        if (jsonMatch) {
          songs = JSON.parse(jsonMatch[0]);
        }
      } catch (e) {
        console.error("Failed to parse Gemini JSON", e);
      }
      
      // 2. Search Spotify for these songs
      const trackResults: Track[] = [];
      for (const song of songs.slice(0, 5)) {
        // Use advanced searching to get precise original tracks
        const query = encodeURIComponent(`track:${song.track} artist:${song.artist}`);
        const res = await fetch(`https://api.spotify.com/v1/search?q=${query}&type=track&limit=1`, {
          headers: { Authorization: `Bearer ${tokens.access_token}` }
        });
        const data = await res.json();
        if (data.tracks?.items?.length) {
          trackResults.push(data.tracks.items[0]);
        }
      }
      if (trackResults.length > 0) {
        setRecommendations(trackResults);
        // Automatically set the first one as active
        setActiveTrack(trackResults[0]);
        // Play all tracks immediately
        playTracksOnSpotify(trackResults);
      }
    } catch (err: any) {
      if (err?.status === 429 || err?.message?.includes("quota") || err?.message?.includes("429")) {
        setMessages(prev => [...prev, { role: 'dj', content: "Sorry homie, I'm getting too many requests to find tracks right now (Rate Limit). Let the current track play out and hit me again in a minute!" }]);
      } else {
        console.error('Recommendation error:', err);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const playTracksOnSpotify = async (tracks: Track[]) => {
    if (!tokens || tracks.length === 0) return;
    try {
      const uris = tracks.map(t => t.uri);
      const res = await fetch(`https://api.spotify.com/v1/me/player/play`, {
        method: 'PUT',
        headers: { 
          Authorization: `Bearer ${tokens.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ uris })
      });
      
      if (res.ok || res.status === 204) {
        const trackNames = tracks.slice(0, 3).map(t => t.name).join(', ') + (tracks.length > 3 ? ' and more' : '');
        const reply = `I've started playing your tracks on Spotify! (${trackNames})`;
        setMessages(prev => [...prev, { role: 'dj', content: reply }]);
        speakText(reply);
      } else {
        const lastErrorStatus = res.status;
        if (lastErrorStatus === 404) {
          const reply = `I tried to play the tracks directly on your Spotify, but you need to have Spotify open and playing on a device first!`;
          setMessages(prev => [...prev, { role: 'dj', content: reply }]);
          speakText(reply);
        } else {
          try {
            const errorData = await res.json();
            console.error('Play error:', errorData);
          } catch(e) {}
        }
      }
    } catch (err) {
      console.error('Failed to play tracks', err);
    }
  };

  const handleSendMessage = async (overrideMsg?: string, detectedMood?: string) => {
    const userMsg = overrideMsg || input.trim();
    if (!userMsg || isLoading) {
       globalResumeMic?.();
       return;
    }

    if (!overrideMsg) setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setIsLoading(true);

    try {
      // Check for Jam or Playlist links
      if (userMsg.includes('spotify.link') || userMsg.includes('spotify.com')) {
        const reply = `Oh, a Spotify link! 🎵 If that's your Jam session, just ask me for a track and I'll add it directly to your queue. Everyone in the Jam will hear it!`;
        setMessages(prev => [...prev, { role: 'dj', content: reply }]);
        speakText(reply);
        setIsLoading(false);
        return;
      }

      // Check if user is asking for music
      const intentResponse = await ai.models.generateContent({
        model: AI_MODEL,
        contents: [{ text: `Analyze this user message: "${userMsg}". Is the user explicitly asking for music, a song, an artist, or a playlist? Answer only with YES or NO.` }]
      });

      const isMusicRequest = intentResponse.text?.trim().toUpperCase().includes('YES');

      const chatHistory = messages.map(m => ({
        role: m.role === 'dj' ? 'model' : 'user',
        parts: [{ text: m.content }]
      }));

      const chat = ai.chats.create({
        model: AI_MODEL,
        config: { systemInstruction: DJ_SYSTEM_PROMPT },
        history: chatHistory
      });

      const actualMood = detectedMood || currentMood;
      const finalMsg = actualMood ? `[Current Mood: ${actualMood}] ${userMsg}` : userMsg;

      const result = await chat.sendMessage({
        message: finalMsg
      });

      const reply = result.text || "My digital brain just glitched. Check your connection, homie.";
      setMessages(prev => [...prev, { role: 'dj', content: reply }]);
      speakText(reply);

      if (isMusicRequest && tokens) {
        getRecommendations(userMsg, true);
      }
    } catch (err: any) {
      if (err?.status === 429 || err?.message?.includes("quota") || err?.message?.includes("429")) {
        const rateLimitReply = "My brain is fried from too many requests! Give me a minute to chill. (Rate limit exceeded)";
        setMessages(prev => [...prev, { role: 'dj', content: rateLimitReply }]);
        speakText(rateLimitReply);
      } else {
        console.error('Chat error:', err);
        globalResumeMic?.();
      }
    } finally {
      setIsLoading(false);
    }
  };

  const createPlaylist = async () => {
    if (!tokens || !userProfile || recommendations.length === 0) return;
    setIsLoading(true);
    try {
      const res = await fetch('/api/spotify/create-playlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accessToken: tokens.access_token,
          userId: userProfile.id,
          name: `GrooveEye: ${currentMood || 'Daily Vibe'}`,
          description: `Curated by your AI DJ based on your current energy level: ${currentMood || 'Unknown'}`
        })
      });
      const playlist = await res.json();

      // Add tracks to playlist
      await fetch(`https://api.spotify.com/v1/playlists/${playlist.id}/tracks`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${tokens.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ uris: recommendations.map(t => t.uri) })
      });

      setMessages(prev => [...prev, { role: 'dj', content: `Boom! Your "${playlist.name}" playlist is live on Spotify. Go give it a spin!` }]);
    } catch (err) {
      console.error('Playlist creation error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Setup Camera
  useEffect(() => {
    async function setupCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err) {
        console.error("Camera access denied", err);
      }
    }
    setupCamera();
  }, []);

  return (
    <div className="min-h-screen bg-[#0a0a0c] text-neutral-100 font-sans selection:bg-cyan-500/30">
      {/* Background Ambience */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-cyan-600/10 blur-[120px] rounded-full animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-600/10 blur-[120px] rounded-full animate-pulse delay-1000" />
      </div>

      <header className="relative z-10 border-b border-neutral-800 bg-[#0a0a0c]/80 backdrop-blur-md px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-cyan-500/10 rounded-lg border border-cyan-500/20">
              <Disc className="w-6 h-6 text-cyan-400 animate-spin-slow" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
                GrooveEye DJ
              </h1>
              <p className="text-[10px] uppercase tracking-widest text-neutral-500 font-mono">AI Pulse Engine 1.0</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {!tokens ? (
              <button 
                onClick={startSpotifyAuth}
                className="group flex items-center gap-2 px-4 py-2 bg-[#1DB954] hover:bg-[#1ed760] text-black font-semibold rounded-full transition-all active:scale-95"
              >
                <Music className="w-4 h-4" />
                <span>Connect Spotify</span>
              </button>
            ) : (
              <div className="flex items-center gap-3 bg-neutral-900/50 p-1 pr-4 rounded-full border border-neutral-800">
                {userProfile?.images?.[0] ? (
                  <img src={userProfile.images[0].url} alt={userProfile.display_name} className="w-8 h-8 rounded-full border border-neutral-700" referrerPolicy="no-referrer" />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-neutral-800 flex items-center justify-center">
                    <Music className="w-4 h-4 text-neutral-400" />
                  </div>
                )}
                <span className="text-sm font-medium">{userProfile?.display_name || 'Logged in'}</span>
                <button onClick={() => setTokens(null)} className="p-1 hover:text-red-400 transition-colors">
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="relative z-10 max-w-7xl mx-auto p-6 grid grid-cols-1 lg:grid-cols-12 gap-8 h-[calc(100vh-100px)]">
        {/* Left Column: Visualiser & Recommendations */}
        <div className="lg:col-span-4 flex flex-col gap-6 overflow-hidden">
          {/* Webcam / Mood Monitor */}
          <div className="relative bg-neutral-900/40 rounded-2xl border border-neutral-800 overflow-hidden aspect-video group shrink-0">
            <video 
              ref={videoRef} 
              autoPlay 
              muted 
              playsInline 
              className="w-full h-full object-cover opacity-60 grayscale group-hover:grayscale-0 group-hover:opacity-100 transition-all duration-700"
            />
            <canvas ref={canvasRef} className="hidden" />
            
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent pointer-events-none" />
            
            <div className="absolute top-4 left-4 flex items-center gap-2 bg-black/40 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10">
              <div className={`w-1.5 h-1.5 rounded-full ${isAnalyzing ? 'bg-red-500 animate-ping' : 'bg-green-500'}`} />
              <span className="text-[10px] font-mono uppercase tracking-wider">Mood Sensor</span>
            </div>

            <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between">
              <div className="space-y-0.5">
                <p className="text-[10px] text-neutral-400 uppercase tracking-widest font-semibold">Detected Vibe</p>
                <p className="text-sm font-medium text-cyan-400 truncate max-w-[200px]">
                  {currentMood || (isAnalyzing ? "Scanning soul..." : "Waiting for heartbeat...")}
                </p>
              </div>
              <button 
                onClick={analyzeMood}
                disabled={isAnalyzing}
                className="p-3 bg-white/10 hover:bg-white text-white hover:text-black rounded-lg backdrop-blur-md transition-all active:scale-90 disabled:opacity-50"
              >
                <Camera className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Recommendations Area */}
          <div className="flex-1 bg-neutral-900/40 rounded-2xl border border-neutral-800 p-6 flex flex-col overflow-hidden min-h-0">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <LayoutGrid className="w-4 h-4 text-purple-400" />
                <h3 className="font-semibold text-sm uppercase tracking-wider text-neutral-400">Mood Mix</h3>
              </div>
              {recommendations.length > 0 && (
                <button 
                  onClick={createPlaylist}
                  disabled={isLoading}
                  className="text-[10px] uppercase font-bold tracking-widest text-cyan-400 hover:text-cyan-300 transition-colors flex items-center gap-1"
                >
                  <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
                  Build Playlist
                </button>
              )}
            </div>

            <div className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar">
              {recommendations.length > 0 ? (
                recommendations.map((track, idx) => (
                  <motion.div 
                    key={track.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.1 }}
                    className={`flex items-center gap-4 p-3 rounded-xl border transition-all cursor-pointer group ${
                      activeTrack?.id === track.id 
                        ? 'bg-cyan-500/10 border-cyan-500/50 shelf-glow' 
                        : 'bg-white/[0.03] hover:bg-white/[0.08] border-white/[0.02] hover:border-white/10'
                    }`}
                    onClick={() => setActiveTrack(track)}
                  >
                    <div className="relative w-12 h-12 rounded-lg overflow-hidden shrink-0">
                      <img src={track.album.images[0].url} alt={track.album.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      <div className={`absolute inset-0 bg-black/40 flex items-center justify-center transition-opacity ${
                        activeTrack?.id === track.id ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                      }`}>
                        {activeTrack?.id === track.id ? (
                          <div className="flex gap-0.5 items-end h-3">
                            <div className="w-1 bg-cyan-400 animate-[music-bar_0.8s_ease-in-out_infinite]" />
                            <div className="w-1 bg-cyan-400 animate-[music-bar_1.2s_ease-in-out_infinite]" />
                            <div className="w-1 bg-cyan-400 animate-[music-bar_0.6s_ease-in-out_infinite]" />
                          </div>
                        ) : (
                          <Volume2 className="w-4 h-4 text-white" />
                        )}
                      </div>
                    </div>
                    <div className="min-w-0 flex-1">
                      <h4 className="text-sm font-medium truncate leading-tight">{track.name}</h4>
                      <p className="text-xs text-neutral-500 truncate">{track.artists.map(a => a.name).join(', ')}</p>
                    </div>
                    <button className="text-neutral-600 hover:text-pink-500 transition-colors">
                      <Heart className="w-4 h-4" />
                    </button>
                  </motion.div>
                ))
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-center p-8 opacity-40">
                  <Disc className="w-12 h-12 mb-4 animate-spin-slow" />
                  <p className="text-sm">Connect your Spotify and hit the camera to get your vibe-checked tracks.</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: DJ Chat */}
        <div className="lg:col-span-8 bg-neutral-900/40 rounded-2xl border border-neutral-800 flex flex-col overflow-hidden relative">
          {/* Chat Header */}
          <div className="p-4 border-b border-neutral-800 bg-neutral-900/20 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-cyan-500 to-purple-500 p-0.5">
                  <div className="w-full h-full rounded-full bg-[#0a0a0c] flex items-center justify-center overflow-hidden">
                    <Mic2 className="w-5 h-5 text-neutral-100" />
                  </div>
                </div>
                <div className={`absolute bottom-0 right-0 w-3 h-3 ${isListening ? 'bg-red-500 animate-pulse' : 'bg-green-500'} border-2 border-[#0a0a0c] rounded-full`} />
              </div>
              <div>
                <p className="text-sm font-bold">GrooveEye</p>
                <p className={`text-[10px] font-medium uppercase tracking-widest ${isListening ? 'text-red-500' : 'text-green-500'}`}>
                  {isListening ? 'Listening (Say "Hey Groove")' : 'On Air'}
                </p>
              </div>
            </div>
            <button
               onClick={toggleListening}
               className={`px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest transition-all ${isListening ? 'bg-red-500/10 text-red-400 border border-red-500/40 hover:bg-red-500/20' : 'bg-neutral-800 text-neutral-400 border border-neutral-700 hover:bg-neutral-700 hover:text-white'}`}
            >
               {isListening ? 'Stop Mic' : 'Start Mic Voice'}
            </button>
          </div>

          {/* Player / Active Track */}
          {activeTrack && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-neutral-900/60 rounded-2xl border border-cyan-500/30 overflow-hidden"
            >
              <iframe 
                src={`https://open.spotify.com/embed/track/${activeTrack.id}`}
                width="100%" 
                height="80" 
                frameBorder="0" 
                allowTransparency={true} 
                allow="encrypted-media"
                className="opacity-90"
              />
            </motion.div>
          )}

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
            {messages.map((msg, idx) => (
              <motion.div 
                key={idx}
                initial={{ opacity: 0, x: msg.role === 'dj' ? -20 : 20 }}
                animate={{ opacity: 1, x: 0 }}
                className={`flex ${msg.role === 'dj' ? 'justify-start' : 'justify-end'}`}
              >
                <div className={`max-w-[80%] ${
                  msg.role === 'dj' 
                    ? 'bg-neutral-800/40 border border-neutral-700/50 rounded-2xl rounded-tl-none' 
                    : 'bg-cyan-600/20 border border-cyan-500/30 rounded-2xl rounded-tr-none'
                } p-4 shadow-xl`}>
                  <div className="markdown-body text-sm leading-relaxed text-neutral-200 prose prose-invert max-w-none">
                    <ReactMarkdown>{msg.content}</ReactMarkdown>
                  </div>
                </div>
              </motion.div>
            ))}
            <div ref={chatEndRef} />
          </div>

          {/* Input Area */}
          <div className="p-6 pt-0 bg-gradient-to-t from-neutral-900/60 to-transparent">
            <div className="relative group">
              <input 
                type="text" 
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                placeholder="Talk to the DJ..."
                disabled={isLoading}
                className="w-full bg-[#121214] border border-neutral-800 focus:border-cyan-500/50 rounded-2xl pl-6 pr-14 py-4 text-sm transition-all outline-none focus:ring-4 focus:ring-cyan-500/10 placeholder:text-neutral-600"
              />
              <button 
                onClick={() => handleSendMessage()}
                disabled={!input.trim() || isLoading}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-2.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-cyan-400 rounded-xl transition-all active:scale-95 disabled:opacity-40"
              >
                {isLoading ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>
      </main>

      <style>{`
        @keyframes music-bar {
          0%, 100% { height: 4px; }
          50% { height: 12px; }
        }
        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-spin-slow {
          animation: spin-slow 12s linear infinite;
        }
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #262626;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #333333;
        }
      `}</style>
    </div>
  );
}
