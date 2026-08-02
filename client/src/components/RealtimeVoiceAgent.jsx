import React, { useState, useEffect, useRef } from 'react';
import {
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Sparkles,
  RefreshCw,
  Globe,
  Radio,
  Send,
  User,
  Activity,
  ShieldCheck,
  PhoneOff,
  Archive,
  Zap,
  CheckCircle2,
  Cpu,
  MessageSquare
} from 'lucide-react';

// Language Options
const LANGUAGES = [
  { code: 'en-US', name: 'English (US)', label: 'English', flag: '🇺🇸' },
  { code: 'te-IN', name: 'Telugu (తెలుగు)', label: 'తెలుగు', flag: '🇮🇳' },
  { code: 'hi-IN', name: 'Hindi (हिंदी)', label: 'हिंदी', flag: '🇮🇳' },
  { code: 'es-ES', name: 'Spanish (Español)', label: 'Español', flag: '🇪🇸' }
];

// Preset Doctor Profiles
const DOCTOR_AVATARS = [
  {
    id: 'dr_evelyn',
    name: 'Dr. Evelyn Vance, MD',
    title: 'Senior ER Trauma Lead',
    image: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&w=800&q=80',
    gender: 'female'
  },
  {
    id: 'dr_alexander',
    name: 'Dr. Alexander Sterling, MD',
    title: 'Chief Emergency Physician',
    image: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&w=800&q=80',
    gender: 'male'
  }
];

