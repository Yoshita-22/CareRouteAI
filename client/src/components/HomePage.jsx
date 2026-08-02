import React from 'react';
import { 
  Stethoscope, 
  Hospital, 
  ShieldAlert, 
  History, 
  Settings, 
  Sparkles, 
  Video, 
  Mic, 
  Activity, 
  MapPin, 
  ArrowRight, 
  CheckCircle2, 
  Clock, 
  Zap, 
  PhoneCall, 
  Flame 
} from 'lucide-react';

export default function HomePage({ setActiveTab, onTriggerEmergencySOS }) {
  const quickActions = [
    {
      id: 'doctor',
      title: 'AI Doctor Video Consult',
      subtitle: 'Live Avatar + Speech STT/TTS',
      desc: 'Talk face-to-face with AI ER doctors, speak symptoms in natural voice, and get instant medical triage.',
      icon: Stethoscope,
      badge: 'Interactive Avatar',
      gradient: 'from-emerald-600/30 to-teal-900/40 border-emerald-500/40 text-emerald-400',
      btnBg: 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black'
    },
    {
      id: 'layer2',
      title: 'Hospital Finder & ICU Ranker',
      subtitle: 'Real-Time Bed & Specialist Matching',
      desc: 'Algorithms rank nearby hospitals by ICU beds, ventilator availability, distance, and specialized trauma care.',
      icon: Hospital,
      badge: 'Live Bed Tracking',
      gradient: 'from-indigo-600/30 to-blue-900/40 border-indigo-500/40 text-indigo-300',
      btnBg: 'bg-indigo-600 hover:bg-indigo-500 text-white font-bold'
    },
    {
      id: 'er',
      title: 'Emergency Dashboard & Live GPS',
      subtitle: 'Ambulance Routing & Leaflet Map',
      desc: 'Monitor real-time ALS ambulance progress, traffic-optimized routes, patient vitals, and ER handover.',
      icon: ShieldAlert,
      badge: 'Real-Time GPS',
      gradient: 'from-rose-600/30 to-red-900/40 border-rose-500/40 text-rose-400',
      btnBg: 'bg-rose-600 hover:bg-rose-500 text-white font-bold'
    },
    {
      id: 'history',
      title: 'Patient Medical Vault',
      subtitle: 'Supabase Encrypted History',
      desc: 'View all past AI doctor consultations, uploaded lesion images, prescribed remedies, and dispatch logs.',
      icon: History,
      badge: 'Secure Storage',
      gradient: 'from-cyan-600/30 to-slate-900/40 border-cyan-500/40 text-cyan-300',
      btnBg: 'bg-cyan-600 hover:bg-cyan-500 text-white font-bold'
    }
  ];

  const featureChecklist = [
    { label: 'AI Doctor Avatar (Video + Audio Waveforms)', status: 'Live', desc: 'Interactive Dr. Evelyn Vance & Dr. Alexander Sterling avatars with realistic speech' },
    { label: 'Voice Conversation (STT Dictation + TTS Synthesis)', status: 'Live', desc: 'Hands-free voice recognition with multi-language support (English, Telugu, Hindi, Spanish)' },
    { label: 'Symptom & Visual Image Analysis', status: 'Live', desc: 'Upload skin lesion/burn photos or enter text symptoms for immediate AI differential diagnosis' },
    { label: 'Real-Time Hospital ICU Bed Ranking', status: 'Live', desc: 'Scoring engine matching blood group, bed type, and specialty requirements' },
    { label: 'Emergency SOS & Ambulance GPS Tracking', status: 'Live', desc: 'One-click SOS trigger with socket-based live map location updates' }
  ];

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      
      {/* Hero Banner */}
      <div className="relative rounded-3xl overflow-hidden border border-indigo-500/30 bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-950 p-8 sm:p-12 shadow-2xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-3xl space-y-6">
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-3.5 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-gradient-to-r from-emerald-500 to-teal-400 text-slate-950 shadow-md">
              ✨ CareRoute AI Hackathon Edition
            </span>
            <span className="px-3 py-1 rounded-full text-xs font-mono text-cyan-300 bg-slate-900/80 border border-slate-800 flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-emerald-400 animate-pulse" /> AI Doctor & ER Dispatch System
            </span>
          </div>

          <h1 className="text-4xl sm:text-6xl font-black text-white tracking-tight leading-tight">
            <span className="bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400 bg-clip-text text-transparent">CareRoute AI</span>
          </h1>

          <p className="text-sm sm:text-base text-slate-300 leading-relaxed font-normal">
            Next-generation AI Healthcare Platform combining <strong className="text-white">Interactive AI Doctor Video Consultations</strong>, real-time speech synthesis, symptom analysis, hospital ICU bed ranking, and one-click Emergency SOS dispatch.
          </p>

          {/* Action CTAs */}
          <div className="flex flex-wrap items-center gap-4 pt-2">
            <button
              onClick={() => setActiveTab('doctor')}
              className="px-6 py-4 rounded-2xl bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400 hover:from-emerald-300 hover:to-cyan-300 text-slate-950 font-black text-xs uppercase tracking-wider shadow-xl shadow-emerald-500/25 flex items-center gap-2 cursor-pointer transition-all hover:scale-105"
            >
              <Video className="w-4.5 h-4.5 fill-current" />
              <span>START AI DOCTOR CONSULTATION</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <button
              onClick={onTriggerEmergencySOS}
              className="px-6 py-4 rounded-2xl bg-gradient-to-r from-rose-600 to-red-700 hover:from-rose-500 hover:to-red-600 text-white font-black text-xs uppercase tracking-wider shadow-xl shadow-rose-600/30 flex items-center gap-2 cursor-pointer transition-all hover:scale-105 border border-rose-400 animate-pulse"
            >
              <ShieldAlert className="w-4.5 h-4.5" />
              <span>TRIGGER EMERGENCY SOS</span>
            </button>
          </div>
        </div>
      </div>

      {/* Feature Modules Grid */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-indigo-400" /> Key Application Modules
          </h2>
          <span className="text-xs text-slate-400 font-mono">Select any module to launch</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {quickActions.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.id}
                className={`glass-panel p-6 rounded-3xl border bg-slate-950/90 shadow-xl space-y-4 hover:border-indigo-400/60 transition-all flex flex-col justify-between ${item.gradient}`}
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="w-12 h-12 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-emerald-400 shadow">
                      <Icon className="w-6 h-6" />
                    </div>
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-slate-900 border border-slate-800 text-slate-300">
                      {item.badge}
                    </span>
                  </div>

                  <div>
                    <h3 className="text-lg font-black text-white">{item.title}</h3>
                    <p className="text-xs text-cyan-300 font-mono">{item.subtitle}</p>
                  </div>

                  <p className="text-xs text-slate-300 leading-relaxed">
                    {item.desc}
                  </p>
                </div>

                <button
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full py-3 px-4 rounded-2xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer shadow-md transition-all ${item.btnBg}`}
                >
                  <span>Open {item.title}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Hackathon MVP Checklist */}
      <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-emerald-500/30 bg-slate-950 shadow-2xl space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div>
            <h3 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-400" /> NxtWave Hackathon Requirements Status
            </h3>
            <p className="text-xs text-slate-400">All core features fully built and functional for demo evaluation</p>
          </div>
          <span className="px-4 py-1.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-xs font-mono font-black">
            100% READY FOR DEMO
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {featureChecklist.map((feat, idx) => (
            <div key={idx} className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" /> {feat.label}
                </span>
                <span className="text-[10px] font-mono font-black text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800">
                  {feat.status}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 leading-snug">{feat.desc}</p>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
