import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, PhoneOff, Activity, Bot, ShieldAlert, Sparkles, Loader2, RefreshCw, Volume2, Clock } from 'lucide-react';

export default function OpenAIRealtimeAgent() {
  const [isConnecting, setIsConnecting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [error, setError] = useState(null);
  const [duration, setDuration] = useState(0);
  
  const [logs, setLogs] = useState([{ type: 'system', text: 'Ready to connect to OpenAI WebRTC Realtime API.' }]);
  const [audioLevel, setAudioLevel] = useState(0);

  const pcRef = useRef(null);
  const dcRef = useRef(null);
  const localStreamRef = useRef(null);
  const audioElementRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const animationFrameRef = useRef(null);
  const timerRef = useRef(null);

  useEffect(() => {
    // Hidden audio element for remote AI voice playback
    const audioEl = document.createElement('audio');
    audioEl.autoplay = true;
    audioElementRef.current = audioEl;

    return () => {
      stopConnection();
      audioEl.remove();
    };
  }, []);

  // Call timer logic
  useEffect(() => {
    if (isConnected) {
      setDuration(0);
      timerRef.current = setInterval(() => {
        setDuration(prev => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isConnected]);

  const formatDuration = (secs) => {
    const mins = Math.floor(secs / 60);
    const remainingSecs = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${remainingSecs.toString().padStart(2, '0')}`;
  };

  const addLog = (type, text) => {
    setLogs(prev => [...prev, { type, text }]);
  };

  const toggleMute = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = isMuted; // Toggle track state
        setIsMuted(!isMuted);
        addLog('system', !isMuted ? 'Microphone muted.' : 'Microphone unmuted.');
      }
    }
  };

  const startConnection = async () => {
    setIsConnecting(true);
    setError(null);
    setIsMuted(false);
    addLog('system', 'Initializing WebRTC connection...');

    try {
      // 1. Fetch the Ephemeral WebRTC Token from backend
      addLog('system', 'Requesting Ephemeral Token from backend...');
      const tokenResponse = await fetch('/api/openai-rtc-token');
      if (!tokenResponse.ok) {
        throw new Error(`Failed to get token: ${await tokenResponse.text()}`);
      }
      const data = await tokenResponse.json();
      const EPHEMERAL_KEY = data.client_secret;
      
      if (!EPHEMERAL_KEY) {
        throw new Error("Backend did not return a valid client_secret (Check your OPENAI_API_KEY).");
      }

      addLog('system', 'Received Ephemeral Token. Creating Peer Connection...');

      // 2. Create WebRTC Peer Connection
      const pc = new RTCPeerConnection();
      pcRef.current = pc;

      // Handle connection state changes
      pc.onconnectionstatechange = () => {
        addLog('system', `WebRTC state: ${pc.connectionState}`);
        if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
          setError('WebRTC Connection Lost. Please click Reconnect.');
        }
      };

      // Attach remote stream
      pc.ontrack = e => {
        if (audioElementRef.current) {
          audioElementRef.current.srcObject = e.streams[0];
          addLog('system', 'Remote AI Voice stream attached.');
        }
      };

      // 3. Capture Microphone Track
      const ms = await navigator.mediaDevices.getUserMedia({ audio: true });
      localStreamRef.current = ms;
      pc.addTrack(ms.getTracks()[0]);

      // Set up audio visualizer
      setupAudioVisualizer(ms);

      // 4. Data Channel setup
      const dc = pc.createDataChannel('oai-events');
      dcRef.current = dc;

      dc.onmessage = (e) => {
        try {
          const event = JSON.parse(e.data);
          if (event.type === 'response.audio_transcript.done') {
             addLog('ai', event.transcript);
          } else if (event.type === 'conversation.item.input_audio_transcription.completed') {
             addLog('user', event.transcript);
          }
        } catch (err) {
          console.error("Data Channel JSON parse error", err);
        }
      };

      // 5. Create SDP Offer
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      // 6. Post SDP Offer to OpenAI
      const baseUrl = 'https://api.openai.com/v1/realtime';
      const model = 'gpt-4o-realtime-preview-2024-12-17';
      
      addLog('system', 'Sending SDP offer to OpenAI Realtime Edge...');
      
      const sdpResponse = await fetch(`${baseUrl}?model=${model}`, {
        method: 'POST',
        body: offer.sdp,
        headers: {
          Authorization: `Bearer ${EPHEMERAL_KEY}`,
          'Content-Type': 'application/sdp'
        }
      });

      if (!sdpResponse.ok) {
        throw new Error(`OpenAI SDP Error: ${await sdpResponse.text()}`);
      }

      const answer = {
        type: 'answer',
        sdp: await sdpResponse.text(),
      };

      await pc.setRemoteDescription(answer);

      setIsConnected(true);
      addLog('system', 'WebRTC Link Established! You are now live on the call.');

    } catch (err) {
      console.error('Connection failure:', err);
      setError(err.message);
      stopConnection();
    } finally {
      setIsConnecting(false);
    }
  };

  const setupAudioVisualizer = (stream) => {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    audioContextRef.current = audioContext;
    const analyser = audioContext.createAnalyser();
    analyserRef.current = analyser;
    
    const source = audioContext.createMediaStreamSource(stream);
    source.connect(analyser);
    analyser.fftSize = 128;
    
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    
    const updateAudioLevel = () => {
      if (!analyserRef.current) return;
      analyserRef.current.getByteFrequencyData(dataArray);
      let sum = 0;
      for (let i = 0; i < bufferLength; i++) {
        sum += dataArray[i];
      }
      const average = sum / bufferLength;
      setAudioLevel(average);
      animationFrameRef.current = requestAnimationFrame(updateAudioLevel);
    };
    
    updateAudioLevel();
  };

  const stopConnection = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
      localStreamRef.current = null;
    }
    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }
    if (dcRef.current) {
      dcRef.current.close();
      dcRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    
    setAudioLevel(0);
    setIsConnected(false);
    setIsConnecting(false);
    setIsMuted(false);
    addLog('system', 'Call ended.');
  };

  const handleReconnect = () => {
    stopConnection();
    setTimeout(() => {
      startConnection();
    }, 500);
  };

  return (
    <div className="max-w-4xl mx-auto h-[85vh] flex flex-col bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl">
      {/* Header */}
      <div className="bg-slate-950/90 p-5 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-indigo-500/10 rounded-full flex items-center justify-center border border-indigo-500/20">
            <Sparkles className="w-6 h-6 text-indigo-400" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              Call AI Doctor
              <span className="px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-400 text-[10px] font-bold uppercase tracking-wider">WebRTC Voice</span>
            </h2>
            <p className="text-sm text-slate-400 flex items-center gap-2 mt-0.5">
              <Clock className="w-4 h-4 text-slate-400" />
              <span>Duration: <strong className="font-mono text-slate-200">{formatDuration(duration)}</strong></span>
            </p>
          </div>
        </div>
        
        {/* Connection & Mic Status */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-900 border border-slate-800 text-xs">
            <span className={`w-2.5 h-2.5 rounded-full ${isConnected ? 'bg-emerald-500 animate-ping' : 'bg-slate-600'}`}></span>
            <span className="font-bold text-slate-300">
              {isConnected ? 'LIVE' : 'OFFLINE'}
            </span>
          </div>

          {isConnected && (
            <div className={`px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 border ${
              isMuted ? 'bg-amber-500/10 text-amber-400 border-amber-500/30' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
            }`}>
              {isMuted ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
              <span>{isMuted ? 'MUTED' : 'MIC ACTIVE'}</span>
            </div>
          )}
        </div>
      </div>

      {/* Medical Safety Disclaimer */}
      <div className="bg-amber-500/10 border-b border-amber-500/20 p-3 px-6 flex items-start gap-3">
        <ShieldAlert className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
        <p className="text-xs text-amber-200/90 leading-relaxed font-medium">
          <strong>Medical Notice:</strong> This AI assistant provides informational guidance only and is not a licensed doctor. In case of emergency (chest pain, shortness of breath, severe bleeding), call 911 immediately.
        </p>
      </div>

      {/* Main Visualizer Area */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 relative overflow-hidden bg-gradient-to-b from-slate-950/40 via-slate-900 to-slate-950">
        
        <div className="relative flex items-center justify-center w-64 h-64">
          {isConnected && !isMuted && (
            <>
              <div 
                className="absolute inset-0 rounded-full bg-indigo-500/10 transition-all duration-75"
                style={{ transform: `scale(${1 + (audioLevel / 128) * 0.4})` }}
              ></div>
              <div 
                className="absolute inset-4 rounded-full bg-indigo-500/20 transition-all duration-75"
                style={{ transform: `scale(${1 + (audioLevel / 128) * 0.8})` }}
              ></div>
            </>
          )}
          
          <div className={`relative w-36 h-36 rounded-full bg-slate-800 border-4 flex items-center justify-center shadow-2xl z-10 overflow-hidden transition-all ${
            isConnected ? (isMuted ? 'border-amber-500' : 'border-emerald-500') : 'border-slate-700'
          }`}>
            <Bot className={`w-16 h-16 ${isConnected ? (isMuted ? 'text-amber-400' : 'text-emerald-400') : 'text-slate-500'}`} />
          </div>
        </div>

        {error && (
          <div className="mt-4 p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl text-rose-400 text-xs font-mono max-w-lg text-center">
            {error}
          </div>
        )}
      </div>

      {/* Live Transcript Conversation Feed */}
      <div className="h-52 bg-slate-950 border-t border-slate-800 overflow-y-auto p-4 space-y-3 font-sans text-xs">
        {logs.map((log, idx) => (
          <div key={idx} className={`p-3 rounded-2xl max-w-[85%] ${
            log.type === 'user' 
              ? 'bg-indigo-600 text-white ml-auto rounded-tr-sm' 
              : log.type === 'ai' 
              ? 'bg-slate-800 text-slate-200 border border-slate-700 rounded-tl-sm' 
              : 'bg-slate-900/60 text-slate-400 border border-slate-800/80 font-mono text-[11px] mx-auto text-center'
          }`}>
            {log.type === 'user' && <strong className="block text-[10px] opacity-75 uppercase mb-1">Patient (You)</strong>}
            {log.type === 'ai' && <strong className="block text-[10px] text-emerald-400 uppercase mb-1">AI Doctor</strong>}
            <p className="leading-relaxed">{log.text}</p>
          </div>
        ))}
      </div>

      {/* Controls Bar */}
      <div className="p-5 bg-slate-900 border-t border-slate-800 flex items-center justify-center gap-4">
        {!isConnected && !isConnecting && (
          <button
            onClick={startConnection}
            className="flex items-center gap-2 px-8 py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-full font-bold shadow-lg shadow-indigo-500/30 transition-all hover:scale-105 cursor-pointer"
          >
            <Mic className="w-5 h-5" />
            Call AI Doctor
          </button>
        )}

        {isConnecting && (
          <button
            disabled
            className="flex items-center gap-2 px-8 py-4 bg-slate-800 text-slate-400 rounded-full font-bold cursor-not-allowed"
          >
            <Loader2 className="w-5 h-5 animate-spin" />
            Connecting Call...
          </button>
        )}

        {isConnected && (
          <>
            {/* Mute/Unmute Button */}
            <button
              onClick={toggleMute}
              className={`p-4 rounded-full font-bold transition-all cursor-pointer shadow-md ${
                isMuted 
                  ? 'bg-amber-500 hover:bg-amber-400 text-slate-950' 
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
              }`}
              title={isMuted ? "Unmute Microphone" : "Mute Microphone"}
            >
              {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
            </button>

            {/* Reconnect Button */}
            <button
              onClick={handleReconnect}
              className="p-4 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-full font-bold transition-all cursor-pointer shadow-md"
              title="Reconnect Call"
            >
              <RefreshCw className="w-5 h-5" />
            </button>

            {/* End Call Button */}
            <button
              onClick={stopConnection}
              className="flex items-center gap-2 px-8 py-4 bg-rose-600 hover:bg-rose-500 text-white rounded-full font-bold shadow-lg shadow-rose-500/30 transition-all hover:scale-105 cursor-pointer"
            >
              <PhoneOff className="w-5 h-5" />
              End Call
            </button>
          </>
        )}
      </div>
    </div>
  );
}