export default function RealtimeVoiceAgent() {
  // Session & Agent State
  const [selectedDoctor, setSelectedDoctor] = useState(DOCTOR_AVATARS[0]);
  const [selectedLang, setSelectedLang] = useState(LANGUAGES[0]);
  const [agentStatus, setAgentStatus] = useState('Idle & Ready'); // 'Listening...' | 'Thinking...' | 'Speaking...' | 'Idle & Ready'
  
  // Hardware & Mute State
  const [isListening, setIsListening] = useState(false);
  const [isMicMuted, setIsMicMuted] = useState(false);
  const [isSpeakerMuted, setIsSpeakerMuted] = useState(false);
  const [isFullDuplexActive, setIsFullDuplexActive] = useState(true);

  // Live Captions & Transcripts
  const [liveTranscript, setLiveTranscript] = useState('');
  const [userInput, setUserInput] = useState('');
  const [messages, setMessages] = useState([
    {
      id: 1,
      sender: 'doctor',
      role: 'assistant',
      text: `Hello! I am ${DOCTOR_AVATARS[0].name}. I am listening continuously. You can speak to me in English, Telugu, Hindi, or Spanish. How can I help you today?`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);

  // Audio Visualization Canvas & Speech Refs
  const canvasRef = useRef(null);
  const speechRecognitionRef = useRef(null);
  const silenceTimerRef = useRef(null);
  const accumulatedTranscriptRef = useRef('');
  const fullDuplexRef = useRef(true);
  const chatBottomRef = useRef(null);
  const isDoctorSpeakingRef = useRef(false);

  // Scroll Chat to Bottom
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, liveTranscript, agentStatus]);

  // Canvas Audio Waveform Spectrum Visualizer
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    let animationFrameId;
    let phase = 0;

    const renderWaveform = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const width = canvas.width;
      const height = canvas.height;
      const centerY = height / 2;

      // Determine amplitude based on status
      let amplitude = 8;
      let strokeColor = '#38bdf8'; // Cyan default

      if (agentStatus === 'Listening...') {
        amplitude = 25;
        strokeColor = '#34d399'; // Emerald
      } else if (agentStatus === 'Speaking...') {
        amplitude = 35;
        strokeColor = '#a855f7'; // Purple/Indigo
      } else if (agentStatus === 'Thinking...') {
        amplitude = 15;
        strokeColor = '#fbbf24'; // Amber
      }

      ctx.beginPath();
      ctx.lineWidth = 3;
      ctx.strokeStyle = strokeColor;

      for (let x = 0; x < width; x++) {
        const angle = (x / width) * Math.PI * 4 + phase;
        const y = centerY + Math.sin(angle) * amplitude * Math.sin((x / width) * Math.PI);
        if (x === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }
      ctx.stroke();

      phase += 0.08;
      animationFrameId = requestAnimationFrame(renderWaveform);
    };

    renderWaveform();

    return () => cancelAnimationFrame(animationFrameId);
  }, [agentStatus]);

  // ═══════════════════════════════════════════════════════════════
  //  SPEECH SYNTHESIS (TTS) & BARGE-IN INTERRUPT ENGINE
  // ═══════════════════════════════════════════════════════════════

  const speakDoctorVoice = (text) => {
    if (!('speechSynthesis' in window) || isSpeakerMuted) return;

    const cleanText = text.replace(/[*#_~`]/g, '').trim();

    try {
      window.speechSynthesis.cancel();
      window.speechSynthesis.resume();
    } catch (e) {}

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.volume = 1.0;
    utterance.rate = 0.95;
    utterance.pitch = selectedDoctor.gender === 'male' ? 0.92 : 1.0;
    utterance.lang = selectedLang.code;

    // Pick best natural neural voice matching language
    const voices = window.speechSynthesis.getVoices();
    const langPrefix = selectedLang.code.slice(0, 2);
    const isMale = selectedDoctor.gender === 'male';

    const matchVoice = voices.find(v =>
      v.lang.startsWith(langPrefix) &&
      (v.name.includes('Natural') || v.name.includes('Neural') || v.name.includes('Google') || v.name.includes('Premium')) &&
      (isMale ? (v.name.includes('Male') || v.name.includes('David')) : (v.name.includes('Female') || v.name.includes('Zira')))
    ) || voices.find(v => v.lang.startsWith(langPrefix));

    if (matchVoice) utterance.voice = matchVoice;

    utterance.onstart = () => {
      isDoctorSpeakingRef.current = true;
      setAgentStatus('Speaking...');
    };

    utterance.onend = () => {
      isDoctorSpeakingRef.current = false;
      setAgentStatus('Listening...');
    };

    utterance.onerror = () => {
      isDoctorSpeakingRef.current = false;
      setAgentStatus('Listening...');
    };

    window.speechSynthesis.speak(utterance);
  };

  // BARGE-IN: User speech interrupts doctor TTS
  const handleBargeIn = () => {
    if ('speechSynthesis' in window && window.speechSynthesis.speaking) {
      window.speechSynthesis.cancel();
      isDoctorSpeakingRef.current = false;
      setAgentStatus('Listening...');
      console.log('⚡ Barge-in: User interrupted AI doctor speech.');
    }
  };

  // ═══════════════════════════════════════════════════════════════
  //  CONTINUOUS SPEECH RECOGNITION (STT) & SILENCE AUTO-SEND
  // ═══════════════════════════════════════════════════════════════

  const startContinuousListening = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    try { speechRecognitionRef.current?.stop(); } catch (e) {}

    fullDuplexRef.current = true;
    accumulatedTranscriptRef.current = '';

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = selectedLang.code;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setIsListening(true);
      setAgentStatus('Listening...');
    };

    recognition.onresult = (event) => {
      let interim = '';
      let final = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          final += transcript;
        } else {
          interim += transcript;
        }
      }

      // Trigger barge-in if user speaks while doctor is speaking
      if (final || interim.length > 2) {
        handleBargeIn();
      }

      if (final) {
        accumulatedTranscriptRef.current += (accumulatedTranscriptRef.current ? ' ' : '') + final;
      }

      const currentDisplay = accumulatedTranscriptRef.current + (interim ? (accumulatedTranscriptRef.current ? ' ' : '') + interim : '');
      setLiveTranscript(currentDisplay);
      setUserInput(currentDisplay);

      // Silence auto-send timer (1.2 seconds of silence)
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = setTimeout(() => {
        const textToSend = accumulatedTranscriptRef.current.trim();
        if (textToSend && textToSend.length > 1) {
          handleSendMessage(textToSend);
          accumulatedTranscriptRef.current = '';
          setLiveTranscript('');
          setUserInput('');
        }
      }, 1200);
    };

    recognition.onerror = (event) => {
      if (event.error === 'no-speech' || event.error === 'aborted') return;
      console.warn('STT Error:', event.error);
    };

    recognition.onend = () => {
      setIsListening(false);
      // Auto restart if full duplex active
      if (fullDuplexRef.current && !isMicMuted) {
        setTimeout(() => {
          try {
            if (fullDuplexRef.current) recognition.start();
          } catch (e) {
            setTimeout(() => startContinuousListening(), 500);
          }
        }, 200);
      }
    };

    speechRecognitionRef.current = recognition;
    try {
      recognition.start();
    } catch (err) {
      console.warn('Failed to start speech recognition:', err);
    }
  };

  const stopContinuousListening = () => {
    fullDuplexRef.current = false;
    clearTimeout(silenceTimerRef.current);
    try { speechRecognitionRef.current?.stop(); } catch (e) {}
    setIsListening(false);
    setLiveTranscript('');
  };

  // Auto-start continuous STT on load
  useEffect(() => {
    if (isFullDuplexActive && !isMicMuted) {
      const timer = setTimeout(() => startContinuousListening(), 800);
      return () => clearTimeout(timer);
    } else {
      stopContinuousListening();
    }
  }, [isFullDuplexActive, isMicMuted, selectedLang]);

  // ═══════════════════════════════════════════════════════════════
  //  SEND MESSAGE & LLM CONVERSATION REASONING
  // ═══════════════════════════════════════════════════════════════

  const handleSendMessage = async (textToSend = userInput) => {
    const query = (textToSend || '').trim();
    if (!query) return;

    // Interrupt any ongoing doctor audio
    handleBargeIn();

    const userMsg = {
      id: Date.now(),
      sender: 'patient',
      role: 'user',
      text: query,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setUserInput('');
    setAgentStatus('Thinking...');

    try {
      const response = await fetch('/api/voice-agent/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: updatedMessages.map(m => ({ role: m.role, content: m.text })),
          language: selectedLang.code,
          patientLocation: { lat: 17.4400, lng: 78.3480 }
        })
      });

      const data = await response.json();

      if (response.ok && data.status === 'SUCCESS') {
        const doctorMsg = {
          id: Date.now() + 1,
          sender: 'doctor',
          role: 'assistant',
          text: data.replyText,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };

        setMessages(prev => [...prev, doctorMsg]);

        // Speak Doctor Voice
        speakDoctorVoice(data.replyText);

        // Handle Goodbye
        if (data.isGoodbye) {
          setTimeout(() => stopContinuousListening(), 3000);
        }
      }
    } catch (err) {
      console.error('Error contacting Voice Agent:', err);
      const fallbackText = selectedLang.code === 'te-IN'
        ? 'నేను మీ మాటలు విన్నాను. మీ ఆరోగ్యానికి అవసరమైన సమాచారాన్ని పరిశీలిస్తున్నాను.'
        : 'I heard you clearly. I am processing your health query and preparing advice.';
      
      setMessages(prev => [...prev, {
        id: Date.now() + 1,
        sender: 'doctor',
        role: 'assistant',
        text: fallbackText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }]);
      speakDoctorVoice(fallbackText);
    }
  };

  // Reset Conversation
  const resetConversation = () => {
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    setMessages([
      {
        id: Date.now(),
        sender: 'doctor',
        role: 'assistant',
        text: `Session reset. Hello! I am ${selectedDoctor.name}. How can I assist you?`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ]);
    setAgentStatus('Idle & Ready');
    speakDoctorVoice(`Session reset. Hello! How can I assist you?`);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      
      {/* HEADER & CONTROL BAR */}
      <div className="glass-panel p-6 rounded-3xl border border-indigo-500/40 bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 shadow-2xl space-y-4">
        
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-wider bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 px-3 py-1 rounded-full flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-cyan-400" /> Real-Time Two-Way AI Voice Agent
              </span>
              <span className="text-xs text-slate-400 font-mono flex items-center gap-1">
                <Zap className="w-3.5 h-3.5 text-emerald-400" /> Low Latency & Barge-In
              </span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-2">
              Human-Like Conversational Doctor Voice AI
            </h2>
            <p className="text-xs text-slate-300 max-w-2xl">
              Continuous STT, real-time LLM reasoning, natural voice output, interruption (barge-in) handling, multi-language support (English, Telugu, Hindi, Spanish), and live captions.
            </p>
          </div>

          {/* Action Tools */}
          <div className="flex flex-wrap items-center gap-3">
            
            {/* Language Selector */}
            <div className="flex items-center gap-2 bg-slate-950 p-2 rounded-2xl border border-slate-800 text-xs">
              <Globe className="w-4 h-4 text-cyan-400 ml-1" />
              <span className="text-slate-400 font-bold">Language:</span>
              <div className="flex gap-1">
                {LANGUAGES.map((lang) => (
                  <button
                    key={lang.code}
                    onClick={() => {
                      setSelectedLang(lang);
                      speakDoctorVoice(
                        lang.code === 'te-IN'
                          ? 'తెలుగు భాషలోకి మారారు. నన్ను ఏమి అడగాలనుకుంటున్నారు?'
                          : `Switched language to ${lang.name}. How can I assist you?`
                      );
                    }}
                    className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                      selectedLang.code === lang.code
                        ? 'bg-cyan-500 text-slate-950 font-black shadow'
                        : 'text-slate-400 hover:text-white bg-slate-900'
                    }`}
                  >
                    <span>{lang.flag}</span>
                    <span>{lang.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Reset Memory */}
            <button
              onClick={resetConversation}
              className="px-4 py-2.5 rounded-2xl bg-slate-950 hover:bg-slate-900 text-slate-300 border border-slate-800 text-xs font-bold flex items-center gap-2 cursor-pointer transition-all"
            >
              <RefreshCw className="w-4 h-4 text-amber-400" />
              <span>Reset Memory</span>
            </button>
          </div>
        </div>

      </div>

      {/* MAIN TWO-WAY VOICE CONSOLE */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* LEFT: 3D AI AVATAR & AUDIO WAVEFORM VISUALIZER (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          
          <div className="glass-panel rounded-3xl border-2 border-indigo-500/40 bg-slate-950 p-5 space-y-4 shadow-2xl relative overflow-hidden flex flex-col items-center justify-between min-h-[460px]">
            
            {/* Top Status Badge */}
            <div className="w-full flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className={`w-3 h-3 rounded-full ${
                  agentStatus === 'Speaking...' ? 'bg-indigo-400 animate-ping' : agentStatus === 'Listening...' ? 'bg-emerald-400 animate-pulse' : agentStatus === 'Thinking...' ? 'bg-amber-400 animate-spin' : 'bg-slate-500'
                }`} />
                <span className="text-xs font-mono font-bold text-slate-200 uppercase tracking-wider">{agentStatus}</span>
              </div>
              <span className="text-[10px] font-mono text-cyan-300 bg-slate-900 px-3 py-1 rounded-full border border-slate-800">
                {selectedLang.name}
              </span>
            </div>

            {/* AI Avatar Frame */}
            <div className="relative w-48 h-48 sm:w-56 sm:h-56 rounded-full overflow-hidden border-4 border-indigo-500/60 shadow-2xl shadow-indigo-500/40 group">
              <img
                src={selectedDoctor.image}
                alt={selectedDoctor.name}
                className={`w-full h-full object-cover transition-all duration-300 ${
                  agentStatus === 'Speaking...' ? 'scale-110 brightness-110' : 'scale-100'
                }`}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent pointer-events-none" />
              {agentStatus === 'Speaking...' && (
                <div className="absolute inset-0 border-4 border-emerald-400 rounded-full animate-ping pointer-events-none opacity-50" />
              )}
            </div>

            {/* Doctor Bio */}
            <div className="text-center space-y-1">
              <h3 className="text-xl font-black text-white">{selectedDoctor.name}</h3>
              <p className="text-xs text-cyan-300 font-mono">{selectedDoctor.title}</p>
            </div>

            {/* Canvas Dynamic Waveform Visualizer */}
            <div className="w-full bg-slate-900/80 rounded-2xl border border-slate-800 p-2 overflow-hidden">
              <canvas ref={canvasRef} width={400} height={60} className="w-full h-14" />
            </div>

            {/* Voice Control Buttons */}
            <div className="w-full flex items-center justify-between pt-2 border-t border-slate-800">
              <button
                onClick={() => setIsMicMuted(!isMicMuted)}
                className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer transition-all border ${
                  isMicMuted ? 'bg-rose-600 text-white border-rose-400' : 'bg-slate-900 text-emerald-400 border-slate-800'
                }`}
              >
                {isMicMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                <span>{isMicMuted ? 'Mic Off' : 'Mic Live'}</span>
              </button>

              <button
                onClick={() => setIsSpeakerMuted(!isSpeakerMuted)}
                className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer transition-all border ${
                  isSpeakerMuted ? 'bg-rose-600 text-white border-rose-400' : 'bg-slate-900 text-slate-300 border-slate-800'
                }`}
              >
                {isSpeakerMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
                <span>{isSpeakerMuted ? 'Muted' : 'Audio On'}</span>
              </button>
            </div>

          </div>

        </div>

        {/* RIGHT: LIVE CAPTIONS & CONVERSATION TRANSCRIPT (7 cols) */}
        <div className="lg:col-span-7 flex flex-col space-y-4">
          
          <div className="glass-panel rounded-3xl border-2 border-indigo-500/40 bg-slate-950 flex-1 flex flex-col justify-between overflow-hidden shadow-2xl min-h-[480px]">
            
            {/* Header */}
            <div className="p-4 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <MessageSquare className="w-5 h-5 text-emerald-400" />
                <div>
                  <h3 className="text-xs font-black text-white">Live Captions & Conversation Memory</h3>
                  <p className="text-[10px] text-slate-400 font-mono">Real-time two-way dialogue with barge-in support</p>
                </div>
              </div>
              <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/80 px-2.5 py-1 rounded-full border border-emerald-500/40">
                Full-Duplex STT/TTS
              </span>
            </div>

            {/* Chat Transcript Area */}
            <div className="p-4 sm:p-6 flex-1 overflow-y-auto space-y-4 max-h-[380px]">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex items-start gap-3 ${msg.sender === 'patient' ? 'flex-row-reverse' : ''}`}
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 border ${
                    msg.sender === 'doctor' ? 'bg-indigo-600 text-white border-indigo-400' : 'bg-emerald-600 text-slate-950 border-emerald-400'
                  }`}>
                    {msg.sender === 'doctor' ? 'Dr' : <User className="w-4 h-4" />}
                  </div>

                  <div className={`max-w-lg space-y-1 ${msg.sender === 'patient' ? 'items-end text-right' : ''}`}>
                    <div className="flex items-center gap-2 px-1 text-[10px] font-bold text-slate-400">
                      <span>{msg.sender === 'doctor' ? selectedDoctor.name : 'Patient'}</span>
                      <span className="font-mono text-[9px] text-slate-500">{msg.timestamp}</span>
                    </div>

                    <div className={`p-4 rounded-2xl text-xs leading-relaxed border space-y-2 ${
                      msg.sender === 'doctor'
                        ? 'bg-slate-900 border-indigo-500/30 text-slate-100 rounded-tl-none shadow-md'
                        : 'bg-gradient-to-r from-emerald-950 to-teal-950 border-emerald-500/40 text-emerald-100 rounded-tr-none shadow-md'
                    }`}>
                      <p>{msg.text}</p>
                      {msg.sender === 'doctor' && (
                        <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
                          <button
                            onClick={() => speakDoctorVoice(msg.text)}
                            className="px-2.5 py-1 rounded-lg bg-indigo-950/80 hover:bg-indigo-900 text-indigo-300 border border-indigo-500/40 text-[10px] font-bold flex items-center gap-1.5 cursor-pointer"
                          >
                            <Volume2 className="w-3 h-3 text-cyan-400" />
                            <span>Replay Voice</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}

              {/* Live Speech Ticker Indicator */}
              {liveTranscript && (
                <div className="p-3 rounded-2xl bg-indigo-950/80 border border-indigo-500/50 text-xs text-indigo-200 font-mono flex items-center gap-2 animate-pulse">
                  <Mic className="w-4 h-4 text-rose-400 animate-pulse" />
                  <span>Hearing: "{liveTranscript}"</span>
                </div>
              )}

              <div ref={chatBottomRef} />
            </div>

            {/* Bottom Controls & Text Input Fallback */}
            <div className="p-4 bg-slate-900 border-t border-slate-800 space-y-3">
              
              {/* Voice Agent Control Pill */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsFullDuplexActive(!isFullDuplexActive)}
                  className={`flex-1 py-3 px-4 rounded-2xl font-black text-xs flex items-center justify-center gap-2 cursor-pointer transition-all border ${
                    isFullDuplexActive
                      ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white border-emerald-400 shadow-lg shadow-emerald-600/40'
                      : 'bg-slate-950 text-slate-400 border-slate-800'
                  }`}
                >
                  <Radio className="w-4 h-4" />
                  <span>{isFullDuplexActive ? '🎙️ Continuous Two-Way Voice Active (Speak Freely)' : '🎤 Click to Enable Voice Agent'}</span>
                </button>
              </div>

              {/* Text Form */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendMessage();
                }}
                className="flex items-center gap-2"
              >
                <input
                  type="text"
                  value={userInput}
                  onChange={(e) => setUserInput(e.target.value)}
                  placeholder={`Type or speak in ${selectedLang.name}...`}
                  className="flex-1 px-4 py-3 rounded-2xl bg-slate-950 border border-slate-800 text-white text-xs placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
                <button
                  type="submit"
                  disabled={!userInput.trim()}
                  className="px-5 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer transition-all"
                >
                  <span>Send</span>
                  <Send className="w-3.5 h-3.5" />
                </button>
              </form>

            </div>

          </div>

        </div>

      </div>

    </div>
  );
}
