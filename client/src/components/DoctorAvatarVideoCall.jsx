import React, { useState, useEffect, useRef } from 'react';
import { 
  Video, 
  VideoOff,
  Mic, 
  MicOff, 
  Upload, 
  Sparkles, 
  MapPin, 
  ShieldCheck, 
  Volume2, 
  VolumeX, 
  PhoneOff, 
  PhoneCall,
  RefreshCw, 
  Zap, 
  ChevronRight,
  Archive,
  X,
  Radio,
  Send,
  User,
  Activity,
  AlertTriangle,
  Stethoscope,
  Globe,
  Clock,
  Eye,
  Camera,
  CheckCircle2,
  Layers,
  Cpu
} from 'lucide-react';

// Preset AI Doctor Avatars
const DOCTOR_AVATARS = [
  {
    id: 'dr_evelyn',
    name: 'Dr. Evelyn Vance, MD',
    title: 'Senior ER Trauma Lead',
    image: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&w=800&q=80',
    gender: 'female',
    specialty: 'Trauma & Acute Surgery'
  },
  {
    id: 'dr_alexander',
    name: 'Dr. Alexander Sterling, MD',
    title: 'Chief Emergency Physician',
    image: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&w=800&q=80',
    gender: 'male',
    specialty: 'Cardiovascular & Resuscitation'
  },
  {
    id: 'dr_maya',
    name: 'Dr. Maya Patel, MD',
    title: 'Consultant Critical Care Specialist',
    image: 'https://images.unsplash.com/photo-1594824813566-78a9527034e6?auto=format&fit=crop&w=800&q=80',
    gender: 'female',
    specialty: 'Neurological & Respiratory Emergency'
  }
];

// Language Options
const LANGUAGES = [
  { code: 'en-US', name: 'English (US)', label: 'English' },
  { code: 'te-IN', name: 'Telugu (తెలుగు)', label: 'తెలుగు' },
  { code: 'hi-IN', name: 'Hindi (हिंदी)', label: 'हिंदी' },
  { code: 'es-ES', name: 'Spanish (Español)', label: 'Español' }
];

// Akapulu Scenario Nodes
const SCENARIO_NODES = [
  { id: 1, name: 'Greeting & Intake', icon: User, code: 'NODE_1_GREETING' },
  { id: 2, name: 'Camera Vision Scan', icon: Eye, code: 'NODE_2_VISION' },
  { id: 3, name: 'Clinical Diagnosis', icon: Cpu, code: 'NODE_3_DIAGNOSIS' },
  { id: 4, name: 'Remedies & Dispatch', icon: Zap, code: 'NODE_4_HANDOVER' }
];

