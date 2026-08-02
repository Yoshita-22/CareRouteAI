import React, { useState, useEffect, useRef } from 'react';
import { socket } from '../services/socket';
import { rtcConfiguration, defaultMediaConstraints } from '../services/webrtcConfig';
import {
  PhoneCall,
  Video,
  VideoOff,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  PhoneOff,
  PhoneIncoming,
  PhoneOutgoing,
  PhoneMissed,
  ShieldCheck,
  User,
  Clock,
  RefreshCw,
  Trash2,
  Sparkles,
  Maximize2,
  Minimize2,
  CheckCircle2,
  Activity
} from 'lucide-react';

// Preset Users / Contacts for WhatsApp 1-to-1 Calling Demonstration
const PRESET_CONTACTS = [
  {
    id: 'dr_evelyn',
    name: 'Dr. Evelyn Vance, MD',
    role: 'Senior Trauma Specialist',
    avatar: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&w=800&q=80',
    status: 'Online'
  },
  {
    id: 'dr_alexander',
    name: 'Dr. Alexander Sterling, MD',
    role: 'Chief Emergency Physician',
    avatar: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&w=800&q=80',
    status: 'Online'
  },
  {
    id: 'dr_maya',
    name: 'Dr. Maya Patel, MD',
    role: 'Critical Care Lead',
    avatar: 'https://images.unsplash.com/photo-1594824813566-78a9527034e6?auto=format&fit=crop&w=800&q=80',
    status: 'Online'
  },
  {
    id: 'PAT-8092',
    name: 'Rahul Verma (Patient)',
    role: 'Emergency Patient (Cardiac)',
    avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=800&q=80',
    status: 'Online'
  },
  {
    id: 'PAT-3341',
    name: 'Priya Sharma (Patient)',
    role: 'Trauma Patient',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=800&q=80',
    status: 'Online'
  }
];

