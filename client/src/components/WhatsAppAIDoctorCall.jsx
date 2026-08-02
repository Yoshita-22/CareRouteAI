import React, { useState, useEffect, useRef } from 'react';
import {
  PhoneCall,
  PhoneOff,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Upload,
  Sparkles,
  ShieldAlert,
  AlertTriangle,
  Globe,
  Clock,
  Radio,
  Send,
  User,
  Activity,
  FileText,
  Calendar,
  Zap,
  CheckCircle2,
  X,
  Stethoscope,
  ChevronRight,
  RefreshCw
} from 'lucide-react';

// Preset AI Doctor Profiles
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

// Language Options
const LANGUAGES = [
  { code: 'en-US', name: 'English (US)', label: 'English', flag: '🇺🇸' },
  { code: 'te-IN', name: 'Telugu (తెలుగు)', label: 'తెలుగు', flag: '🇮🇳' },
  { code: 'hi-IN', name: 'Hindi (हिंदी)', label: 'हिंदी', flag: '🇮🇳' }
];

export default function WhatsAppAIDoctorCall({ onNavigateToHospitalRanker }) {
  // Call States: 'idle' | 'calling' | 'connected' | 'ended'
  const [callState, setCallState] = useState('idle');
  const [selectedDoctor, setSelectedDoctor] = useState(DOCTOR_AVATARS[0]);
  const [selectedLang, setSelectedLang] = useState(LANGUAGES[0]);

  // Audio Controls & Duration
  const [isMicMuted, setIsMicMuted] = useState(false);
  const [isSpeakerMuted, setIsSpeakerMuted] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [callSeconds, setCallSeconds] = useState(0);

  // Live Captions & Transcripts
  const [liveTranscript, setLiveTranscript] = useState('');
  const [userInput, setUserInput] = useState('');
  const [uploadedPhoto, setUploadedPhoto] = useState(null);
  const [messages, setMessages] = useState([]);

  // Emergency Triage Overlay
  const [emergencyPayload, setEmergencyPayload] = useState(null);
  const [showEmergencyModal, setShowEmergencyModal] = useState(false);

  // Post-Call Clinical Summary & Timeline Modal
  const [showSummaryModal, setShowSummaryModal] = useState(false);
  const [postCallData, setPostCallData] = useState(null);
  const [reminderNote, setReminderNote] = useState('');
  const [reminderTime, setReminderTime] = useState('18:00');
  const [reminderSaved, setReminderSaved] = useState(false);

  // Refs
  const canvasRef = useRef(null);
  const speechRecognitionRef = useRef(null);
  const silenceTimerRef = useRef(null);
  const accumulatedTranscriptRef = useRef('');
  const callTimerRef = useRef(null);
  const chatBottomRef = useRef(null);

  // Timer Effect for Call Duration
  useEffect(() => {
    if (callState === 'connected') {
      callTimerRef.current = setInterval(() => {
        setCallSeconds(prev => prev + 1);
      }, 1000);
    } else {
      clearInterval(callTimerRef.current);
    }
    return () => clearInterval(callTimerRef.current);
  }, [callState]);

  // Scroll Captions to Bottom
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, liveTranscript]);

  // Canvas Dynamic Audio Waveform Visualizer
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    let animationFrameId;
    let phase = 0;

    const renderWave = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const width = canvas.width;
      const height = canvas.height;
      const centerY = height / 2;

      let amplitude = callState === 'connected' ? 20 : 5;
      let strokeColor = '#34d399'; // Emerald

      if (isListening) {
        amplitude = 30;
        strokeColor = '#38bdf8'; // Cyan
      }

      ctx.beginPath();
      ctx.lineWidth = 3;
      ctx.strokeStyle = strokeColor;

      for (let x = 0; x < width; x++) {
        const angle = (x / width) * Math.PI * 4 + phase;
        const y = centerY + Math.sin(angle) * amplitude * Math.sin((x / width) * Math.PI);
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      phase += 0.08;
      animationFrameId = requestAnimationFrame(renderWave);
    };

    renderWave();
    return () => cancelAnimationFrame(animationFrameId);
  }, [callState, isListening]);

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

    const voices = window.speechSynthesis.getVoices();
    const langPrefix = selectedLang.code.slice(0, 2);
    const isMale = selectedDoctor.gender === 'male';

    const matchVoice = voices.find(v =>
      v.lang.startsWith(langPrefix) &&
      (v.name.includes('Natural') || v.name.includes('Neural') || v.name.includes('Google')) &&
      (isMale ? v.name.includes('Male') : v.name.includes('Female'))
    ) || voices.find(v => v.lang.startsWith(langPrefix));

    if (matchVoice) utterance.voice = matchVoice;

    window.speechSynthesis.speak(utterance);
  };

  const handleBargeIn = () => {
    if ('speechSynthesis' in window && window.speechSynthesis.speaking) {
      window.speechSynthesis.cancel();
      console.log('⚡ Barge-in: Interrupting AI Doctor voice.');
    }
  };

  // ═══════════════════════════════════════════════════════════════
  //  CONTINUOUS SPEECH RECOGNITION (STT)
  // ═══════════════════════════════════════════════════════════════

  const startListening = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    try { speechRecognitionRef.current?.stop(); } catch (e) {}

    accumulatedTranscriptRef.current = '';
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = selectedLang.code;

    recognition.onstart = () => setIsListening(true);

    recognition.onresult = (event) => {
      let interim = '';
      let final = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) final += transcript;
        else interim += transcript;
      }

      if (final || interim.length > 2) handleBargeIn();

      if (final) {
        accumulatedTranscriptRef.current += (accumulatedTranscriptRef.current ? ' ' : '') + final;
      }

      const currentDisplay = accumulatedTranscriptRef.current + (interim ? (accumulatedTranscriptRef.current ? ' ' : '') + interim : '');
      setLiveTranscript(currentDisplay);
      setUserInput(currentDisplay);

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

    recognition.onerror = () => setIsListening(false);

    recognition.onend = () => {
      setIsListening(false);
      if (callState === 'connected' && !isMicMuted) {
        setTimeout(() => {
          try { recognition.start(); } catch (e) {}
        }, 200);
      }
    };

    speechRecognitionRef.current = recognition;
    try { recognition.start(); } catch (e) {}
  };

  const stopListening = () => {
    clearTimeout(silenceTimerRef.current);
    try { speechRecognitionRef.current?.stop(); } catch (e) {}
    setIsListening(false);
  };

  // Start Call Handler
  const handleStartCall = () => {
    setCallState('calling');
    setTimeout(() => {
      setCallState('connected');
      setCallSeconds(0);

      const initialGreeting = selectedLang.code === 'te-IN'
        ? `నమస్కారం! నేను ${selectedDoctor.name}. వాట్సాప్ AI డాక్టర్ కాల్‌కి స్వాగతం. మీ ఆరోగ్యం లేదా లక్షణాలు ఎలా ఉన్నాయో నాకు చెప్పండి.`
        : selectedLang.code === 'hi-IN'
        ? `नमस्ते! मैं ${selectedDoctor.name} हूं। व्हाट्सएप AI डॉक्टर कॉल में आपका स्वागत है। आप अपने लक्षणों के बारे में मुझे बता सकते हैं।`
        : `Hello! I am ${selectedDoctor.name}. Welcome to your WhatsApp AI Doctor Voice Call. Please tell me about your symptoms or medical concern.`;

      setMessages([
        {
          id: Date.now(),
          sender: 'doctor',
          role: 'assistant',
          text: initialGreeting,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);

      speakDoctorVoice(initialGreeting);
      startListening();
    }, 1200);
  };

  // Submit Voice / Text Turn to Clinical Reasoning API
  const handleSendMessage = async (textToSend = userInput, photo = uploadedPhoto) => {
    const query = (textToSend || '').trim();
    if (!query && !photo) return;

    handleBargeIn();

    const userMsg = {
      id: Date.now(),
      sender: 'patient',
      role: 'user',
      text: query || '[Uploaded Image for Clinical Evaluation]',
      photo: photo,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setUserInput('');
    setUploadedPhoto(null);

    try {
      const response = await fetch('/api/doctor-call/consult', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: updatedMessages.map(m => ({ role: m.role, content: m.text })),
          language: selectedLang.code,
          hasPhoto: Boolean(photo),
          photoBase64: photo,
          patientLocation: { lat: 17.4400, lng: 78.3480 }
        })
      });

      const data = await response.json();

      if (response.ok && data.status) {
        // Check for Emergency Escalation
        if (data.isEmergency) {
          setEmergencyPayload(data.emergencyDetails);
          setShowEmergencyModal(true);
        }

        const doctorMsg = {
          id: Date.now() + 1,
          sender: 'doctor',
          role: 'assistant',
          text: data.doctorReply,
          translatedEnglish: data.translatedEnglish,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };

        setMessages(prev => [...prev, doctorMsg]);
        speakDoctorVoice(data.doctorReply);
      }
    } catch (err) {
      console.error('Error during AI Doctor voice call turn:', err);
    }
  };

  // Image Upload Handler
  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setUploadedPhoto(reader.result);
        handleSendMessage('I uploaded an image of my symptom/wound for visual clinical analysis.', reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  // End Call & Generate Post-Call Summary
  const handleEndCall = async () => {
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    stopListening();
    setCallState('ended');

    // Fetch Post-Call Clinical Summary
    try {
      const res = await fetch('/api/doctor-call/summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages, language: selectedLang.code })
      });
      const data = await res.json();
      if (data.status === 'SUCCESS') {
        setPostCallData(data);
        setShowSummaryModal(true);
      }
    } catch (err) {
      console.warn('Failed to generate summary:', err);
    }
  };

  // Handover to Human Doctor / ER Ranker
  const handleTransferToHumanDoctor = () => {
    setShowEmergencyModal(false);
    setShowSummaryModal(false);
    if (onNavigateToHospitalRanker) {
      onNavigateToHospitalRanker({
        requirement_payload: {
          urgency_level: 'CRITICAL_LEVEL_1',
          detected_condition: emergencyPayload?.detected_condition || 'Emergency Medical Transfer Required',
          hard_requirements: { bed_type: 'ICU', blood_group: 'O_NEG', equipment: ['VENTILATOR'], specialist: 'TRAUMA_SURGEON' }
        },
        patient_location: { lat: 17.4400, lng: 78.3480 }
      });
    }
  };

  // Format Duration MM:SS
  const formatTime = (totalSec) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      
      {/* MEDICAL SAFETY DISCLAIMER BANNER */}
      <div className="bg-amber-950/80 border border-amber-500/40 p-3.5 rounded-2xl flex items-center justify-between text-xs text-amber-200">
        <div className="flex items-center gap-2.5">
          <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0" />
          <span>
            <strong>Medical Disclaimer:</strong> CareRoute AI Doctor provides triage assistance & health info. It does <strong>not</strong> make confirmed diagnoses. In case of life-threatening emergency, call <strong>108</strong> immediately.
          </span>
        </div>
      </div>

      {/* WHATSAPP CALL START SCREEN (IDLE) */}
      {callState === 'idle' && (
        <div className="glass-panel p-10 rounded-3xl border-2 border-emerald-500/40 bg-slate-950 text-center space-y-6 shadow-2xl flex flex-col items-center justify-center min-h-[420px]">
          
          <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-emerald-500 to-teal-400 p-1 shadow-2xl shadow-emerald-500/40 animate-pulse">
            <div className="w-full h-full bg-slate-950 rounded-full flex items-center justify-center">
              <Stethoscope className="w-10 h-10 text-emerald-400" />
            </div>
          </div>

          <div className="space-y-2 max-w-md">
            <h3 className="text-2xl sm:text-3xl font-black text-white">WhatsApp AI Doctor Voice Call</h3>
            <p className="text-xs text-slate-300">
              Start a real-time voice consultation with Dr. Evelyn Vance. Clinical symptom triage, live captions, emergency escalation, and multi-language support.
            </p>
          </div>

          {/* Doctor & Language Selector */}
          <div className="flex flex-wrap items-center justify-center gap-3">
            <div className="flex items-center gap-2 bg-slate-900 p-2 rounded-2xl border border-slate-800 text-xs">
              <Globe className="w-4 h-4 text-cyan-400" />
              <span className="text-slate-400 font-bold">Language:</span>
              <div className="flex gap-1">
                {LANGUAGES.map(lang => (
                  <button
                    key={lang.code}
                    onClick={() => setSelectedLang(lang)}
                    className={`px-3 py-1 rounded-xl text-xs font-extrabold cursor-pointer ${
                      selectedLang.code === lang.code ? 'bg-emerald-500 text-slate-950' : 'text-slate-400 bg-slate-950'
                    }`}
                  >
                    {lang.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* CALL AI DOCTOR BUTTON (WhatsApp Green CTA) */}
          <button
            onClick={handleStartCall}
            className="flex items-center gap-3 px-8 py-4 rounded-2xl font-black text-sm uppercase tracking-wider text-slate-950 bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400 hover:from-emerald-300 hover:to-cyan-300 shadow-2xl shadow-emerald-500/50 hover:scale-105 transition-all cursor-pointer border border-emerald-300"
          >
            <PhoneCall className="w-6 h-6 fill-current" />
            <span>CALL AI DOCTOR (WHATSAPP VOICE)</span>
          </button>

        </div>
      )}

      {/* CALLING STATE */}
      {callState === 'calling' && (
        <div className="glass-panel p-12 rounded-3xl border-2 border-emerald-500/50 bg-slate-950 text-center space-y-6 shadow-2xl flex flex-col items-center justify-center min-h-[420px]">
          <div className="relative">
            <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-emerald-400 shadow-2xl shadow-emerald-500/50">
              <img src={selectedDoctor.image} alt={selectedDoctor.name} className="w-full h-full object-cover" />
            </div>
            <div className="absolute inset-0 border-4 border-emerald-400 rounded-full animate-ping pointer-events-none opacity-50" />
          </div>
          <div className="space-y-1">
            <h3 className="text-2xl font-black text-white">Calling {selectedDoctor.name}...</h3>
            <p className="text-xs text-emerald-300 font-mono">Connecting WhatsApp AI Doctor Voice Stream...</p>
          </div>
        </div>
      )}

      {/* CONNECTED WHATSAPP VOICE CALL CONSOLE */}
      {(callState === 'connected' || callState === 'ended') && (
        <div className="glass-panel rounded-3xl border-2 border-emerald-500/40 bg-slate-950 overflow-hidden shadow-2xl space-y-4">
          
          {/* WHATSAPP CALL HEADER */}
          <div className="p-6 bg-gradient-to-r from-slate-900 via-emerald-950/40 to-slate-900 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            
            <div className="flex items-center gap-4">
              <div className="relative w-16 h-16 rounded-full overflow-hidden border-2 border-emerald-400 shrink-0">
                <img src={selectedDoctor.image} alt={selectedDoctor.name} className="w-full h-full object-cover" />
                <span className="absolute bottom-0 right-0 w-4 h-4 rounded-full bg-emerald-400 border-2 border-slate-950 animate-pulse" />
              </div>
              <div>
                <h3 className="text-xl font-black text-white">{selectedDoctor.name}</h3>
                <p className="text-xs text-cyan-300 font-mono">WhatsApp AI Doctor Voice Call • {selectedLang.name}</p>
                <div className="flex items-center gap-2 text-[10px] font-mono text-emerald-400 mt-0.5">
                  <Activity className="w-3 h-3 text-emerald-400 animate-pulse" /> Continuous Live Triage Active
                </div>
              </div>
            </div>

            {/* Duration Timer */}
            <div className="flex items-center gap-2 bg-slate-950 px-4 py-2 rounded-2xl border border-slate-800 text-xs font-mono text-cyan-300 self-start sm:self-auto">
              <Clock className="w-4 h-4 text-emerald-400" />
              <span className="font-black text-base">{formatTime(callSeconds)}</span>
            </div>

          </div>

          {/* AUDIO WAVEFORM & LIVE CAPTIONS DISPLAY */}
          <div className="p-6 space-y-4">
            
            {/* Waveform Canvas */}
            <div className="bg-slate-900 p-3 rounded-2xl border border-slate-800">
              <canvas ref={canvasRef} width={600} height={60} className="w-full h-14" />
            </div>

            {/* Live Captions Transcript Box */}
            <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-3 max-h-[300px] overflow-y-auto">
              <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 border-b border-slate-800 pb-2">
                <span>Live Captions & Dialogue</span>
                <span className="text-emerald-400">Speech-to-Text / TTS</span>
              </div>

              {messages.map(msg => (
                <div key={msg.id} className={`flex items-start gap-2.5 text-xs ${msg.sender === 'patient' ? 'flex-row-reverse text-right' : ''}`}>
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-[10px] shrink-0 ${
                    msg.sender === 'doctor' ? 'bg-indigo-600 text-white' : 'bg-emerald-600 text-slate-950'
                  }`}>
                    {msg.sender === 'doctor' ? 'Dr' : 'You'}
                  </div>
                  <div className={`p-3 rounded-2xl leading-relaxed max-w-lg ${
                    msg.sender === 'doctor' ? 'bg-slate-950 border border-indigo-500/30 text-slate-100' : 'bg-emerald-950 border border-emerald-500/40 text-emerald-100'
                  }`}>
                    <p>{msg.text}</p>
                    {msg.translatedEnglish && msg.translatedEnglish !== msg.text && (
                      <div className="mt-2 pt-2 border-t border-slate-800/80 text-[11px] text-cyan-300 font-mono flex items-start gap-1.5 bg-slate-900/60 p-2 rounded-xl">
                        <Globe className="w-3.5 h-3.5 text-cyan-400 shrink-0 mt-0.5" />
                        <span><strong>Translation:</strong> "{msg.translatedEnglish}"</span>
                      </div>
                    )}
                    {msg.photo && (
                      <div className="mt-2 w-40 h-28 rounded-xl overflow-hidden border border-emerald-400 relative">
                        <img src={msg.photo} alt="Clinical Upload" className="w-full h-full object-cover" />
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {liveTranscript && (
                <div className="p-2.5 rounded-xl bg-indigo-950/80 text-xs font-mono text-indigo-300 flex items-center gap-2 animate-pulse">
                  <Mic className="w-4 h-4 text-rose-400" />
                  <span>Hearing: "{liveTranscript}"</span>
                </div>
              )}

              <div ref={chatBottomRef} />
            </div>

          </div>

          {/* WHATSAPP ACTION CONTROLS BAR */}
          <div className="p-4 bg-slate-900 border-t border-slate-800 flex items-center justify-between flex-wrap gap-3">
            
            <div className="flex items-center gap-2">
              {/* Mute Mic */}
              <button
                onClick={() => setIsMicMuted(!isMicMuted)}
                className={`p-3 rounded-2xl text-xs font-bold flex items-center gap-1.5 cursor-pointer border ${
                  isMicMuted ? 'bg-rose-600 text-white' : 'bg-slate-950 text-emerald-400 border-slate-800'
                }`}
              >
                {isMicMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                <span className="hidden sm:inline">{isMicMuted ? 'Mic Muted' : 'Mic Live'}</span>
              </button>

              {/* Speaker Toggle */}
              <button
                onClick={() => setIsSpeakerMuted(!isSpeakerMuted)}
                className={`p-3 rounded-2xl text-xs font-bold flex items-center gap-1.5 cursor-pointer border ${
                  isSpeakerMuted ? 'bg-rose-600 text-white' : 'bg-slate-950 text-slate-300 border-slate-800'
                }`}
              >
                {isSpeakerMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
                <span className="hidden sm:inline">{isSpeakerMuted ? 'Muted' : 'Audio On'}</span>
              </button>

              {/* Upload Image during Call */}
              <label className="p-3 rounded-2xl bg-slate-950 hover:bg-slate-800 text-slate-300 border border-slate-800 font-bold text-xs flex items-center gap-1.5 cursor-pointer">
                <Upload className="w-4 h-4 text-emerald-400" />
                <span className="hidden sm:inline">Upload Image</span>
                <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
              </label>
            </div>

            {/* END CALL BUTTON (Red Circle) */}
            <button
              onClick={handleEndCall}
              className="px-6 py-3 rounded-2xl bg-gradient-to-r from-rose-600 to-red-700 hover:from-rose-500 hover:to-red-600 text-white font-black text-xs uppercase tracking-wider flex items-center gap-2 cursor-pointer shadow-xl shadow-rose-600/40 border border-rose-400"
            >
              <PhoneOff className="w-4.5 h-4.5 fill-current" />
              <span>END CALL</span>
            </button>

          </div>

        </div>
      )}

      {/* EMERGENCY ESCALATION OVERLAY MODAL */}
      {showEmergencyModal && emergencyPayload && (
        <div className="fixed inset-0 z-[9999] bg-slate-950/90 backdrop-blur-xl flex items-center justify-center p-4">
          <div className="glass-panel p-6 sm:p-8 rounded-3xl border-2 border-rose-500 max-w-lg w-full bg-slate-900 shadow-2xl space-y-6 animate-bounce">
            
            <div className="flex items-center gap-3 text-rose-500">
              <div className="w-12 h-12 rounded-2xl bg-rose-500/20 border border-rose-500 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-7 h-7 text-rose-500 animate-pulse" />
              </div>
              <div>
                <h3 className="text-xl font-black text-white uppercase tracking-tight">CRITICAL EMERGENCY DETECTED!</h3>
                <p className="text-xs text-rose-400 font-mono">{emergencyPayload.detected_condition}</p>
              </div>
            </div>

            <p className="text-xs text-slate-200 leading-relaxed bg-rose-950/60 p-4 rounded-2xl border border-rose-500/40">
              {emergencyPayload.recommended_action}. Please do not wait. Click below to immediately transfer to ER emergency dispatch or call 108.
            </p>

            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={handleTransferToHumanDoctor}
                className="flex-1 py-4 px-4 rounded-2xl font-black text-xs uppercase tracking-wider text-slate-950 bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400 hover:from-emerald-300 hover:to-cyan-300 shadow-xl shadow-emerald-500/40 cursor-pointer flex items-center justify-center gap-2"
              >
                <Zap className="w-4.5 h-4.5 fill-slate-950" />
                <span>TRANSFER TO ER DISPATCH & ICU</span>
              </button>

              <button
                onClick={() => setShowEmergencyModal(false)}
                className="p-4 rounded-2xl bg-slate-950 text-slate-400 hover:text-white border border-slate-800 text-xs font-bold cursor-pointer"
              >
                Close
              </button>
            </div>

          </div>
        </div>
      )}

      {/* POST-CALL CLINICAL SUMMARY & SYMPTOM TIMELINE MODAL */}
      {showSummaryModal && postCallData && (
        <div className="fixed inset-0 z-[9999] bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="glass-panel p-6 sm:p-8 rounded-3xl border-2 border-emerald-500 max-w-2xl w-full bg-slate-900 shadow-2xl space-y-6 max-h-[85vh] overflow-y-auto relative">
            
            <button onClick={() => setShowSummaryModal(false)} className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 cursor-pointer">
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-400 flex items-center justify-center">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-xl font-black text-white">Post-Call Clinical Summary & Timeline</h3>
                <p className="text-xs text-cyan-300 font-mono">Generated after WhatsApp AI Doctor Voice Consultation</p>
              </div>
            </div>

            {/* Chief Complaint */}
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-1 text-xs">
              <span className="font-extrabold text-emerald-400 uppercase tracking-wider block">Chief Complaint:</span>
              <p className="text-slate-200">{postCallData.summary?.chiefComplaint}</p>
            </div>

            {/* Symptom Timeline */}
            <div className="space-y-2">
              <h4 className="text-xs font-black uppercase text-cyan-300 tracking-wider flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-emerald-400" /> Visual Symptom Timeline:
              </h4>
              <div className="space-y-2 pl-2 border-l-2 border-slate-800">
                {postCallData.symptomTimeline?.map((item, idx) => (
                  <div key={idx} className="text-xs font-mono p-2.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                    <span className="text-emerald-400 font-bold">{item.time}</span>
                    <span className="text-slate-300">{item.event}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* General Precautions */}
            <div className="space-y-2">
              <h4 className="text-xs font-black uppercase text-emerald-400 tracking-wider">General Care Precautions:</h4>
              <ul className="space-y-1.5 text-xs text-slate-300">
                {postCallData.summary?.generalPrecautions?.map((p, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span>{p}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Follow-up Reminder Setup */}
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
              <h4 className="text-xs font-black text-white flex items-center gap-2">
                <Calendar className="w-4 h-4 text-cyan-400" /> Schedule Medication / Follow-Up Reminder
              </h4>
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  placeholder="e.g. Check temperature & take prescribed fluids"
                  value={reminderNote}
                  onChange={e => setReminderNote(e.target.value)}
                  className="flex-1 px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white"
                />
                <input
                  type="time"
                  value={reminderTime}
                  onChange={e => setReminderTime(e.target.value)}
                  className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white font-mono"
                />
                <button
                  onClick={() => setReminderSaved(true)}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs cursor-pointer"
                >
                  {reminderSaved ? '✓ Saved' : 'Set Reminder'}
                </button>
              </div>
            </div>

            {/* Handover Button */}
            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={handleTransferToHumanDoctor}
                className="flex-1 py-3.5 px-4 rounded-2xl font-black text-xs uppercase tracking-wider text-slate-950 bg-gradient-to-r from-emerald-400 to-teal-300 hover:from-emerald-300 hover:to-teal-200 shadow-xl cursor-pointer flex items-center justify-center gap-2"
              >
                <span>TRANSFER PAYLOAD TO ER HOSPITAL</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