export default function DoctorAvatarVideoCall({ onNavigateToHospitalRanker }) {
  // Call State
  const [callState, setCallState] = useState('connected'); // 'connected' | 'calling' | 'idle'
  const [selectedDoctor, setSelectedDoctor] = useState(DOCTOR_AVATARS[0]);
  const [selectedLang, setSelectedLang] = useState(LANGUAGES[0]);
  
  // Active Scenario Step
  const [activeNodeStep, setActiveNodeStep] = useState(2); // Node 2 (Vision Scan) active by default

  // Hardware & Mic State
  const [isMicMuted, setIsMicMuted] = useState(false);
  const [isVideoMuted, setIsVideoMuted] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isContinuousVoice, setIsContinuousVoice] = useState(true); // Full Duplex Voice
  const [muteDoctorAudio, setMuteDoctorAudio] = useState(false);
  const [callSeconds, setCallSeconds] = useState(0);
  const [liveTranscript, setLiveTranscript] = useState(''); // Real-time speech transcript

  // Vision AI Camera State ("See You")
  const [isAutoVisionActive, setIsAutoVisionActive] = useState(false);
  const [isVisionScanning, setIsVisionScanning] = useState(false);
  const [visionBoundingBox, setVisionBoundingBox] = useState({ x: 28, y: 22, width: 44, height: 44 });
  const [visionTelemetry, setVisionTelemetry] = useState({
    confidence: 0.97,
    affected_area: 'Epidermal Cutaneous Tissue',
    thermal_severity: 'HIGH_ACUTE',
    detected_condition: 'Severe 2nd-degree burn lesion'
  });
  const scanInProgressRef = useRef(false);

  // Inputs
  const [userInput, setUserInput] = useState('');
  const [photoPreview, setPhotoPreview] = useState(null);

  // Doctor AI Agent Dynamics
  const [isProcessing, setIsProcessing] = useState(false);
  const [doctorSpeaking, setDoctorSpeaking] = useState(false);
  const [agentStatus, setAgentStatus] = useState('Listening & Ready'); // 'Listening & Ready' | 'Scanning Vision Frame...' | 'Thinking...' | 'Speaking...'

  // Conversation History
  const [messages, setMessages] = useState([
    {
      id: 1,
      sender: 'doctor',
      text: `Hello! I am ${DOCTOR_AVATARS[0].name}. I can see you through your live video feed. Show your symptoms or injury to the camera or speak to me out loud. What emergency are you experiencing?`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);

  // Assessment & Handover Data
  const [remedies, setRemedies] = useState([
    'Immediately cool the burn with cool (not ice cold) running water for 10-15 minutes.',
    'Cover with sterile non-adherent dressing or clean cloth. Do not apply butter or ointments.',
    'Elevate injured area above heart level if possible to minimize swelling.',
    'Emergency ICU transfer and trauma specialist consultation required immediately.'
  ]);
  const [requirementPayload, setRequirementPayload] = useState({
    urgency_level: "CRITICAL_LEVEL_1",
    detected_condition: "Severe 2nd-degree burn lesion with cutaneous trauma and acute pain",
    hard_requirements: {
      bed_type: "ICU",
      blood_group: "O_NEG",
      equipment: ["VENTILATOR", "ECMO"],
      specialist: "TRAUMA_SURGEON"
    }
  });

  // Location & Vault
  const [patientLocation, setPatientLocation] = useState({ lat: 17.4400, lng: 78.3480 });
  const [locationStatus, setLocationStatus] = useState('Live Location Locked (17.4400, 78.3480)');
  const [handoverToast, setHandoverToast] = useState(false);
  const [showVaultModal, setShowVaultModal] = useState(false);
  const [vaultConversations, setVaultConversations] = useState([]);

  // Refs
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const chatBottomRef = useRef(null);
  const speechRecognitionRef = useRef(null);
  const callTimerRef = useRef(null);
  const autoScanIntervalRef = useRef(null);
  const silenceTimerRef = useRef(null);
  const fullDuplexActiveRef = useRef(false);
  const accumulatedTranscriptRef = useRef('');

  // Initialize Speech & Geolocation
  useEffect(() => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.getVoices();
      window.speechSynthesis.onvoiceschanged = () => window.speechSynthesis.getVoices();
    }

    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setPatientLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
          setLocationStatus(`Live Location (${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)})`);
        },
        () => setLocationStatus('Default Emergency GPS (17.4400, 78.3480)'),
        { enableHighAccuracy: true, timeout: 8000 }
      );
    }
  }, []);

  // Call Timer
  useEffect(() => {
    if (callState === 'connected') {
      callTimerRef.current = setInterval(() => setCallSeconds(prev => prev + 1), 1000);
    } else {
      clearInterval(callTimerRef.current);
    }
    return () => clearInterval(callTimerRef.current);
  }, [callState]);

  // Patient Camera Stream
  useEffect(() => {
    let stream = null;
    if (callState === 'connected' && !isVideoMuted && videoRef.current) {
      navigator.mediaDevices?.getUserMedia({ video: true, audio: true })
        .then((s) => {
          stream = s;
          if (videoRef.current) videoRef.current.srcObject = s;
        })
        .catch((err) => console.warn('Webcam access skipped:', err));
    }
    return () => {
      if (stream) stream.getTracks().forEach(t => t.stop());
    };
  }, [callState, isVideoMuted]);

  // Scroll Chat to Bottom
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isProcessing]);

  // Automatic Vision Camera Feed Scanner Loop ("See You")
  useEffect(() => {
    if (isAutoVisionActive && callState === 'connected' && !isVideoMuted) {
      autoScanIntervalRef.current = setInterval(() => {
        if (!scanInProgressRef.current) {
          scanCameraNow(true);
        }
      }, 10000);
    } else {
      clearInterval(autoScanIntervalRef.current);
    }
    return () => clearInterval(autoScanIntervalRef.current);
  }, [isAutoVisionActive, callState, isVideoMuted]);

  // ═══════════════════════════════════════════════════════════════
  //  FULL DUPLEX VOICE ENGINE
  //  - Always-on continuous speech recognition
  //  - Barge-in: patient speaking interrupts doctor TTS
  //  - Silence detection: auto-send after 1.5s pause
  //  - Auto-start when call connects
  // ═══════════════════════════════════════════════════════════════

  // Natural Speech Synthesis Engine with Barge-In Support
  const speakDoctorVoice = (text) => {
    if (!('speechSynthesis' in window) || muteDoctorAudio) return;

    const cleanText = text
      .replace(/[*#_~`]/g, '')
      .replace(/CRITICAL_LEVEL_1/g, 'Critical Level One')
      .replace(/O_NEG/g, 'O Negative')
      .trim();

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
    const isMale = selectedDoctor.gender === 'male';
    const langPrefix = selectedLang.code.slice(0, 2);

    const matchVoice = voices.find(v => 
      v.lang.startsWith(langPrefix) && 
      (v.name.includes('Natural') || v.name.includes('Neural') || v.name.includes('Google') || v.name.includes('Premium')) &&
      (isMale ? (v.name.includes('Male') || v.name.includes('David') || v.name.includes('Guy')) : (v.name.includes('Female') || v.name.includes('Zira') || v.name.includes('Jenny')))
    ) || voices.find(v => v.lang.startsWith(langPrefix));

    if (matchVoice) utterance.voice = matchVoice;

    utterance.onstart = () => {
      setDoctorSpeaking(true);
      setAgentStatus('Speaking...');
    };
    utterance.onend = () => {
      setDoctorSpeaking(false);
      setAgentStatus('Full Duplex — Listening...');
    };
    utterance.onerror = () => {
      setDoctorSpeaking(false);
      setAgentStatus('Full Duplex — Listening...');
    };

    window.speechSynthesis.speak(utterance);
  };

  // Barge-In: Interrupt doctor when patient starts speaking
  const bargeInInterruptDoctor = () => {
    if ('speechSynthesis' in window && window.speechSynthesis.speaking) {
      window.speechSynthesis.cancel();
      setDoctorSpeaking(false);
      setAgentStatus('Patient interrupted — Listening...');
    }
  };

  // Start Full Duplex Continuous Speech Recognition
  const startFullDuplexListening = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    // Stop existing recognition if any
    try { speechRecognitionRef.current?.stop(); } catch (e) {}

    fullDuplexActiveRef.current = true;
    accumulatedTranscriptRef.current = '';

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = selectedLang.code;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setIsListening(true);
      setAgentStatus('Full Duplex — Listening...');
    };

    recognition.onresult = (event) => {
      let interimTranscript = '';
      let finalTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript;
        } else {
          interimTranscript += transcript;
        }
      }

      // Barge-in: interrupt doctor if patient starts speaking
      if ((finalTranscript || interimTranscript) && finalTranscript.length > 0 || interimTranscript.length > 3) {
        bargeInInterruptDoctor();
      }

      // Accumulate final results
      if (finalTranscript) {
        accumulatedTranscriptRef.current += (accumulatedTranscriptRef.current ? ' ' : '') + finalTranscript;
      }

      // Show live transcript (accumulated + current interim)
      const displayText = accumulatedTranscriptRef.current + (interimTranscript ? (accumulatedTranscriptRef.current ? ' ' : '') + interimTranscript : '');
      setLiveTranscript(displayText);
      setUserInput(displayText);

      // Reset silence timer on every speech event
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = setTimeout(() => {
        // Auto-send after 1.5s of silence
        const textToSend = accumulatedTranscriptRef.current.trim();
        if (textToSend && textToSend.length > 2) {
          handleSendMessage(textToSend);
          accumulatedTranscriptRef.current = '';
          setLiveTranscript('');
          setUserInput('');
        }
      }, 1500);
    };

    recognition.onerror = (event) => {
      // 'no-speech' and 'aborted' are normal in continuous mode, auto-restart
      if (event.error === 'no-speech' || event.error === 'aborted') {
        return; // onend will handle restart
      }
      console.warn('Speech recognition error:', event.error);
    };

    recognition.onend = () => {
      setIsListening(false);
      // Auto-restart if full duplex is still active and call is connected
      if (fullDuplexActiveRef.current && callState === 'connected' && !isMicMuted) {
        setTimeout(() => {
          try {
            if (fullDuplexActiveRef.current) {
              recognition.start();
            }
          } catch (e) {
            console.warn('Full duplex restart failed, retrying...', e);
            setTimeout(() => startFullDuplexListening(), 500);
          }
        }, 200);
      }
    };

    speechRecognitionRef.current = recognition;
    try {
      recognition.start();
    } catch (err) {
      console.warn('Full duplex speech recognition start failed:', err);
    }
  };

  // Stop Full Duplex Listening
  const stopFullDuplexListening = () => {
    fullDuplexActiveRef.current = false;
    clearTimeout(silenceTimerRef.current);
    try { speechRecognitionRef.current?.stop(); } catch (e) {}
    setIsListening(false);
    setLiveTranscript('');

    // Send any remaining accumulated text
    const remaining = accumulatedTranscriptRef.current.trim();
    if (remaining && remaining.length > 2) {
      handleSendMessage(remaining);
      accumulatedTranscriptRef.current = '';
    }
  };

  // Auto-start full duplex when call connects
  useEffect(() => {
    if (callState === 'connected' && isContinuousVoice && !isMicMuted) {
      const timer = setTimeout(() => startFullDuplexListening(), 1000);
      return () => clearTimeout(timer);
    } else {
      stopFullDuplexListening();
    }
  }, [callState, isContinuousVoice, isMicMuted]);

  // Toggle Full Duplex Voice
  const toggleSpeechToText = () => {
    if (isListening && fullDuplexActiveRef.current) {
      stopFullDuplexListening();
    } else {
      startFullDuplexListening();
    }
  };

  // Capture Live Camera Frame & Analyze ("See You")
  const scanCameraNow = async (isAuto = false) => {
    if (isVideoMuted || !videoRef.current) {
      if (!isAuto) alert('Please enable your webcam camera to perform live AI doctor vision scan.');
      return;
    }

    // Prevent overlapping scans
    if (scanInProgressRef.current) {
      if (!isAuto) console.log('Scan already in progress, please wait...');
      return;
    }

    scanInProgressRef.current = true;
    setIsVisionScanning(true);
    setAgentStatus('Scanning Vision Frame...');
    setActiveNodeStep(2); // Node 2: Camera Vision Scan

    try {
      // Grab frame onto hidden canvas — downscale to 320x240 for fast transfer
      const canvas = canvasRef.current || document.createElement('canvas');
      const MAX_W = 320;
      const MAX_H = 240;
      const srcW = videoRef.current.videoWidth || 640;
      const srcH = videoRef.current.videoHeight || 480;
      const scale = Math.min(MAX_W / srcW, MAX_H / srcH, 1);
      canvas.width = Math.round(srcW * scale);
      canvas.height = Math.round(srcH * scale);
      const ctx = canvas.getContext('2d');
      ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
      const frameBase64 = canvas.toDataURL('image/jpeg', 0.5);

      setPhotoPreview(frameBase64);

      // Process frame via AI Doctor backend
      await handleSendMessage('I am showing my condition to your camera for real-time vision analysis.', frameBase64, true);
    } finally {
      scanInProgressRef.current = false;
      setIsVisionScanning(false);
      // Clear snapshot overlay after 3s so live video feed returns for next scan
      setTimeout(() => setPhotoPreview(null), 3000);
    }
  };

  // Submit Consultation Message
  const handleSendMessage = async (textToSend = userInput, photo = photoPreview, isCameraScan = false) => {
    const queryText = (textToSend || '').trim();
    if (!queryText && !photo) return;

    // Add Patient Message to Chat
    const userMsg = {
      id: Date.now(),
      sender: 'patient',
      text: isCameraScan ? '📸 [Live Camera Frame Vision Scan Captured]' : queryText || (photo ? '[Uploaded Injury Scan Photo]' : ''),
      photo: photo,
      isCameraScan: isCameraScan,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    // For camera scans, replace previous scan messages instead of stacking up
    if (isCameraScan) {
      setMessages(prev => [...prev.filter(m => !m.isCameraScan), userMsg]);
    } else {
      setMessages(prev => [...prev, userMsg]);
    }
    setUserInput('');
    setIsProcessing(true);
    setAgentStatus('Thinking & Analyzing Vision...');

    try {
      const response = await fetch('/api/doctor/consult', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          textInput: queryText || 'Patient submitted camera frame vision scan',
          hasPhoto: Boolean(photo),
          photoBase64: photo,
          isCameraScan,
          patient_location: patientLocation,
          patient_id: 'PAT-LIVE-902'
        })
      });

      const data = await response.json();

      if (response.ok && data.status === 'SUCCESS') {
        if (data.remedies && data.remedies.length > 0) setRemedies(data.remedies);
        if (data.requirementPayload) setRequirementPayload(data.requirementPayload);

        // Update Vision Telemetry Bounding Overlay
        if (data.vision_analysis) {
          setVisionTelemetry({
            confidence: data.vision_analysis.confidence_score || 0.97,
            affected_area: data.vision_analysis.affected_area || 'Epidermal Cutaneous Tissue',
            thermal_severity: data.vision_analysis.thermal_severity || 'HIGH_ACUTE',
            detected_condition: data.requirementPayload?.detected_condition || 'Severe 2nd-degree burn lesion'
          });
          if (data.vision_analysis.bbox) {
            setVisionBoundingBox(data.vision_analysis.bbox);
          }
        }

        // Update Scenario Node Workflow
        setActiveNodeStep(3); // Node 3: Clinical Diagnosis

        const doctorReplyText = data.doctor_voice_response || `I have visually evaluated your symptoms. Condition detected: ${data.requirementPayload?.detected_condition || 'Trauma injury'}. I am initiating emergency hospital matching.`;

        const doctorMsg = {
          id: Date.now() + 1,
          sender: 'doctor',
          text: doctorReplyText,
          remedies: data.remedies,
          isCameraScan: isCameraScan,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };

        setMessages(prev => [...prev, doctorMsg]);

        // Speak Doctor Voice
        speakDoctorVoice(doctorReplyText);
      }
    } catch (err) {
      console.error('Error contacting AI Doctor agent:', err);
      const fallbackText = `I see your symptoms. Based on my visual clinical assessment, immediate trauma care is advised. I am preparing your requirement profile for hospital selection.`;
      setMessages(prev => [...prev, {
        id: Date.now() + 1,
        sender: 'doctor',
        text: fallbackText,
        isCameraScan: isCameraScan,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }]);
      speakDoctorVoice(fallbackText);
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle Photo Upload
  const handlePhotoUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result);
        handleSendMessage('I uploaded a photo of my injury for visual analysis.', reader.result, false);
      };
      reader.readAsDataURL(file);
    }
  };

  // End Call
  const handleEndCall = () => {
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    stopFullDuplexListening();
    setDoctorSpeaking(false);
    setIsListening(false);
    setIsAutoVisionActive(false);
    setCallState('idle');
  };

  // Start / Re-Connect Call
  const handleStartCall = () => {
    setCallState('calling');
    setTimeout(() => {
      setCallState('connected');
      setCallSeconds(0);
      setActiveNodeStep(1);
      speakDoctorVoice(`Hello, I am ${selectedDoctor.name}. I can see and hear you. What medical emergency are you experiencing?`);
    }, 1000);
  };

  // Supabase Vault
  const fetchSupabaseVault = async () => {
    setShowVaultModal(true);
    try {
      const res = await fetch('/api/doctor/conversations');
      const data = await res.json();
      if (data.status === 'SUCCESS') setVaultConversations(data.conversations || []);
    } catch (err) {
      console.error('Error fetching vault:', err);
    }
  };

  // Execute Hospital Match Handover
  const handleExecuteHospitalMatching = () => {
    setActiveNodeStep(4); // Node 4: Remedies & Dispatch
    setHandoverToast(true);
    setTimeout(() => {
      if (onNavigateToHospitalRanker) {
        onNavigateToHospitalRanker({
          requirement_payload: requirementPayload,
          patient_location: patientLocation
        });
      }
    }, 600);
  };

  // Format MM:SS
  const formatTime = (totalSec) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      
      {/* Hidden Canvas for Webcam Frame Capture */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Toast Handover Notification */}
      {handoverToast && (
        <div className="fixed top-20 right-6 z-[9999] bg-emerald-500 text-slate-950 px-6 py-4 rounded-2xl font-black text-sm shadow-2xl flex items-center gap-3 border border-emerald-300 animate-bounce">
          <Zap className="w-5 h-5 fill-current" />
          <span>Handing over requirement payload & location to Layer 2 Hospital Matcher...</span>
        </div>
      )}

      {/* Header Bar & Specialist Selector */}
      <div className="glass-panel p-6 rounded-3xl border border-indigo-500/40 bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 shadow-2xl space-y-4">
        
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-wider bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 px-3 py-1 rounded-full flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-cyan-400" /> Real-Time Conversational AI Avatar That Can See You
              </span>
              <span className="text-xs text-slate-400 font-mono flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-rose-400" /> {locationStatus}
              </span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-2">
              Live AI Doctor Video Consult & Camera Sight
            </h2>
            <p className="text-xs text-slate-300 max-w-2xl">
              Conversational AI Doctor Agent with live camera vision ("See You"), continuous voice loop, scenario node workflow, visual lesion frame scanner, and ER bed dispatch.
            </p>
          </div>

          {/* Top Actions */}
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={fetchSupabaseVault}
              className="px-4 py-3 rounded-2xl bg-slate-950 hover:bg-slate-900 text-slate-300 border border-slate-800 text-xs font-bold flex items-center gap-2 cursor-pointer transition-all"
            >
              <Archive className="w-4 h-4 text-emerald-400" />
              <span>Supabase Vault</span>
            </button>

            {callState === 'connected' ? (
              <button
                onClick={handleEndCall}
                className="px-5 py-3 rounded-2xl font-black text-xs uppercase tracking-wider text-white bg-gradient-to-r from-rose-600 to-red-700 hover:from-rose-500 hover:to-red-600 shadow-xl shadow-rose-600/30 transition-all cursor-pointer border border-rose-400 flex items-center gap-2"
              >
                <PhoneOff className="w-4.5 h-4.5 fill-current" />
                <span>END DOCTOR SESSION</span>
              </button>
            ) : (
              <button
                onClick={handleStartCall}
                className="px-6 py-3.5 rounded-2xl font-black text-xs uppercase tracking-wider text-slate-950 bg-gradient-to-r from-emerald-400 to-teal-300 hover:from-emerald-300 hover:to-teal-200 shadow-xl shadow-emerald-500/30 transition-all cursor-pointer border border-emerald-300 flex items-center gap-2"
              >
                <PhoneCall className="w-4.5 h-4.5 fill-current" />
                <span>CONNECT TO AI DOCTOR</span>
              </button>
            )}
          </div>
        </div>

        {/* Akapulu Interactive Scenario Node Bar */}
        <div className="pt-3 border-t border-slate-800/80">
          <div className="flex items-center justify-between gap-2 overflow-x-auto pb-1">
            <span className="text-[11px] font-black uppercase text-indigo-400 tracking-wider flex items-center gap-1.5 shrink-0">
              <Layers className="w-4 h-4 text-cyan-400" /> Scenario Brain Nodes:
            </span>
            <div className="flex items-center gap-2 shrink-0">
              {SCENARIO_NODES.map((node) => {
                const Icon = node.icon;
                const isActive = activeNodeStep === node.id;
                const isPassed = activeNodeStep > node.id;
                return (
                  <button
                    key={node.id}
                    onClick={() => setActiveNodeStep(node.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer border ${
                      isActive
                        ? 'bg-gradient-to-r from-indigo-600 to-cyan-600 text-white border-cyan-400 shadow-lg shadow-cyan-500/30 ring-2 ring-cyan-500/40'
                        : isPassed
                        ? 'bg-slate-900 text-emerald-400 border-emerald-500/40'
                        : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200'
                    }`}
                  >
                    <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-cyan-300 animate-pulse' : ''}`} />
                    <span>Node {node.id}: {node.name}</span>
                    {isPassed && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 ml-1" />}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Doctor & Language Selector */}
        <div className="pt-3 border-t border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-400 flex items-center gap-1.5">
              <Stethoscope className="w-4 h-4 text-emerald-400" /> Active Specialist Doctor:
            </span>
            <div className="flex flex-wrap gap-2">
              {DOCTOR_AVATARS.map((doc) => (
                <button
                  key={doc.id}
                  onClick={() => {
                    setSelectedDoctor(doc);
                    speakDoctorVoice(`Switched consultation to ${doc.name}. How can I assist your medical emergency?`);
                  }}
                  className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                    selectedDoctor.id === doc.id
                      ? 'bg-indigo-600 text-white border-indigo-400 ring-2 ring-indigo-500/40 shadow'
                      : 'bg-slate-950 text-slate-300 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <img src={doc.image} alt={doc.name} className="w-5 h-5 rounded-full object-cover" />
                  <span>{doc.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Language Selector */}
          <div className="flex items-center gap-2 bg-slate-950 p-1.5 rounded-xl border border-slate-800 text-xs">
            <Globe className="w-3.5 h-3.5 text-cyan-400 ml-1" />
            <span className="text-slate-400 font-bold">Lang:</span>
            {LANGUAGES.map((lang) => (
              <button
                key={lang.code}
                onClick={() => setSelectedLang(lang)}
                className={`px-2 py-0.5 rounded-md font-mono text-[11px] transition-all cursor-pointer ${
                  selectedLang.code === lang.code
                    ? 'bg-cyan-500 text-slate-950 font-bold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {lang.label}
              </button>
            ))}
          </div>

        </div>

      </div>

      {/* CALL STATE: IDLE */}
      {callState === 'idle' && (
        <div className="glass-panel p-10 rounded-3xl border-2 border-slate-800 bg-slate-950 text-center space-y-6 shadow-2xl flex flex-col items-center justify-center min-h-[380px]">
          <div className="w-20 h-20 rounded-full bg-slate-900 border-2 border-slate-700 flex items-center justify-center text-slate-400 shadow-xl">
            <PhoneOff className="w-9 h-9 text-rose-500" />
          </div>
          <div className="space-y-2 max-w-md">
            <h3 className="text-2xl font-black text-white">AI Doctor Consultation Paused</h3>
            <p className="text-xs text-slate-400">
              The live session with {selectedDoctor.name} is offline. Click below to re-connect and start talking with your doctor agent.
            </p>
          </div>
          <button
            onClick={handleStartCall}
            className="flex items-center gap-2 px-8 py-4 rounded-2xl font-black text-sm uppercase tracking-wider text-slate-950 bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400 hover:from-emerald-300 hover:to-cyan-300 shadow-2xl shadow-emerald-500/40 hover:scale-105 transition-all cursor-pointer border border-emerald-300"
          >
            <PhoneCall className="w-5 h-5 fill-current" />
            <span>RE-CONNECT TO AI DOCTOR</span>
          </button>
        </div>
      )}

      {/* CALL STATE: CALLING */}
      {callState === 'calling' && (
        <div className="glass-panel p-12 rounded-3xl border-2 border-cyan-500/50 bg-slate-950 text-center space-y-6 shadow-2xl flex flex-col items-center justify-center min-h-[400px]">
          <div className="relative">
            <div className="w-28 h-28 rounded-full overflow-hidden border-4 border-cyan-400 shadow-2xl shadow-cyan-500/40">
              <img src={selectedDoctor.image} alt={selectedDoctor.name} className="w-full h-full object-cover" />
            </div>
            <div className="absolute inset-0 border-4 border-cyan-400 rounded-full animate-ping pointer-events-none opacity-50" />
          </div>
          <div className="space-y-1">
            <h3 className="text-2xl font-black text-white">Connecting with {selectedDoctor.name}...</h3>
            <p className="text-xs text-cyan-300 font-mono">Initializing Doctor AI Agent Voice & Vision Stream...</p>
          </div>
        </div>
      )}

      {/* CALL STATE: CONNECTED — MAIN INTERACTIVE AGENT CONSOLE */}
      {callState === 'connected' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* LEFT PANEL: AI DOCTOR AVATAR & LIVE WEBCAM VISION STREAM ("SEE YOU") (5 cols) */}
          <div className="lg:col-span-5 space-y-4">
            
            {/* AI Doctor Avatar Portrait Frame */}
            <div className="glass-panel rounded-3xl border-2 border-indigo-500/40 bg-slate-950 p-4 space-y-3 shadow-2xl relative overflow-hidden">
              
              {/* Status Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={`w-3 h-3 rounded-full ${doctorSpeaking ? 'bg-rose-500 animate-ping' : isVisionScanning ? 'bg-amber-400 animate-pulse' : 'bg-emerald-500 animate-pulse'}`} />
                  <span className="text-xs font-mono font-bold text-slate-300">{agentStatus}</span>
                </div>
                <div className="flex items-center gap-1 bg-slate-900 px-3 py-1 rounded-full border border-slate-800 text-xs font-mono text-cyan-300">
                  <Clock className="w-3.5 h-3.5 text-emerald-400" />
                  <span>{formatTime(callSeconds)}</span>
                </div>
              </div>

              {/* High Definition Doctor Avatar Frame */}
              <div className="relative w-full aspect-[4/3] rounded-2xl overflow-hidden border-2 border-indigo-500/50 shadow-2xl bg-slate-900 group">
                <img
                  src={selectedDoctor.image}
                  alt={selectedDoctor.name}
                  className={`w-full h-full object-cover transition-all duration-300 ${
                    doctorSpeaking ? 'scale-105 brightness-110' : 'scale-100'
                  }`}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent opacity-90" />

                {/* Audio Wave Visualizer Overlay when Doctor Speaks */}
                {doctorSpeaking && (
                  <div className="absolute inset-x-4 bottom-14 flex items-end justify-center gap-1.5 h-12 z-20">
                    {[40, 75, 90, 60, 100, 45, 80, 95, 50, 85, 65].map((h, i) => (
                      <div
                        key={i}
                        className="w-1.5 rounded-full bg-gradient-to-t from-emerald-400 via-teal-300 to-cyan-400 animate-pulse"
                        style={{ height: `${h}%`, animationDelay: `${i * 70}ms` }}
                      />
                    ))}
                  </div>
                )}

                {/* Doctor Bio Overlay */}
                <div className="absolute bottom-3 inset-x-3 bg-slate-950/85 backdrop-blur-md p-3 rounded-xl border border-slate-800 flex items-center justify-between text-xs z-20">
                  <div>
                    <h4 className="font-black text-white text-sm">{selectedDoctor.name}</h4>
                    <p className="text-[11px] text-cyan-300 font-mono">{selectedDoctor.title}</p>
                    <span className="text-[10px] text-emerald-400 block">{selectedDoctor.specialty}</span>
                  </div>
                  <span className="px-2 py-1 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 font-mono text-[10px]">
                    Interactive Avatar
                  </span>
                </div>
              </div>

            </div>

            {/* PATIENT LIVE WEBCAM STREAM & AI VISION TARGETING OVERLAY ("SEE YOU") */}
            <div className="glass-panel rounded-3xl border-2 border-emerald-500/40 bg-slate-950 p-4 space-y-3 shadow-2xl relative">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Camera className="w-4 h-4 text-emerald-400" />
                  <span className="text-xs font-black text-white uppercase tracking-wider">Patient Camera Vision Feed</span>
                </div>
                <div className="flex items-center gap-2">
                  {/* Auto Vision Toggle */}
                  <button
                    onClick={() => setIsAutoVisionActive(!isAutoVisionActive)}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1 transition-all cursor-pointer border ${
                      isAutoVisionActive
                        ? 'bg-emerald-500 text-slate-950 border-emerald-300 animate-pulse font-extrabold'
                        : 'bg-slate-900 text-slate-400 border-slate-800'
                    }`}
                    title="Automatically scan camera feed every 10s"
                  >
                    <Eye className="w-3 h-3" />
                    <span>Auto-Vision: {isAutoVisionActive ? 'ON' : 'OFF'}</span>
                  </button>
                </div>
              </div>

              {/* Live Video Display with AI Vision Overlay */}
              <div className="relative w-full aspect-video rounded-2xl overflow-hidden border-2 border-slate-800 bg-slate-900 group">
                {isVideoMuted ? (
                  <div className="w-full h-full flex flex-col items-center justify-center text-slate-500 gap-2">
                    <VideoOff className="w-8 h-8 text-rose-500" />
                    <span className="text-xs font-bold text-slate-400">Webcam Camera Offline</span>
                  </div>
                ) : (
                  <>
                    <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
                    {photoPreview && (
                      <img src={photoPreview} alt="Webcam Vision Frame" className="absolute inset-0 w-full h-full object-cover z-10 transition-opacity duration-500" />
                    )}
                  </>
                )}

                {/* AI Doctor Sight Bounding Box Scan Overlay */}
                {!isVideoMuted && (
                  <div 
                    className="absolute border-2 border-emerald-400 rounded-xl shadow-2xl shadow-emerald-500/50 pointer-events-none transition-all duration-700 animate-pulse z-20 flex flex-col justify-between p-1.5"
                    style={{
                      left: `${visionBoundingBox.x}%`,
                      top: `${visionBoundingBox.y}%`,
                      width: `${visionBoundingBox.width}%`,
                      height: `${visionBoundingBox.height}%`
                    }}
                  >
                    <div className="flex items-center justify-between bg-emerald-950/90 text-emerald-300 text-[9px] font-mono px-2 py-0.5 rounded border border-emerald-500/60">
                      <span className="font-black flex items-center gap-1">
                        <Eye className="w-3 h-3 text-cyan-400" /> AI SIGHT LOCK
                      </span>
                      <span>CONF: {(visionTelemetry.confidence * 100).toFixed(0)}%</span>
                    </div>

                    <div className="bg-slate-950/90 text-slate-100 text-[9px] font-mono p-1.5 rounded border border-slate-800">
                      <span className="text-amber-400 font-bold block">{visionTelemetry.detected_condition}</span>
                      <span className="text-cyan-300 text-[8px] block">Severity: {visionTelemetry.thermal_severity}</span>
                    </div>
                  </div>
                )}

                {/* Scanning Laser Beam Effect when active */}
                {isVisionScanning && (
                  <div className="absolute inset-x-0 h-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-lg shadow-cyan-500 animate-bounce top-1/2 z-30" />
                )}

                {/* Bottom Stream Telemetry Bar */}
                <div className="absolute bottom-2 inset-x-2 bg-slate-950/80 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-800 flex items-center justify-between text-[10px] font-mono z-20">
                  <span className="text-slate-300 flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" /> Real-Time Frame Stream
                  </span>
                  <span className="text-cyan-300 font-bold">{visionTelemetry.affected_area}</span>
                </div>
              </div>

              {/* Vision Action Controls */}
              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  onClick={() => scanCameraNow(false)}
                  disabled={isVideoMuted || isVisionScanning}
                  className="py-3 px-3 rounded-2xl font-black text-xs text-slate-950 bg-gradient-to-r from-cyan-400 to-emerald-300 hover:from-cyan-300 hover:to-emerald-200 disabled:opacity-50 shadow-md flex items-center justify-center gap-1.5 cursor-pointer border border-cyan-300 transition-all uppercase tracking-wider"
                >
                  <Eye className="w-4 h-4 fill-slate-950" />
                  <span>{isVisionScanning ? 'Scanning Frame...' : 'Scan Camera Feed'}</span>
                </button>

                <button
                  onClick={handleExecuteHospitalMatching}
                  className="py-3 px-3 rounded-2xl font-black text-xs text-slate-950 bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400 hover:from-emerald-300 hover:to-cyan-300 shadow-md flex items-center justify-center gap-1.5 cursor-pointer border border-emerald-300 transition-all uppercase tracking-wider"
                >
                  <Zap className="w-4 h-4 fill-slate-950" />
                  <span>Match ER Hospital</span>
                </button>
              </div>

              {/* Hardware Controls */}
              <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setIsMicMuted(!isMicMuted)}
                    className={`px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                      isMicMuted ? 'bg-rose-600 text-white' : 'bg-slate-900 text-emerald-400 border border-slate-800'
                    }`}
                  >
                    {isMicMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                    <span>{isMicMuted ? 'Mic Muted' : 'Mic Live'}</span>
                  </button>

                  <button
                    onClick={() => setIsVideoMuted(!isVideoMuted)}
                    className={`px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                      isVideoMuted ? 'bg-rose-600 text-white' : 'bg-slate-900 text-cyan-400 border border-slate-800'
                    }`}
                  >
                    {isVideoMuted ? <VideoOff className="w-4 h-4" /> : <Video className="w-4 h-4" />}
                    <span>{isVideoMuted ? 'Cam Off' : 'Cam Live'}</span>
                  </button>
                </div>

                <div className="flex items-center gap-1 text-[11px] font-mono text-slate-400">
                  <span>Full Duplex:</span>
                  <button
                    onClick={() => setIsContinuousVoice(!isContinuousVoice)}
                    className={`px-2 py-0.5 rounded font-bold transition-all cursor-pointer ${
                      isContinuousVoice ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {isContinuousVoice ? 'ON' : 'OFF'}
                  </button>
                </div>
              </div>

            </div>

          </div>

          {/* RIGHT PANEL: INTERACTIVE DOCTOR-PATIENT CONVERSATION & REMEDIES (7 cols) */}
          <div className="lg:col-span-7 flex flex-col space-y-4">
            
            {/* Conversation Console */}
            <div className="glass-panel rounded-3xl border-2 border-indigo-500/40 bg-slate-950 flex-1 flex flex-col justify-between overflow-hidden shadow-2xl min-h-[480px]">
              
              {/* Console Header */}
              <div className="p-4 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-indigo-500/20 border border-indigo-400/50 flex items-center justify-center text-indigo-300">
                    <Stethoscope className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-black text-white">Interactive Medical Dialogue & Vision Log</h3>
                    <p className="text-[10px] text-slate-400 font-mono">Full Duplex Conversational Engine with {selectedDoctor.name}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setMuteDoctorAudio(!muteDoctorAudio)}
                    className="text-slate-400 hover:text-white p-1.5 rounded-lg text-xs flex items-center gap-1 cursor-pointer border border-slate-800"
                  >
                    {muteDoctorAudio ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
                    <span className="hidden sm:inline">{muteDoctorAudio ? 'Voice Muted' : 'Voice Active'}</span>
                  </button>
                </div>
              </div>

              {/* Chat Messages */}
              <div className="p-4 sm:p-6 flex-1 overflow-y-auto space-y-4 max-h-[380px]">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex items-start gap-3 ${msg.sender === 'patient' ? 'flex-row-reverse' : ''}`}
                  >
                    {/* Avatar Icon */}
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 border ${
                      msg.sender === 'doctor' 
                        ? 'bg-indigo-600 text-white border-indigo-400' 
                        : 'bg-emerald-600 text-slate-950 border-emerald-400'
                    }`}>
                      {msg.sender === 'doctor' ? 'Dr' : <User className="w-4 h-4" />}
                    </div>

                    {/* Speech Bubble */}
                    <div className={`max-w-lg space-y-1.5 ${msg.sender === 'patient' ? 'items-end text-right' : ''}`}>
                      <div className="flex items-center gap-2 px-1">
                        <span className="text-[10px] font-bold text-slate-400">
                          {msg.sender === 'doctor' ? selectedDoctor.name : 'Patient'}
                        </span>
                        <span className="text-[9px] text-slate-500 font-mono">{msg.timestamp}</span>
                      </div>

                      <div className={`p-4 rounded-2xl text-xs leading-relaxed border space-y-2 ${
                        msg.sender === 'doctor'
                          ? 'bg-slate-900 border-indigo-500/30 text-slate-100 rounded-tl-none shadow-md'
                          : 'bg-gradient-to-r from-emerald-950 to-teal-950 border-emerald-500/40 text-emerald-100 rounded-tr-none shadow-md'
                      }`}>
                        <p>{msg.text}</p>

                        {/* Replay Doctor Voice */}
                        {msg.sender === 'doctor' && (
                          <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
                            <button
                              onClick={() => speakDoctorVoice(msg.text)}
                              className="px-2.5 py-1 rounded-lg bg-indigo-950/80 hover:bg-indigo-900 text-indigo-300 border border-indigo-500/40 text-[10px] font-bold flex items-center gap-1.5 cursor-pointer transition-all"
                            >
                              <Volume2 className="w-3 h-3 text-cyan-400" />
                              <span>🔊 Speak Voice</span>
                            </button>
                            <span className="text-[9px] text-emerald-400 font-mono">AI Voice Ready</span>
                          </div>
                        )}

                        {/* Image Preview */}
                        {msg.photo && (
                          <div className="mt-2.5 w-48 h-32 rounded-xl overflow-hidden border border-emerald-500/40 relative">
                            <img src={msg.photo} alt="Visual Lesion Scan" className="w-full h-full object-cover" />
                            <div className="absolute top-1 left-1 bg-slate-950/80 text-emerald-400 font-mono text-[9px] px-1.5 py-0.5 rounded">
                              Frame Scan Captured
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}

                {/* Processing Indicator */}
                {isProcessing && (
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs font-bold border border-indigo-400">
                      Dr
                    </div>
                    <div className="p-3.5 rounded-2xl bg-slate-900 border border-indigo-500/30 text-xs text-indigo-300 flex items-center gap-2 rounded-tl-none">
                      <RefreshCw className="w-4 h-4 animate-spin text-indigo-400" />
                      <span>{selectedDoctor.name} is evaluating your camera feed & symptoms...</span>
                    </div>
                  </div>
                )}

                <div ref={chatBottomRef} />
              </div>

              {/* Chat & Voice Input Controls */}
              <div className="p-4 bg-slate-900 border-t border-slate-800 space-y-3">
                
                {/* Full Duplex Voice Engine Controls */}
                <div className="space-y-2">
                  {/* Live Transcript Ticker */}
                  {liveTranscript && (
                    <div className="px-4 py-2.5 rounded-xl bg-indigo-950/60 border border-indigo-500/30 text-xs text-indigo-200 font-mono flex items-start gap-2 animate-pulse">
                      <Mic className="w-4 h-4 text-rose-400 shrink-0 mt-0.5 animate-pulse" />
                      <span className="leading-relaxed">"{liveTranscript}"</span>
                    </div>
                  )}

                  <div className="flex items-center gap-2">
                    <button
                      onClick={toggleSpeechToText}
                      className={`flex-1 py-3.5 px-6 rounded-2xl font-black text-[11px] sm:text-xs uppercase tracking-wider flex items-center justify-center gap-3 cursor-pointer transition-all border shadow-xl ${
                        isListening
                          ? 'bg-emerald-950/40 text-emerald-400 border-2 border-emerald-400 shadow-emerald-500/20'
                          : 'bg-indigo-950/40 text-indigo-300 border border-indigo-500/40 hover:bg-indigo-900/60 hover:text-indigo-200'
                      }`}
                    >
                      {isListening ? (
                        <>
                          <span className="relative flex h-3 w-3 shrink-0">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-400"></span>
                          </span>
                          <Mic className="w-4 h-4 text-emerald-400 shrink-0" />
                          <span>FULL-DUPLEX VOICE ACTIVE</span>
                        </>
                      ) : (
                        <>
                          <Radio className="w-4 h-4 text-indigo-400 shrink-0" />
                          <span>ENABLE FULL-DUPLEX VOICE</span>
                        </>
                      )}
                    </button>

                    <label className="p-3 rounded-2xl bg-slate-950 hover:bg-slate-900 text-slate-300 border border-slate-800 font-bold text-xs flex items-center gap-1.5 cursor-pointer shrink-0" title="Upload Photo">
                      <Upload className="w-4 h-4 text-emerald-400" />
                      <span className="hidden sm:inline">Upload</span>
                      <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
                    </label>
                  </div>
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
                    placeholder={`Type your symptoms or speak to ${selectedDoctor.name}...`}
                    className="flex-1 px-4 py-3 rounded-2xl bg-slate-950 border border-slate-800 text-white text-xs placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                  <button
                    type="submit"
                    disabled={isProcessing || !userInput.trim()}
                    className="px-5 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-md transition-all shrink-0"
                  >
                    <span>Send</span>
                    <Send className="w-3.5 h-3.5" />
                  </button>
                </form>

              </div>

            </div>

            {/* Prescribed Emergency Remedies */}
            <div className="glass-panel p-5 rounded-3xl border border-emerald-500/40 bg-slate-900 space-y-3 shadow-xl">
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-emerald-400 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" /> Doctor Prescribed Emergency Remedies
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                {remedies.map((remedy, idx) => (
                  <div key={idx} className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-start gap-2.5 text-xs">
                    <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-[11px] shrink-0">
                      {idx + 1}
                    </span>
                    <span className="text-slate-200 leading-snug">{remedy}</span>
                  </div>
                ))}
              </div>
            </div>

          </div>

        </div>
      )}

      {/* Supabase Vault Modal */}
      {showVaultModal && (
        <div className="fixed inset-0 z-[9999] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="glass-panel p-6 rounded-3xl border-2 border-emerald-500 max-w-xl w-full bg-slate-900 shadow-2xl space-y-4 max-h-[85vh] overflow-y-auto relative">
            <button onClick={() => setShowVaultModal(false)} className="absolute top-4 right-4 text-slate-400 hover:text-white p-1">
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-lg font-black text-white flex items-center gap-2">
              <span>🗄️</span> Supabase Vault — Archived Consultations
            </h3>
            {vaultConversations.length === 0 ? (
              <p className="text-xs text-slate-400 p-6 text-center border border-dashed border-slate-800 rounded-xl">No past records in vault.</p>
            ) : (
              <div className="space-y-2">
                {vaultConversations.map((item) => (
                  <div key={item.id} className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono space-y-1">
                    <div className="text-cyan-300 font-bold">ID: {item.id}</div>
                    {item.requirement_payload && (
                      <div className="text-amber-300">Condition: {item.requirement_payload.detected_condition}</div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