export default function WhatsAppCallApp() {
  // Current User Identity Profile
  const [currentUser, setCurrentUser] = useState(PRESET_CONTACTS[0]);
  const [activeTab, setActiveTab] = useState('contacts'); // 'contacts' | 'call_screen' | 'history'

  // Call States: 'idle' | 'outgoing_calling' | 'incoming_ringing' | 'connecting' | 'connected' | 'ended'
  const [callState, setCallState] = useState('idle');
  const [callType, setCallType] = useState('video'); // 'video' | 'voice'
  const [activePeer, setActivePeer] = useState(null); // Contact currently in call with
  const [callId, setCallId] = useState(null);

  // Incoming Call State
  const [incomingCallData, setIncomingCallData] = useState(null);

  // Call Controls & Duration
  const [isMicMuted, setIsMicMuted] = useState(false);
  const [isVideoMuted, setIsVideoMuted] = useState(false);
  const [isSpeakerMuted, setIsSpeakerMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [callSeconds, setCallSeconds] = useState(0);

  // Call History Logs
  const [callLogs, setCallLogs] = useState([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);

  // Audio / WebRTC Refs
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const remoteAudioRef = useRef(null);
  const peerConnectionRef = useRef(null);
  const localStreamRef = useRef(null);
  const callTimerRef = useRef(null);
  const pendingIceCandidatesRef = useRef([]);

  // Audio elements for ringtone
  const ringtoneAudioRef = useRef(null);

  // Register socket user on load or when currentUser changes
  useEffect(() => {
    if (socket && currentUser) {
      socket.emit('call:register', currentUser);
    }
  }, [currentUser]);

  // Load Call History Logs from Backend API
  const fetchCallLogs = async () => {
    setIsLoadingLogs(true);
    try {
      const res = await fetch('/api/calls/logs');
      const data = await res.json();
      if (data.status === 'SUCCESS') {
        setCallLogs(data.logs || []);
      }
    } catch (err) {
      console.warn('Error fetching call logs:', err);
    } finally {
      setIsLoadingLogs(false);
    }
  };

  useEffect(() => {
    fetchCallLogs();
  }, []);

  // Timer Effect for Call Duration
  useEffect(() => {
    if (callState === 'connected') {
      callTimerRef.current = setInterval(() => {
        setCallSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      clearInterval(callTimerRef.current);
    }
    return () => clearInterval(callTimerRef.current);
  }, [callState]);

  // Doctor Voice Speech Synthesis Engine
  const speakDoctorVoice = (text) => {
    if (!('speechSynthesis' in window) || isSpeakerMuted) return;
    try {
      window.speechSynthesis.cancel();
      window.speechSynthesis.resume();
    } catch (e) {}
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.volume = 1.0;
    utterance.rate = 0.95;
    window.speechSynthesis.speak(utterance);
  };

  // Socket.IO Signaling Event Listeners
  useEffect(() => {
    if (!socket) return;

    // Incoming Call Listener
    const handleIncomingCall = (data) => {
      console.log('🔔 Incoming WhatsApp Call:', data);
      setIncomingCallData(data);
      setCallState('incoming_ringing');
      setCallType(data.callType || 'video');
      setActivePeer(data.caller);
      setCallId(data.callId);

      // Play ringtone if possible
      playRingtone();
    };

    // Call Accepted by Receiver / AI Doctor
    const handleCallAccepted = async (data) => {
      console.log('✅ Call Accepted:', data);
      stopRingtone();
      setCallState('connected');
      setCallSeconds(0);

      if (peerConnectionRef.current && data.answerSignal) {
        try {
          await peerConnectionRef.current.setRemoteDescription(
            new RTCSessionDescription(data.answerSignal)
          );
          processPendingIceCandidates();
        } catch (err) {
          console.error('Error setting remote description from accept:', err);
        }
      }

      // Doctor speaks out loud upon connection!
      const targetName = data.receiver?.name || activePeer?.name || 'Dr. Evelyn Vance';
      const greetingText = data.greeting || `Hello! I am ${targetName}. I am connected with you live. What medical emergency or symptoms are you experiencing?`;
      setTimeout(() => {
        speakDoctorVoice(greetingText);
      }, 500);
    };

    // Call Rejected by Receiver
    const handleCallRejected = (data) => {
      console.log('🚫 Call Rejected:', data);
      stopRingtone();
      setCallState('ended');
      setTimeout(() => {
        cleanUpCallState();
        fetchCallLogs();
      }, 2000);
    };

    // Call Ringing Notification
    const handleCallRinging = () => {
      setCallState('outgoing_calling');
    };

    // Receiver Unavailable / Offline
    const handleCallUnavailable = (data) => {
      console.log('❌ Call Unavailable:', data.message);
      stopRingtone();
      alert(data.message || 'User is offline.');
      cleanUpCallState();
      fetchCallLogs();
    };

    // WebRTC Offer Relay
    const handleWebRTCOffer = async ({ offer, fromSocketId }) => {
      console.log('📦 Received WebRTC SDP Offer');
      if (peerConnectionRef.current) {
        try {
          await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(offer));
          processPendingIceCandidates();

          const answer = await peerConnectionRef.current.createAnswer();
          await peerConnectionRef.current.setLocalDescription(answer);

          socket.emit('webrtc:answer', {
            callId,
            answer,
            toSocketId: fromSocketId
          });
        } catch (err) {
          console.error('Error handling WebRTC offer:', err);
        }
      }
    };

    // WebRTC Answer Relay
    const handleWebRTCAnswer = async ({ answer }) => {
      console.log('📦 Received WebRTC SDP Answer');
      if (peerConnectionRef.current && peerConnectionRef.current.signalingState !== 'stable') {
        try {
          await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(answer));
          processPendingIceCandidates();
          setCallState('connected');
          setCallSeconds(0);
        } catch (err) {
          console.error('Error setting remote description answer:', err);
        }
      }
    };

    // WebRTC ICE Candidate Relay
    const handleWebRTCIceCandidate = async ({ candidate }) => {
      if (candidate) {
        const iceCandidate = new RTCIceCandidate(candidate);
        if (peerConnectionRef.current && peerConnectionRef.current.remoteDescription) {
          try {
            await peerConnectionRef.current.addIceCandidate(iceCandidate);
          } catch (err) {
            console.warn('Error adding ICE candidate:', err);
          }
        } else {
          pendingIceCandidatesRef.current.push(iceCandidate);
        }
      }
    };

    // Remote Audio/Video Toggle Notification Sync
    const handleRemoteAudioToggled = ({ enabled }) => {
      console.log('🎙️ Remote audio toggled:', enabled);
    };

    const handleRemoteVideoToggled = ({ enabled }) => {
      console.log('📹 Remote video toggled:', enabled);
    };

    // Call Ended Notification
    const handleCallEnded = (data) => {
      console.log('🏁 Call Ended by Peer:', data);
      stopRingtone();
      setCallState('ended');
      setTimeout(() => {
        cleanUpCallState();
        fetchCallLogs();
      }, 1500);
    };

    socket.on('call:incoming', handleIncomingCall);
    socket.on('call:accepted', handleCallAccepted);
    socket.on('call:rejected', handleCallRejected);
    socket.on('call:ringing', handleCallRinging);
    socket.on('call:unavailable', handleCallUnavailable);
    socket.on('webrtc:offer', handleWebRTCOffer);
    socket.on('webrtc:answer', handleWebRTCAnswer);
    socket.on('webrtc:ice-candidate', handleWebRTCIceCandidate);
    socket.on('call:remote-audio-toggled', handleRemoteAudioToggled);
    socket.on('call:remote-video-toggled', handleRemoteVideoToggled);
    socket.on('call:ended', handleCallEnded);

    return () => {
      socket.off('call:incoming', handleIncomingCall);
      socket.off('call:accepted', handleCallAccepted);
      socket.off('call:rejected', handleCallRejected);
      socket.off('call:ringing', handleCallRinging);
      socket.off('call:unavailable', handleCallUnavailable);
      socket.off('webrtc:offer', handleWebRTCOffer);
      socket.off('webrtc:answer', handleWebRTCAnswer);
      socket.off('webrtc:ice-candidate', handleWebRTCIceCandidate);
      socket.off('call:remote-audio-toggled', handleRemoteAudioToggled);
      socket.off('call:remote-video-toggled', handleRemoteVideoToggled);
      socket.off('call:ended', handleCallEnded);
    };
  }, [callId]);

  // Process any queued ICE candidates after setting remote description
  const processPendingIceCandidates = async () => {
    while (pendingIceCandidatesRef.current.length > 0) {
      const candidate = pendingIceCandidatesRef.current.shift();
      try {
        await peerConnectionRef.current.addIceCandidate(candidate);
      } catch (err) {
        console.warn('Error processing queued ICE candidate:', err);
      }
    }
  };

  // Play / Stop Synthesized Ringtone
  const playRingtone = () => {
    try {
      if ('speechSynthesis' in window) {
        const u = new SpeechSynthesisUtterance('Incoming WhatsApp call');
        u.volume = 0.8;
        window.speechSynthesis.speak(u);
      }
    } catch (e) {}
  };

  const stopRingtone = () => {
    try {
      if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    } catch (e) {}
  };

  // Initialize WebRTC Peer Connection
  const createPeerConnection = (targetCallId) => {
    const pc = new RTCPeerConnection(rtcConfiguration);

    // On ICE Candidate generated locally
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit('webrtc:ice-candidate', {
          callId: targetCallId,
          candidate: event.candidate
        });
      }
    };

    // On Track received from remote peer
    pc.ontrack = (event) => {
      console.log('🎥 Remote Media Track Received:', event.streams[0]);
      if (remoteVideoRef.current && event.streams[0]) {
        remoteVideoRef.current.srcObject = event.streams[0];
      }
      if (remoteAudioRef.current && event.streams[0]) {
        remoteAudioRef.current.srcObject = event.streams[0];
      }
    };

    // ICE Connection State Change Monitor
    pc.oniceconnectionstatechange = () => {
      console.log('📶 WebRTC ICE State:', pc.iceConnectionState);
      if (pc.iceConnectionState === 'connected' || pc.iceConnectionState === 'completed') {
        setCallState('connected');
      } else if (pc.iceConnectionState === 'disconnected' || pc.iceConnectionState === 'failed') {
        console.warn('⚠️ WebRTC ICE disconnected, attempting reconnect...');
      }
    };

    peerConnectionRef.current = pc;
    return pc;
  };

  // Get User Media Stream (Microphone & Camera)
  const getUserMediaStream = async (type = callType) => {
    try {
      const constraints = {
        audio: true,
        video: type === 'video'
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      localStreamRef.current = stream;

      if (localVideoRef.current && type === 'video') {
        localVideoRef.current.srcObject = stream;
      }
      return stream;
    } catch (err) {
      console.error('Failed to get media devices:', err);
      // Fallback to audio-only if camera fails or is blocked
      if (type === 'video') {
        try {
          const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
          localStreamRef.current = audioStream;
          return audioStream;
        } catch (e) {}
      }
      return null;
    }
  };

  // Initiate Outgoing Call (Caller Side)
  const startOutgoingCall = async (targetContact, type = 'video') => {
    if (!targetContact) return;

    setCallType(type);
    setActivePeer(targetContact);
    setCallState('outgoing_calling');
    setActiveTab('call_screen');

    const newCallId = `call-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    setCallId(newCallId);

    // Get User Media Stream
    const stream = await getUserMediaStream(type);
    const pc = createPeerConnection(newCallId);

    // Add Local Tracks to PeerConnection
    if (stream) {
      stream.getTracks().forEach((track) => pc.addTrack(track, stream));
    }

    // Create SDP Offer
    try {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      // Emit Initiate Event over Socket.IO Signaling Server
      socket.emit('call:initiate', {
        callId: newCallId,
        caller: currentUser,
        receiver: targetContact,
        callType: type,
        offer
      });

      // Send SDP offer relay
      socket.emit('webrtc:offer', {
        callId: newCallId,
        offer
      });
    } catch (err) {
      console.error('Error creating SDP Offer:', err);
      alert('Could not start call. Media permission required.');
      cleanUpCallState();
    }
  };

  // Accept Incoming Call (Receiver Side)
  const acceptIncomingCall = async () => {
    if (!incomingCallData) return;

    stopRingtone();
    setCallState('connecting');
    setActiveTab('call_screen');

    const stream = await getUserMediaStream(incomingCallData.callType || 'video');
    const pc = createPeerConnection(incomingCallData.callId);

    if (stream) {
      stream.getTracks().forEach((track) => pc.addTrack(track, stream));
    }

    // Notify caller that receiver accepted
    socket.emit('call:accept', {
      callId: incomingCallData.callId,
      answerSignal: null
    });

    setIncomingCallData(null);
  };

  // Reject Incoming Call (Receiver Side)
  const rejectIncomingCall = () => {
    stopRingtone();
    if (incomingCallData) {
      socket.emit('call:reject', {
        callId: incomingCallData.callId,
        reason: 'declined'
      });
    }
    setIncomingCallData(null);
    cleanUpCallState();
  };

  // Toggle Mute / Unmute Microphone
  const toggleMuteMic = () => {
    if (localStreamRef.current) {
      const audioTracks = localStreamRef.current.getAudioTracks();
      if (audioTracks.length > 0) {
        const newMuted = !isMicMuted;
        audioTracks[0].enabled = !newMuted;
        setIsMicMuted(newMuted);

        if (callId) {
          socket.emit('call:toggle-audio', { callId, enabled: !newMuted });
        }
      }
    }
  };

  // Toggle Camera On / Off
  const toggleCamera = () => {
    if (localStreamRef.current) {
      const videoTracks = localStreamRef.current.getVideoTracks();
      if (videoTracks.length > 0) {
        const newVideoMuted = !isVideoMuted;
        videoTracks[0].enabled = !newVideoMuted;
        setIsVideoMuted(newVideoMuted);

        if (callId) {
          socket.emit('call:toggle-video', { callId, enabled: !newVideoMuted });
        }
      }
    }
  };

  // Toggle Speaker Output
  const toggleSpeaker = () => {
    setIsSpeakerMuted(!isSpeakerMuted);
    if (remoteVideoRef.current) {
      remoteVideoRef.current.muted = !isSpeakerMuted;
    }
    if (remoteAudioRef.current) {
      remoteAudioRef.current.muted = !isSpeakerMuted;
    }
  };

  // End Active Call
  const handleEndCall = () => {
    if (callId) {
      socket.emit('call:end', {
        callId,
        durationSeconds: callSeconds
      });
    }
    cleanUpCallState();
    fetchCallLogs();
  };

  // Clean Up Call State & Release WebRTC Media Stream
  const cleanUpCallState = () => {
    stopRingtone();

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop());
      localStreamRef.current = null;
    }

    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }

    pendingIceCandidatesRef.current = [];
    setCallState('idle');
    setActivePeer(null);
    setCallId(null);
    setIncomingCallData(null);
    setCallSeconds(0);
    setIsMicMuted(false);
    setIsVideoMuted(false);
    setIsSpeakerMuted(false);
  };

  // Format Duration MM:SS
  const formatTime = (totalSec) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      
      {/* Hidden Audio Element for Remote Audio Streaming */}
      <audio ref={remoteAudioRef} autoPlay />

      {/* INCOMING CALL SCREEN OVERLAY (WhatsApp Style) */}
      {callState === 'incoming_ringing' && incomingCallData && (
        <div className="fixed inset-0 z-[9999] bg-slate-950/95 backdrop-blur-xl flex flex-col items-center justify-between p-8 animate-fadeIn">
          
          <div className="pt-12 text-center space-y-3">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-xs font-mono font-bold animate-pulse">
              <PhoneIncoming className="w-4 h-4 text-emerald-400" />
              <span>INCOMING WHATSAPP {incomingCallData.callType === 'video' ? 'VIDEO' : 'VOICE'} CALL</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-black text-white">{incomingCallData.caller?.name}</h2>
            <p className="text-sm text-cyan-300 font-mono">CareRoute AI WebRTC Encrypted Stream</p>
          </div>

          {/* Caller Avatar with Pulse Animation */}
          <div className="relative">
            <div className="w-40 h-40 sm:w-48 sm:h-48 rounded-full overflow-hidden border-4 border-emerald-400 shadow-2xl shadow-emerald-500/50">
              <img
                src={incomingCallData.caller?.avatar || 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&w=800&q=80'}
                alt={incomingCallData.caller?.name}
                className="w-full h-full object-cover"
              />
            </div>
            <div className="absolute inset-0 border-4 border-emerald-400 rounded-full animate-ping pointer-events-none opacity-40" />
          </div>

          {/* Accept / Reject Action Buttons */}
          <div className="pb-16 flex items-center justify-center gap-12 sm:gap-20">
            {/* Reject Call (Red Button) */}
            <button
              onClick={rejectIncomingCall}
              className="flex flex-col items-center gap-2 group cursor-pointer"
            >
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gradient-to-r from-rose-600 to-red-700 text-white flex items-center justify-center shadow-2xl shadow-rose-600/50 group-hover:scale-110 transition-all border-2 border-rose-400">
                <PhoneOff className="w-8 h-8 fill-current" />
              </div>
              <span className="text-xs font-black text-rose-400 tracking-wider uppercase">Decline</span>
            </button>

            {/* Accept Call (Green Button) */}
            <button
              onClick={acceptIncomingCall}
              className="flex flex-col items-center gap-2 group cursor-pointer"
            >
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gradient-to-r from-emerald-500 to-teal-400 text-slate-950 flex items-center justify-center shadow-2xl shadow-emerald-500/50 group-hover:scale-110 transition-all border-2 border-emerald-300 animate-bounce">
                <PhoneCall className="w-8 h-8 fill-current" />
              </div>
              <span className="text-xs font-black text-emerald-400 tracking-wider uppercase">Accept</span>
            </button>
          </div>

        </div>
      )}

      {/* MAIN CONTAINER */}
      <div className="glass-panel p-6 rounded-3xl border border-indigo-500/40 bg-gradient-to-r from-slate-900 via-indigo-950/30 to-slate-900 shadow-2xl space-y-6">
        
        {/* TOP BAR: IDENTITY & TAB SWITCHER */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-800">
          
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-3 py-1 rounded-full flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-cyan-400" /> WhatsApp P2P WebRTC Voice & Video Engine
              </span>
              <span className="text-xs text-slate-400 font-mono flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> DTLS-SRTP E2E Encrypted
              </span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-2">
              Real-Time Voice & Video Call Studio
            </h2>
            <p className="text-xs text-slate-300">
              One-to-One WhatsApp-style video/audio streaming powered by WebRTC P2P mesh & Socket.IO signaling server.
            </p>
          </div>

          {/* User Profile Selector & Tab Switcher */}
          <div className="flex flex-wrap items-center gap-3">
            
            {/* Logged-In User Selector */}
            <div className="flex items-center gap-2 bg-slate-950 p-2 rounded-2xl border border-slate-800 text-xs">
              <span className="text-slate-400 font-bold ml-1">You are:</span>
              <select
                value={currentUser.id}
                onChange={(e) => {
                  const selected = PRESET_CONTACTS.find(c => c.id === e.target.value);
                  if (selected) setCurrentUser(selected);
                }}
                className="bg-slate-900 text-cyan-300 font-bold px-3 py-1 rounded-xl border border-slate-700 focus:outline-none cursor-pointer"
              >
                {PRESET_CONTACTS.map((contact) => (
                  <option key={contact.id} value={contact.id}>
                    {contact.name} ({contact.role})
                  </option>
                ))}
              </select>
            </div>

            {/* Navigation Tabs */}
            <div className="flex items-center bg-slate-950 p-1 rounded-2xl border border-slate-800 text-xs">
              <button
                onClick={() => setActiveTab('contacts')}
                className={`px-4 py-2 rounded-xl font-extrabold transition-all cursor-pointer ${
                  activeTab === 'contacts'
                    ? 'bg-gradient-to-r from-indigo-600 to-cyan-600 text-white shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Contacts List
              </button>
              <button
                onClick={() => setActiveTab('call_screen')}
                className={`px-4 py-2 rounded-xl font-extrabold transition-all cursor-pointer ${
                  activeTab === 'call_screen'
                    ? 'bg-gradient-to-r from-indigo-600 to-cyan-600 text-white shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Call Screen {callState !== 'idle' && <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block ml-1 animate-ping" />}
              </button>
              <button
                onClick={() => {
                  setActiveTab('history');
                  fetchCallLogs();
                }}
                className={`px-4 py-2 rounded-xl font-extrabold transition-all cursor-pointer ${
                  activeTab === 'history'
                    ? 'bg-gradient-to-r from-indigo-600 to-cyan-600 text-white shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Call History
              </button>
            </div>

          </div>

        </div>

        {/* TAB 1: CONTACTS LIST (Start 1-to-1 Voice / Video Call) */}
        {activeTab === 'contacts' && (
          <div className="space-y-4 animate-fadeIn">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-extrabold uppercase tracking-wider text-cyan-300 flex items-center gap-2">
                <User className="w-4 h-4 text-emerald-400" /> Select Contact to Call
              </h3>
              <span className="text-xs font-mono text-slate-400">Available P2P Endpoints</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {PRESET_CONTACTS.filter(c => c.id !== currentUser.id).map((contact) => (
                <div
                  key={contact.id}
                  className="glass-panel p-5 rounded-2xl border border-slate-800 bg-slate-950 hover:border-indigo-500/50 transition-all space-y-4 flex flex-col justify-between group shadow-lg"
                >
                  <div className="flex items-center gap-3.5">
                    <div className="relative w-14 h-14 rounded-full overflow-hidden border-2 border-indigo-500/50 shrink-0">
                      <img src={contact.avatar} alt={contact.name} className="w-full h-full object-cover" />
                      <span className="absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full bg-emerald-400 border-2 border-slate-950" />
                    </div>
                    <div>
                      <h4 className="font-extrabold text-white text-base group-hover:text-cyan-300 transition-all">{contact.name}</h4>
                      <p className="text-xs text-slate-400 font-medium">{contact.role}</p>
                      <span className="text-[10px] font-mono text-emerald-400 flex items-center gap-1 mt-0.5">
                        <Activity className="w-3 h-3 text-emerald-400 animate-pulse" /> {contact.status}
                      </span>
                    </div>
                  </div>

                  {/* Action Buttons: Voice Call vs Video Call */}
                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-900">
                    <button
                      onClick={() => startOutgoingCall(contact, 'voice')}
                      className="py-2.5 px-3 rounded-xl bg-slate-900 hover:bg-emerald-950/50 text-emerald-400 border border-slate-800 hover:border-emerald-500/50 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-all"
                    >
                      <PhoneCall className="w-4 h-4 text-emerald-400" />
                      <span>Voice Call</span>
                    </button>

                    <button
                      onClick={() => startOutgoingCall(contact, 'video')}
                      className="py-2.5 px-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 text-xs font-black flex items-center justify-center gap-1.5 cursor-pointer transition-all shadow-md"
                    >
                      <Video className="w-4 h-4 fill-current" />
                      <span>Video Call</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 2: ACTIVE CALL SCREEN (WhatsApp Studio Call Console) */}
        {activeTab === 'call_screen' && (
          <div className="space-y-4 animate-fadeIn">
            
            {callState === 'idle' ? (
              <div className="glass-panel p-12 rounded-3xl border-2 border-dashed border-slate-800 bg-slate-950 text-center space-y-4 flex flex-col items-center justify-center min-h-[420px]">
                <div className="w-20 h-20 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-500">
                  <PhoneCall className="w-10 h-10 text-cyan-400" />
                </div>
                <div className="space-y-1 max-w-md">
                  <h3 className="text-xl font-black text-white">No Active WhatsApp Call</h3>
                  <p className="text-xs text-slate-400">
                    Select a contact from the list above to start a 1-to-1 WebRTC Voice or Video call.
                  </p>
                </div>
                <button
                  onClick={() => setActiveTab('contacts')}
                  className="px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-wider text-slate-950 bg-gradient-to-r from-cyan-400 to-emerald-300 hover:from-cyan-300 hover:to-emerald-200 cursor-pointer shadow-lg"
                >
                  Go to Contacts List
                </button>
              </div>
            ) : (
              
              /* ACTIVE / OUTGOING / CONNECTING CALL CONSOLE */
              <div className="relative w-full rounded-3xl overflow-hidden border-2 border-indigo-500/50 bg-slate-950 shadow-2xl min-h-[520px] flex flex-col justify-between p-4 sm:p-6 group">
                
                {/* REMOTE VIDEO DISPLAY (FULL FRAME) */}
                <div className="absolute inset-0 bg-slate-950">
                  {callState === 'connected' ? (
                    <video
                      ref={remoteVideoRef}
                      autoPlay
                      playsInline
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center p-8 text-center space-y-4">
                      <div className="relative">
                        <div className="w-32 h-32 sm:w-40 sm:h-40 rounded-full overflow-hidden border-4 border-cyan-400 shadow-2xl shadow-cyan-500/40">
                          <img
                            src={activePeer?.avatar || 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&w=800&q=80'}
                            alt={activePeer?.name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="absolute inset-0 border-4 border-cyan-400 rounded-full animate-ping pointer-events-none opacity-50" />
                      </div>
                      <div className="space-y-1">
                        <h3 className="text-2xl sm:text-3xl font-black text-white">{activePeer?.name}</h3>
                        <p className="text-xs text-cyan-300 font-mono uppercase tracking-wider animate-pulse">
                          {callState === 'outgoing_calling' ? 'Calling...' : callState === 'connecting' ? 'Connecting WebRTC P2P...' : 'Call Ended'}
                        </p>
                      </div>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-transparent to-slate-950/80 pointer-events-none" />
                </div>

                {/* LOCAL SELF-VIEW PiP (FLOATING CARD) */}
                {callType === 'video' && (
                  <div className="absolute top-6 right-6 w-36 h-48 sm:w-44 sm:h-60 rounded-2xl overflow-hidden border-2 border-emerald-400 shadow-2xl bg-slate-900 z-30 group-hover:scale-105 transition-all">
                    {isVideoMuted ? (
                      <div className="w-full h-full flex flex-col items-center justify-center text-slate-500 gap-1 bg-slate-950">
                        <VideoOff className="w-6 h-6 text-rose-500" />
                        <span className="text-[10px] font-bold text-slate-400">Cam Off</span>
                      </div>
                    ) : (
                      <video
                        ref={localVideoRef}
                        autoPlay
                        playsInline
                        muted
                        className="w-full h-full object-cover"
                      />
                    )}
                    <div className="absolute bottom-1.5 left-1.5 bg-slate-950/80 px-2 py-0.5 rounded text-[9px] font-mono text-emerald-400 border border-slate-800">
                      You ({currentUser.name.split(' ')[0]})
                    </div>
                  </div>
                )}

                {/* TOP OVERLAY STATUS BAR */}
                <div className="relative z-20 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-slate-900/90 backdrop-blur-md border border-slate-800 flex items-center justify-center text-cyan-400">
                      {callType === 'video' ? <Video className="w-5 h-5" /> : <PhoneCall className="w-5 h-5 text-emerald-400" />}
                    </div>
                    <div>
                      <h4 className="font-extrabold text-white text-lg">{activePeer?.name}</h4>
                      <div className="flex items-center gap-2 text-xs font-mono">
                        <span className={`w-2 h-2 rounded-full ${callState === 'connected' ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400 animate-ping'}`} />
                        <span className="text-slate-300 uppercase font-bold tracking-wider">
                          {callState === 'connected' ? 'Connected' : callState}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Call Duration Timer Badge */}
                  <div className="flex items-center gap-2 bg-slate-950/80 backdrop-blur-md px-4 py-2 rounded-2xl border border-slate-800 text-xs font-mono text-cyan-300">
                    <Clock className="w-4 h-4 text-emerald-400" />
                    <span className="font-black text-sm">{formatTime(callSeconds)}</span>
                  </div>
                </div>

                {/* FLOATING ACTION BAR CONTROLS (WhatsApp Style) */}
                <div className="relative z-20 pt-6 pb-2 flex items-center justify-center gap-4 sm:gap-6 flex-wrap">
                  
                  {/* Mute Mic Button */}
                  <button
                    onClick={toggleMuteMic}
                    className={`w-12 h-12 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center font-bold transition-all cursor-pointer shadow-xl border ${
                      isMicMuted
                        ? 'bg-rose-600 text-white border-rose-400'
                        : 'bg-slate-900/90 text-emerald-400 border-slate-800 hover:bg-slate-800'
                    }`}
                    title={isMicMuted ? 'Unmute Mic' : 'Mute Mic'}
                  >
                    {isMicMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
                  </button>

                  {/* Camera Toggle Button */}
                  {callType === 'video' && (
                    <button
                      onClick={toggleCamera}
                      className={`w-12 h-12 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center font-bold transition-all cursor-pointer shadow-xl border ${
                        isVideoMuted
                          ? 'bg-rose-600 text-white border-rose-400'
                          : 'bg-slate-900/90 text-cyan-400 border-slate-800 hover:bg-slate-800'
                      }`}
                      title={isVideoMuted ? 'Turn Camera On' : 'Turn Camera Off'}
                    >
                      {isVideoMuted ? <VideoOff className="w-6 h-6" /> : <Video className="w-6 h-6" />}
                    </button>
                  )}

                  {/* Speaker Toggle Button */}
                  <button
                    onClick={toggleSpeaker}
                    className={`w-12 h-12 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center font-bold transition-all cursor-pointer shadow-xl border ${
                      isSpeakerMuted
                        ? 'bg-rose-600 text-white border-rose-400'
                        : 'bg-slate-900/90 text-slate-300 border-slate-800 hover:bg-slate-800'
                    }`}
                    title={isSpeakerMuted ? 'Unmute Speaker' : 'Mute Speaker'}
                  >
                    {isSpeakerMuted ? <VolumeX className="w-6 h-6" /> : <Volume2 className="w-6 h-6 text-emerald-400" />}
                  </button>

                  {/* END CALL BUTTON (Red Circle) */}
                  <button
                    onClick={handleEndCall}
                    className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-gradient-to-r from-rose-600 to-red-700 hover:from-rose-500 hover:to-red-600 text-white flex items-center justify-center shadow-2xl shadow-rose-600/50 cursor-pointer border-2 border-rose-400 transition-all hover:scale-110"
                    title="End Call"
                  >
                    <PhoneOff className="w-7 h-7 fill-current" />
                  </button>

                </div>

              </div>
            )}

          </div>
        )}

        {/* TAB 3: CALL HISTORY LOGS (MongoDB Persisted) */}
        {activeTab === 'history' && (
          <div className="space-y-4 animate-fadeIn">
            
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-extrabold uppercase tracking-wider text-emerald-400 flex items-center gap-2">
                <Clock className="w-4 h-4 text-emerald-400" /> WhatsApp Call History Logs
              </h3>
              <button
                onClick={fetchCallLogs}
                className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 text-cyan-400 ${isLoadingLogs ? 'animate-spin' : ''}`} />
                <span>Refresh History</span>
              </button>
            </div>

            {callLogs.length === 0 ? (
              <div className="glass-panel p-8 rounded-2xl border border-slate-800 text-center text-xs text-slate-400">
                No past call records found. Start a call from the contacts list.
              </div>
            ) : (
              <div className="space-y-2.5">
                {callLogs.map((log, index) => {
                  const isCaller = log.callerId === currentUser.id;
                  const peerName = isCaller ? log.receiverName : log.callerName;
                  const peerAvatar = isCaller ? log.receiverAvatar : log.callerAvatar;
                  const isMissed = log.status === 'missed' || log.status === 'rejected';

                  return (
                    <div
                      key={log.callId || index}
                      className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between gap-4 text-xs font-mono hover:border-indigo-500/40 transition-all"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full overflow-hidden border border-slate-700 shrink-0">
                          <img src={peerAvatar || 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&w=800&q=80'} alt={peerName} className="w-full h-full object-cover" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-extrabold text-white text-sm">{peerName}</span>
                            {isMissed ? (
                              <PhoneMissed className="w-4 h-4 text-rose-500" />
                            ) : isCaller ? (
                              <PhoneOutgoing className="w-4 h-4 text-emerald-400" />
                            ) : (
                              <PhoneIncoming className="w-4 h-4 text-cyan-400" />
                            )}
                          </div>
                          <p className="text-[11px] text-slate-400 font-sans mt-0.5">
                            {log.callType === 'video' ? '📹 Video Call' : '📞 Voice Call'} • Status: <span className={isMissed ? 'text-rose-400 font-bold' : 'text-emerald-400 font-bold'}>{log.status}</span>
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        <div className="text-right text-[11px] text-slate-400">
                          <div className="text-slate-200 font-bold">{formatTime(log.durationSeconds || 0)}</div>
                          <div>{new Date(log.startedAt || log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                        </div>

                        {/* Redial Button */}
                        <button
                          onClick={() => {
                            const target = PRESET_CONTACTS.find(c => c.id === (isCaller ? log.receiverId : log.callerId)) || { id: isCaller ? log.receiverId : log.callerId, name: peerName, avatar: peerAvatar };
                            startOutgoingCall(target, log.callType || 'video');
                          }}
                          className="p-2.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/40 cursor-pointer transition-all"
                          title="Redial Call"
                        >
                          <PhoneCall className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

          </div>
        )}

      </div>

    </div>
  );
}
